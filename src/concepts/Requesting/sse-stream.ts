import { streamSSE } from "jsr:@hono/hono/streaming";
import { ID } from "@utils/types.ts";

// SSE Configuration Constants
const SSE_INITIAL_BACKLOG_HOURS = 1;
const SSE_CHECK_INTERVAL_MS = 5000; // 5 seconds
const SSE_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const SSE_MONITOR_INTERVAL_MS = 1000; // 1 second
const SSE_BACKLOG_LIMIT = 50;
const SSE_POLLING_LIMIT = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Type definitions for concept instances (using any for now, can be improved later)
// deno-lint-ignore no-explicit-any
type ConceptInstance = any;

interface ConceptInstances {
  UserAuthentication: ConceptInstance;
  NudgeEngine: ConceptInstance;
  TaskManager: ConceptInstance;
  EmotionLogger: ConceptInstance;
  MicroBet: ConceptInstance;
}

interface SSEStream {
  writeSSE: (data: { data: string }) => Promise<void>;
}

interface NudgeDoc {
  _id: string;
  task: string;
  deliveryTime: Date;
  triggeredAt: Date | null;
  message?: string;
}

interface BetDoc {
  _id: string;
  task: string;
  wager: number;
  deadline: Date;
  success?: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

interface HonoContext {
  req: {
    query: (key: string) => string | undefined;
    header: (name: string) => string | undefined;
  };
  json: (data: unknown, status?: number) => Response;
}

/**
 * Creates a unified Server-Sent Events (SSE) stream handler.
 * Provides real-time notifications for multiple event types:
 * - Nudge notifications (when nudges become ready)
 * - Bet events (when bets are resolved or expire)
 * 
 * @param concepts The concept instances required for SSE functionality
 * @returns A Hono handler function for the SSE stream
 */
export function createUnifiedEventStream(
  concepts: ConceptInstances,
): (c: HonoContext) => Promise<Response> {
  const { UserAuthentication, NudgeEngine, TaskManager, EmotionLogger, MicroBet } =
    concepts;

  return async (c: HonoContext) => {
    // Get access token from query parameter or Authorization header
    const accessToken =
      c.req.query("accessToken") ||
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.header("authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return c.json(
        {
          error:
            "Authentication required. Provide accessToken in query or Authorization header.",
        },
        401,
      );
    }

    if (
      !UserAuthentication ||
      !NudgeEngine ||
      !TaskManager ||
      !EmotionLogger ||
      !MicroBet
    ) {
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
    return streamSSE(c as any, async (stream: SSEStream) => {
      await handleSSEStream(
        stream,
        userId,
        accessToken,
        { UserAuthentication, NudgeEngine, TaskManager, EmotionLogger, MicroBet },
      );
    });
  };
}

/**
 * Handles the SSE stream lifecycle for a connected user.
 */
async function handleSSEStream(
  stream: SSEStream,
  userId: string,
  accessToken: string,
  concepts: ConceptInstances,
): Promise<void> {
  const { UserAuthentication, NudgeEngine, TaskManager, EmotionLogger, MicroBet } =
    concepts;

  let isCleanedUp = false;
  let checkInterval: number | undefined;
  let heartbeatInterval: number | undefined;

  // Get user's last seen timestamps from UserAuthentication
  let lastSeenNudgeTimestamp =
    await UserAuthentication.getLastSeenNudgeTimestamp({ user: userId });
  // If no lastSeen, initialize to configured hours ago to catch recent nudges
  if (!lastSeenNudgeTimestamp) {
    lastSeenNudgeTimestamp = new Date(
      Date.now() - SSE_INITIAL_BACKLOG_HOURS * ONE_HOUR_MS,
    );
  }

  let lastSeenBetTimestamp =
    await UserAuthentication.getLastSeenBetTimestamp({ user: userId });
  // If no lastSeen, initialize to configured hours ago to catch recent bet events
  if (!lastSeenBetTimestamp) {
    lastSeenBetTimestamp = new Date(
      Date.now() - SSE_INITIAL_BACKLOG_HOURS * ONE_HOUR_MS,
    );
  }

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (checkInterval) clearInterval(checkInterval);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  };

  // Helper function to safely write to stream and detect disconnection
  const safeWriteSSE = async (
    data: Parameters<typeof stream.writeSSE>[0],
  ): Promise<boolean> => {
    try {
      await stream.writeSSE(data);
      return true;
    } catch (error) {
      // Client disconnected
      cleanup();
      return false;
    }
  };

