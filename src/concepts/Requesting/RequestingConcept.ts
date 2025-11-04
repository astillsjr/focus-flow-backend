import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { streamSSE } from "jsr:@hono/hono/streaming";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { exclusions, inclusions } from "./passthrough.ts";
import "jsr:@std/dotenv/load";

/**
 * # Requesting concept configuration
 * The following environment variables are available:
 *
 * - PORT: the port to the server binds, default 10000
 * - REQUESTING_BASE_URL: the base URL prefix for api requests, default "/api"
 * - REQUESTING_TIMEOUT: the timeout for requests, default 10000ms
 * - REQUESTING_SAVE_RESPONSES: whether to persist responses or not, default true
 */
const PORT = parseInt(Deno.env.get("PORT") ?? "8000", 10);
const REQUESTING_BASE_URL = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const REQUESTING_TIMEOUT = parseInt(
  Deno.env.get("REQUESTING_TIMEOUT") ?? "10000",
  10,
);

// TODO: make sure you configure this environment variable for proper CORS configuration
const REQUESTING_ALLOWED_DOMAIN = Deno.env.get("REQUESTING_ALLOWED_DOMAIN") ??
  "*";

// Choose whether or not to persist responses
const REQUESTING_SAVE_RESPONSES = Deno.env.get("REQUESTING_SAVE_RESPONSES") ??
  true;

const PREFIX = "Requesting" + ".";

// --- Type Definitions ---
type Request = ID;

/**
 * a set of Requests with
 *   an input unknown
 *   an optional response unknown
 */
interface RequestDoc {
  _id: Request;
  input: { path: string; [key: string]: unknown };
  response?: unknown;
  createdAt: Date;
}

/**
 * Represents an in-flight request waiting for a response.
 * This state is not persisted and lives only in memory.
 */
interface PendingRequest {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

/**
 * The Requesting concept encapsulates an API server, modeling incoming
 * requests and outgoing responses as concept actions.
 */
export default class RequestingConcept {
  private readonly requests: Collection<RequestDoc>;
  private readonly pending: Map<Request, PendingRequest> = new Map();
  private readonly timeout: number;

  constructor(private readonly db: Db) {
    this.requests = this.db.collection(PREFIX + "requests");
    this.timeout = REQUESTING_TIMEOUT;
    console.log(
      `\nRequesting concept initialized with a timeout of ${this.timeout}ms.`,
    );
  }

  /**
   * request (path: String, ...): (request: Request)
   * System action triggered by an external HTTP request.
   *
   * **requires** true
   *
   * **effects** creates a new Request `r`; sets the input of `r` to be the path and all other input parameters; returns `r` as `request`
   */
  async request(
    inputs: { path: string; [key: string]: unknown },
  ): Promise<{ request: Request }> {
    const requestId = freshID() as Request;
    const requestDoc: RequestDoc = {
      _id: requestId,
      input: inputs,
      createdAt: new Date(),
    };

    // Persist the request for logging/auditing purposes.
    await this.requests.insertOne(requestDoc);

    // Create an in-memory pending request to manage the async response.
    let resolve!: (value: unknown) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pending.set(requestId, { promise, resolve, reject });

    return { request: requestId };
  }

  /**
   * respond (request: Request, [key: string]: unknown)
   *
   * **requires** a Request with the given `request` id exists and has no response yet
   *
   * **effects** sets the response of the given Request to the provided key-value pairs.
   */
  async respond(
    { request, ...response }: { request: Request; [key: string]: unknown },
  ): Promise<{ request: string }> {
    const pendingRequest = this.pending.get(request);
    if (pendingRequest) {
      // Resolve the promise for any waiting `_awaitResponse` call.
      pendingRequest.resolve(response);
    }

    // Update the persisted request document with the response.
    if (REQUESTING_SAVE_RESPONSES) {
      await this.requests.updateOne({ _id: request }, { $set: { response } });
    }

    return { request };
  }

  /**
   * _awaitResponse (request: Request): (response: unknown)
   *
   * **effects** returns the response associated with the given request, waiting if necessary up to a configured timeout.
   */
  async _awaitResponse(
    { request }: { request: Request },
  ): Promise<{ response: unknown }[]> {
    const pendingRequest = this.pending.get(request);

    if (!pendingRequest) {
      // The request might have been processed already or never existed.
      // We could check the database for a persisted response here if needed.
      throw new Error(
        `Request ${request} is not pending or does not exist: it may have timed-out.`,
      );
    }

    let timeoutId: number;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () =>
          reject(
            new Error(`Request ${request} timed out after ${this.timeout}ms`),
          ),
        this.timeout,
      );
    });

    try {
      // Race the actual response promise against the timeout.
      const response = await Promise.race([
        pendingRequest.promise,
        timeoutPromise,
      ]);
      return [{ response }];
    } finally {
      // Clean up regardless of outcome.
      clearTimeout(timeoutId!);
      this.pending.delete(request);
    }
  }
}