  // Helper function to update last seen timestamp
  async function updateLastSeenTimestamp(
    type: "nudge" | "bet",
    timestamp: Date,
    currentTimestamp: Date,
  ): Promise<Date> {
    if (timestamp > currentTimestamp) {
      const method =
        type === "nudge"
          ? "updateLastSeenNudgeTimestamp"
          : "updateLastSeenBetTimestamp";
      await UserAuthentication[method]({ user: userId, timestamp });
      return timestamp;
    }
    return currentTimestamp;
  }

  // Helper function to trigger and send a nudge
  const triggerAndSendNudge = async (nudge: {
    _id: string;
    task: string;
    deliveryTime: Date;
  }): Promise<boolean> => {
    if (isCleanedUp) return false;

    try {
      // Get task details needed to trigger the nudge
      const taskResult = await TaskManager.getTask({
        user: userId,
        task: nudge.task,
      });
      if ("error" in taskResult) {
        console.error(
          `[SSE] Failed to get task ${nudge.task} for nudge ${nudge._id}:`,
          taskResult.error,
        );
        return false;
      }

      // Get recent emotions
      const emotionsResult = await EmotionLogger.analyzeRecentEmotions({
        user: userId,
      });
      const recentEmotions =
        "emotions" in emotionsResult ? emotionsResult.emotions : [];

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
        console.error(
          `[SSE] Failed to trigger nudge ${nudge._id}:`,
          nudgeResult.error,
        );
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
        lastSeenNudgeTimestamp = await updateLastSeenTimestamp(
          "nudge",
          nudge.deliveryTime,
          lastSeenNudgeTimestamp,
        );

        console.log(`[SSE] Triggered and sent nudge ${nudge._id} to user ${userId}`);
      }

      return success;
    } catch (error) {
      console.error(`[SSE] Error triggering nudge ${nudge._id}:`, error);
      return false;
    }
  };

  // Helper function to resolve and send expired bet event
  const resolveAndSendExpiredBet = async (bet: {
    _id: string;
    task: string;
    deadline: Date;
  }): Promise<boolean> => {
    if (isCleanedUp) return false;

    try {
      // Resolve the expired bet
      const resolveResult = await MicroBet.resolveExpiredBet({
        user: userId,
        task: bet.task,
      });

      // Check if bet was already resolved (race condition)
      if (
        "status" in resolveResult &&
        resolveResult.status === "already_resolved"
      ) {
        console.log(`[SSE] Bet ${bet._id} already resolved, skipping`);
        return false;
      }

      if ("error" in resolveResult) {
        console.error(
          `[SSE] Failed to resolve expired bet ${bet._id}:`,
          resolveResult.error,
        );
        return false;
      }

      // Get the updated bet to send full details
      const betResult = await MicroBet.getBet({
        user: userId,
        task: bet.task,
      });
      if ("error" in betResult) {
        console.error(
          `[SSE] Failed to get bet ${bet._id} after resolution:`,
          betResult.error,
        );
        return false;
      }

      // Send the expired bet event via SSE
      const success = await safeWriteSSE({
        data: JSON.stringify({
          type: "bet_expired",
          bet: {
            _id: betResult._id,
            task: betResult.task,
            wager: betResult.wager,
            deadline: betResult.deadline,
            success: betResult.success, // false
          },
        }),
      });

      if (success) {
        // Update lastSeenBetTimestamp to bet's resolvedAt (or current time if not available)
        const updateTimestamp = betResult.resolvedAt || new Date();
        lastSeenBetTimestamp = await updateLastSeenTimestamp(
          "bet",
          updateTimestamp,
          lastSeenBetTimestamp,
        );
        console.log(
          `[SSE] Resolved and sent expired bet ${bet._id} to user ${userId}`,
        );
      }

      return success;
    } catch (error) {
      console.error(`[SSE] Error resolving expired bet ${bet._id}:`, error);
      return false;
    }
  };

  // Helper function to send resolved bet event
  const sendResolvedBetEvent = async (
    bet: BetDoc,
  ): Promise<boolean> => {
    if (isCleanedUp) return false;

    try {
      // For successful bets, we might need to get the bet details to include reward info
      // But for now, we'll just send the basic info
      const success = await safeWriteSSE({
        data: JSON.stringify({
          type: "bet_resolved",
          bet: {
            _id: bet._id,
            task: bet.task,
            wager: bet.wager,
            deadline: bet.deadline,
            success: bet.success,
          },
        }),
      });

      if (success) {
        // Update lastSeenBetTimestamp to bet's resolvedAt (or current time if not available)
        const updateTimestamp = bet.resolvedAt || new Date();
        lastSeenBetTimestamp = await updateLastSeenTimestamp(
          "bet",
          updateTimestamp,
          lastSeenBetTimestamp,
        );
        console.log(
          `[SSE] Sent resolved bet ${bet._id} event to user ${userId}`,
        );
      }

      return success;
    } catch (error) {
      console.error(
        `[SSE] Error sending resolved bet event ${bet._id}:`,
        error,
      );
      return false;
    }
  };

  // Send initial connection message
  const connected = await safeWriteSSE({
    data: JSON.stringify({
      type: "connected",
      message: "Unified event stream connected",
    }),
  });
  if (!connected) return;

  // Handle backlog: get ready nudges and bet events since lastSeen
  try {
    // Get ready nudges that need to be triggered
    const readyBacklogResult = await NudgeEngine.getReadyNudgesSince({
      user: userId,
      sinceTimestamp: lastSeenNudgeTimestamp,
    });

    // Get triggered nudges that were sent after lastSeen (already have messages, just need to send)
    const triggeredBacklogResult = await NudgeEngine.getNewTriggeredNudges({
      user: userId,
      afterTimestamp: lastSeenNudgeTimestamp,
      limit: SSE_BACKLOG_LIMIT,
    });

    // Get recently resolved bets
    const resolvedBetsResult = await MicroBet.getRecentlyResolvedBets({
      user: userId,
      afterTimestamp: lastSeenBetTimestamp,
      limit: SSE_BACKLOG_LIMIT,
    });

    // Get expired bets that need to be resolved
    const expiredBetsResult = await MicroBet.getExpiredBets({ user: userId });

    let totalProcessed = 0;

    // First, send already-triggered nudges (they already have messages)
    if (
      "nudges" in triggeredBacklogResult &&
      triggeredBacklogResult.nudges.length > 0
    ) {
      for (const nudge of triggeredBacklogResult.nudges) {
        if (isCleanedUp) return;

        // Only send nudges whose deliveryTime is after lastSeen
        if (nudge.deliveryTime <= lastSeenNudgeTimestamp) {
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
            lastSeenNudgeTimestamp = await updateLastSeenTimestamp(
              "nudge",
              nudge.deliveryTime,
              lastSeenNudgeTimestamp,
            );
            totalProcessed++;
          } else {
            return; // Client disconnected
          }
        }
      }
    }

    // Send recently resolved bets (already resolved, just notify)
    if ("bets" in resolvedBetsResult && resolvedBetsResult.bets.length > 0) {
      for (const bet of resolvedBetsResult.bets) {
        if (isCleanedUp) return;
        // Only send bets resolved after lastSeen
        if (!bet.resolvedAt || bet.resolvedAt <= lastSeenBetTimestamp) {
          continue;
        }
        const success = await sendResolvedBetEvent(bet);
        if (success) {
          // Update lastSeenBetTimestamp to resolvedAt
          lastSeenBetTimestamp = await updateLastSeenTimestamp(
            "bet",
            bet.resolvedAt,
            lastSeenBetTimestamp,
          );
          totalProcessed++;
        } else {
          return; // Client disconnected
        }
      }
    }

    // Then, trigger ready nudges that haven't been triggered yet
    if ("nudges" in readyBacklogResult && readyBacklogResult.nudges.length > 0) {
      console.log(
        `[SSE] Found ${readyBacklogResult.nudges.length} ready nudges in backlog for user ${userId}`,
      );

      // Process nudges in order (oldest first)
      for (const nudge of readyBacklogResult.nudges) {
        if (isCleanedUp) return;
        const success = await triggerAndSendNudge(nudge);
        if (success) {
          totalProcessed++;
        }
      }
    }

    // Resolve expired bets
    if ("bets" in expiredBetsResult && expiredBetsResult.bets.length > 0) {
      console.log(
        `[SSE] Found ${expiredBetsResult.bets.length} expired bets in backlog for user ${userId}`,
      );

      for (const bet of expiredBetsResult.bets) {
        if (isCleanedUp) return;
        const success = await resolveAndSendExpiredBet(bet);
        if (success) {
          totalProcessed++;
        }
      }
    }

    if (totalProcessed > 0) {
      console.log(
        `[SSE] Processed ${totalProcessed} events in backlog for user ${userId}`,
      );
    }
  } catch (error) {
    console.error("[SSE] Error processing backlog events:", error);
    if (isCleanedUp) return;
  }

  // Helper function to verify authentication
  const verifyAuthentication = async (): Promise<boolean> => {
    try {
      const currentUserInfo = await UserAuthentication.getUserInfo({
        accessToken,
      });
      if ("error" in currentUserInfo) {
        // Token is invalid (user logged out), cleanup and stop
        console.log(
          `[SSE] User ${userId} authentication invalid, closing connection`,
        );
        cleanup();
        return false;
      }

      // Also check if user still has an active session (refreshToken exists)
      // This catches logout even if access token is still valid
      const hasSession = await UserAuthentication.hasActiveSession({
        user: userId,
      });
      if (!hasSession) {
        // User logged out (refreshToken was cleared), cleanup and stop
        console.log(`[SSE] User ${userId} logged out, closing connection`);
        cleanup();
        return false;
      }
      return true;
    } catch (error) {
      // Authentication check failed, cleanup and stop
      console.log(
        `[SSE] Authentication check failed for user ${userId}, closing connection`,
      );
      cleanup();
      return false;
    }
  };

  // Set up periodic checking for ready nudges and expired bets
  checkInterval = setInterval(async () => {
    if (isCleanedUp) return;

    // Re-verify authentication before processing events
    // This ensures we stop if the user logged out
    const isAuthenticated = await verifyAuthentication();
    if (!isAuthenticated) return;

    try {
      // Check for ready nudges (not yet triggered)
      const readyNudgesResult = await NudgeEngine.getReadyNudges({
        user: userId,
      });

      if (
        "nudges" in readyNudgesResult &&
        readyNudgesResult.nudges.length > 0
      ) {
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

      // Check for expired bets that need to be resolved
      const expiredBetsResult = await MicroBet.getExpiredBets({
        user: userId,
      });

      if ("bets" in expiredBetsResult && expiredBetsResult.bets.length > 0) {
        // Process each expired bet
        for (const bet of expiredBetsResult.bets) {
          if (isCleanedUp) return;
          const success = await resolveAndSendExpiredBet(bet);
          if (!success) {
            // Connection died during resolution, cleanup already called
            return;
          }
        }
      }

      // Check for newly resolved bets (resolved via task start syncs)
      const recentlyResolvedBetsResult = await MicroBet.getRecentlyResolvedBets(
        {
          user: userId,
          afterTimestamp: lastSeenBetTimestamp,
          limit: SSE_POLLING_LIMIT, // Only check recent ones during polling
        },
      );

      if (
        "bets" in recentlyResolvedBetsResult &&
        recentlyResolvedBetsResult.bets.length > 0
      ) {
        // Send notifications for newly resolved bets
        for (const bet of recentlyResolvedBetsResult.bets) {
          if (isCleanedUp) return;
          // Only send bets resolved after lastSeen
          if (bet.resolvedAt && bet.resolvedAt > lastSeenBetTimestamp) {
            const success = await sendResolvedBetEvent(bet);
            if (!success) {
              // Connection died, cleanup already called
              return;
            }
            // Update lastSeenBetTimestamp to resolvedAt
            lastSeenBetTimestamp = await updateLastSeenTimestamp(
              "bet",
              bet.resolvedAt,
              lastSeenBetTimestamp,
            );
          }
        }
      }
    } catch (error) {
      console.error("[SSE] Error checking for events:", error);
      const success = await safeWriteSSE({
        data: JSON.stringify({
          type: "error",
          message: "Error checking for events",
        }),
      });
      if (!success) {
        // Connection failed, cleanup already called by safeWriteSSE
        return;
      }
    }
  }, SSE_CHECK_INTERVAL_MS);

  // Send heartbeat every 30 seconds to keep connection alive
  heartbeatInterval = setInterval(async () => {
    if (isCleanedUp) return;

    const success = await safeWriteSSE({
      data: JSON.stringify({
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      }),
    });
    if (!success) return; // Client disconnected
  }, SSE_HEARTBEAT_INTERVAL_MS);

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
      }, SSE_MONITOR_INTERVAL_MS);
    });
  } finally {
    cleanup();
  }
}