/**
 * Starts the Hono web server that listens for incoming requests and pipes them
 * into the Requesting concept instance. Additionally, it allows passthrough
 * requests to concept actions by default. These should be
 * @param concepts The complete instantiated concepts import from "@concepts"
 */
export function startRequestingServer(
  // deno-lint-ignore no-explicit-any
  concepts: Record<string, any>,
) {
  // deno-lint-ignore no-unused-vars
  const { Requesting, client, db, Engine, ...instances } = concepts;
  if (!(Requesting instanceof RequestingConcept)) {
    throw new Error("Requesting concept missing or broken.");
  }
  const app = new Hono();
  app.use(
    "/*",
    cors({
      origin: REQUESTING_ALLOWED_DOMAIN,
    }),
  );

  /**
   * PASSTHROUGH ROUTES
   *
   * These routes register against every concept action and query.
   * While convenient, you should confirm that they are either intentional
   * inclusions and specify a reason, or if they should be excluded and
   * handled by Requesting instead.
   */

  console.log("\nRegistering concept passthrough routes.");
  let unverified = false;
  for (const [conceptName, concept] of Object.entries(instances)) {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(concept),
    )
      .filter((name) =>
        name !== "constructor" && typeof concept[name] === "function"
      );
    for (const method of methods) {
      const route = `${REQUESTING_BASE_URL}/${conceptName}/${method}`;
      if (exclusions.includes(route)) continue;
      const included = route in inclusions;
      if (!included) unverified = true;
      const msg = included
        ? `  -> ${route}`
        : `WARNING - UNVERIFIED ROUTE: ${route}`;

      app.post(route, async (c) => {
        try {
          const body = await c.req.json().catch(() => ({})); // Handle empty body
          const result = await concept[method](body);
          return c.json(result);
        } catch (e) {
          console.error(`Error in ${conceptName}.${method}:`, e);
          return c.json({ error: "An internal server error occurred." }, 500);
        }
      });
      console.log(msg);
    }
  }
  const passthroughFile = "./src/concepts/Requesting/passthrough.ts";
  if (unverified) {
    console.log(`FIX: Please verify routes in: ${passthroughFile}`);
  }

  /**
   * REQUESTING ROUTES
   *
   * Captures all POST routes under the base URL.
   * The specific action path is extracted from the URL.
   */

  const routePath = `${REQUESTING_BASE_URL}/*`;
  app.post(routePath, async (c) => {
    try {
      const body = await c.req.json();
      if (typeof body !== "object" || body === null) {
        return c.json(
          { error: "Invalid request body. Must be a JSON object." },
          400,
        );
      }

      // Extract the specific action path from the request URL.
      // e.g., if base is /api and request is /api/users/create, path is /users/create
      const actionPath = c.req.path.substring(REQUESTING_BASE_URL.length);

      // Combine the path from the URL with the JSON body to form the action's input.
      const inputs = {
        ...body,
        path: actionPath,
      };

      console.log(`[Requesting] Received request for path: ${inputs.path}`);

      // 1. Trigger the 'request' action.
      const { request } = await Requesting.request(inputs);

      // 2. Await the response via the query. This is where the server waits for
      //    synchronizations to trigger the 'respond' action.
      const responseArray = await Requesting._awaitResponse({ request });

      // 3. Send the response back to the client.
      const { response } = responseArray[0];
      return c.json(response);
    } catch (e) {
      if (e instanceof Error) {
        console.error(`[Requesting] Error processing request:`, e.message);
        if (e.message.includes("timed out")) {
          return c.json({ error: "Request timed out." }, 504); // Gateway Timeout
        }
        return c.json({ error: "An internal server error occurred." }, 500);
      } else {
        return c.json({ error: "unknown error occurred." }, 418);
      }
    }
  });

  /**
   * SERVER-SENT EVENTS (SSE) FOR NUDGE NOTIFICATIONS
   *
   * Provides real-time nudge notifications via SSE.
   * Clients connect to this endpoint and receive nudges as they become ready.
   */
  app.get(`${REQUESTING_BASE_URL}/nudges/stream`, async (c) => {
    // Get access token from query parameter or Authorization header
    const accessToken = c.req.query("accessToken") || 
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.header("authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return c.json({ error: "Authentication required. Provide accessToken in query or Authorization header." }, 401);
    }

    // Authenticate user and get required concepts
    const { UserAuthentication, NudgeEngine, TaskManager, EmotionLogger } = concepts;
    if (!UserAuthentication || !NudgeEngine || !TaskManager || !EmotionLogger) {
      return c.json({ error: "Required concepts not available." }, 500);
    }

    let userInfo;
    try {
      userInfo = await UserAuthentication.getUserInfo({ accessToken });
    } catch (error) {
      return c.json({ error: "Authentication failed." }, 401);
    }

    if ("error" in userInfo) {
      return c.json({ error: userInfo.error }, 401);
    }

    const userId = userInfo.user.id;

    // Set up SSE stream
    return streamSSE(c, async (stream) => {
      let isCleanedUp = false;
      let checkInterval: number | undefined;
      let heartbeatInterval: number | undefined;
      
      // Get user's last seen timestamp from UserAuthentication
      let lastSeenTimestamp = await UserAuthentication.getLastSeenNudgeTimestamp({ user: userId });
      // If no lastSeen, initialize to 1 hour ago to catch recent nudges
      if (!lastSeenTimestamp) {
        lastSeenTimestamp = new Date(Date.now() - 60 * 60 * 1000);
      }
      
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        if (checkInterval) clearInterval(checkInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      };

      // Helper function to safely write to stream and detect disconnection
      const safeWriteSSE = async (data: Parameters<typeof stream.writeSSE>[0]) => {
        try {
          await stream.writeSSE(data);
          return true;
        } catch (error) {
          // Client disconnected
          cleanup();
          return false;
        }
      };

      // Helper function to trigger and send a nudge
      const triggerAndSendNudge = async (nudge: { _id: string; task: string; deliveryTime: Date }) => {
        if (isCleanedUp) return false;

        try {
          // Get task details needed to trigger the nudge
          const taskResult = await TaskManager.getTask({ user: userId, task: nudge.task });
          if ("error" in taskResult) {
            console.error(`[SSE] Failed to get task ${nudge.task} for nudge ${nudge._id}:`, taskResult.error);
            return false;
          }

          // Get recent emotions
          const emotionsResult = await EmotionLogger.analyzeRecentEmotions({ user: userId });
          const recentEmotions = "emotions" in emotionsResult ? emotionsResult.emotions : [];

          // Trigger the nudge to generate message
          const nudgeResult = await NudgeEngine.nudgeUser({
            user: userId,
            task: nudge.task,
            title: taskResult.title,
            description: taskResult.description || "",
            recentEmotions,
          });

          if ("error" in nudgeResult) {
            // If nudge was already triggered (race condition), that's fine
            if (nudgeResult.error?.includes("already been triggered")) {
              console.log(`[SSE] Nudge ${nudge._id} already triggered, skipping`);
              return false;
            }
            console.error(`[SSE] Failed to trigger nudge ${nudge._id}:`, nudgeResult.error);
            return false;
          }

          // Send the nudge via SSE
          const success = await safeWriteSSE({
            data: JSON.stringify({
              type: "nudge",
              nudge: {
                _id: nudgeResult.nudge,
                task: nudge.task,
                deliveryTime: nudge.deliveryTime,
                message: nudgeResult.message,
              },
            }),
          });

          if (success) {
            // Update lastSeen timestamp to the delivery time (always move forward, never backward)
            if (nudge.deliveryTime > lastSeenTimestamp) {
              lastSeenTimestamp = nudge.deliveryTime;
              // Persist the lastSeen timestamp
              await UserAuthentication.updateLastSeenNudgeTimestamp({ 
                user: userId, 
                timestamp: nudge.deliveryTime 
              });
            }

            console.log(`[SSE] Triggered and sent nudge ${nudge._id} to user ${userId}`);
          }

          return success;
        } catch (error) {
          console.error(`[SSE] Error triggering nudge ${nudge._id}:`, error);
          return false;
        }
      };

      // Send initial connection message
      const connected = await safeWriteSSE({ 
        data: JSON.stringify({ type: "connected", message: "Nudge stream connected" }) 
      });
      if (!connected) return;

      // Handle backlog: get ready nudges since lastSeen and trigger them
      // Also send any triggered nudges that were triggered after lastSeen (in case user disconnected before receiving)
      try {
        // Get ready nudges that need to be triggered
        const readyBacklogResult = await NudgeEngine.getReadyNudgesSince({ 
          user: userId, 
          sinceTimestamp: lastSeenTimestamp
        });

        // Get triggered nudges that were sent after lastSeen (already have messages, just need to send)
        const triggeredBacklogResult = await NudgeEngine.getNewTriggeredNudges({ 
          user: userId, 
          afterTimestamp: lastSeenTimestamp,
          limit: 50
        });

        let totalProcessed = 0;

        // First, send already-triggered nudges (they already have messages)
        if ("nudges" in triggeredBacklogResult && triggeredBacklogResult.nudges.length > 0) {
          for (const nudge of triggeredBacklogResult.nudges) {
            if (isCleanedUp) return;
            
            // Only send nudges whose deliveryTime is after lastSeen
            // This prevents resending the last nudge we already sent
            if (nudge.deliveryTime <= lastSeenTimestamp) {
              continue; // Skip this nudge, we already sent it
            }
            
            if (nudge.message && nudge.triggeredAt) {
              const success = await safeWriteSSE({
                data: JSON.stringify({
                  type: "nudge",
                  nudge: {
                    _id: nudge._id,
                    task: nudge.task,
                    deliveryTime: nudge.deliveryTime,
                    message: nudge.message,
                  },
                }),
              });

              if (success) {
                // Update lastSeen if needed
                if (nudge.deliveryTime > lastSeenTimestamp) {
                  lastSeenTimestamp = nudge.deliveryTime;
                  await UserAuthentication.updateLastSeenNudgeTimestamp({ 
                    user: userId, 
                    timestamp: nudge.deliveryTime 
                  });
                }
                totalProcessed++;
              } else {
                return; // Client disconnected
              }
            }
          }
        }

        // Then, trigger ready nudges that haven't been triggered yet
        if ("nudges" in readyBacklogResult && readyBacklogResult.nudges.length > 0) {
          console.log(`[SSE] Found ${readyBacklogResult.nudges.length} ready nudges in backlog for user ${userId}`);
          
          // Process nudges in order (oldest first)
          for (const nudge of readyBacklogResult.nudges) {
            if (isCleanedUp) return;
            const success = await triggerAndSendNudge(nudge);
            if (success) {
              totalProcessed++;
            }
          }
        }

        if (totalProcessed > 0) {
          console.log(`[SSE] Processed ${totalProcessed} nudges in backlog for user ${userId}`);
        }
      } catch (error) {
        console.error("[SSE] Error processing backlog nudges:", error);
        if (isCleanedUp) return;
      }

      // Set up periodic checking for ready nudges
      checkInterval = setInterval(async () => {
        if (isCleanedUp) return;
        
        // Re-verify authentication before processing nudges
        // This ensures we stop if the user logged out
        try {
          const currentUserInfo = await UserAuthentication.getUserInfo({ accessToken });
          if ("error" in currentUserInfo) {
            // Token is invalid (user logged out), cleanup and stop
            console.log(`[SSE] User ${userId} authentication invalid, closing connection`);
            cleanup();
            return;
          }
          
          // Also check if user still has an active session (refreshToken exists)
          // This catches logout even if access token is still valid
          const hasSession = await UserAuthentication.hasActiveSession({ user: userId });
          if (!hasSession) {
            // User logged out (refreshToken was cleared), cleanup and stop
            console.log(`[SSE] User ${userId} logged out, closing connection`);
            cleanup();
            return;
          }
        } catch (error) {
          // Authentication check failed, cleanup and stop
          console.log(`[SSE] Authentication check failed for user ${userId}, closing connection`);
          cleanup();
          return;
        }
        
        try {
          // Get ready nudges (not yet triggered)
          const readyNudgesResult = await NudgeEngine.getReadyNudges({ user: userId });
          
          if ("nudges" in readyNudgesResult && readyNudgesResult.nudges.length > 0) {
            // Process each ready nudge
            for (const nudge of readyNudgesResult.nudges) {
              if (isCleanedUp) return;
              const success = await triggerAndSendNudge(nudge);
              if (!success) {
                // Connection died during trigger, cleanup already called
                return;
              }
            }
          }
        } catch (error) {
          console.error("[SSE] Error checking for ready nudges:", error);
          const success = await safeWriteSSE({
            data: JSON.stringify({ type: "error", message: "Error checking for nudges" }),
          });
          if (!success) {
            // Connection failed, cleanup already called by safeWriteSSE
            return;
          }
        }
      }, 5000); // Check every 5 seconds

      // Send heartbeat every 30 seconds to keep connection alive
      heartbeatInterval = setInterval(async () => {
        if (isCleanedUp) return;
        
        const success = await safeWriteSSE({
          data: JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }),
        });
        if (!success) return; // Client disconnected
      }, 30000);

      // Keep the connection alive - wait until cleanup is called
      try {
        // Keep running until cleanup is called
        await new Promise<void>((resolve) => {
          // Check every second if cleanup was called
          const monitorInterval = setInterval(() => {
            if (isCleanedUp) {
              clearInterval(monitorInterval);
              resolve();
            }
          }, 1000);
        });
      } finally {
        cleanup();
      }
    });
  });

  console.log(
    `\n🚀 Requesting server listening for POST requests at base path of ${routePath}`,
  );
  console.log(
    `📡 SSE nudge stream available at GET ${REQUESTING_BASE_URL}/nudges/stream?accessToken=<token>`,
  );

  Deno.serve({ port: PORT }, app.fetch);
}
