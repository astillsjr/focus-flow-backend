import { Collection, Db, MongoServerError  } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from '@utils/gemini-llm.ts';
import { Emotion } from "@utils/emotions.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the environment");
}

// Collection prefix to avoid name clashes
const PREFIX = "NudgeEngine" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Task = ID;

// Define the types for our entires based on the concept state
type Nudge = ID;

/**
 * a set of Nudges with
 *   a user User
 *   a task Task
 *   a deliveryTime Date
 *   a triggered Boolean
 *   a canceled Boolean 
 */
interface NudgeDoc {
  _id: Nudge;
  user: User;
  task: Task;
  deliveryTime: Date;
  triggered: boolean;
  canceled: boolean;
}

/**
 * @concept NudgeEngine
 * @purpose To generate personalized, context-aware motivational nudges using AI, 
    leveraging task details and user emotion history.
 */
export default class NudgeEngineConcept {
  nudges: Collection<NudgeDoc>;
  llm: GeminiLLM;

  constructor(private readonly db: Db) {
    this.nudges = this.db.collection(PREFIX + "nudges");
    this.llm = new GeminiLLM(GEMINI_API_KEY!);

    this.nudges.createIndex({ user: 1, task: 1 }, { unique: true }).catch((err) => {
      console.error("Failed to create nudges index:", err)
    });
  }

  /**
   * Schedules a new nudge for a task.
   * @requires No existing nudge must exist for the same task. 
   *           The delivery time must be in the future.
   * @effects Creates a new nudge record associated with the task and user.
   */
  public async scheduleNudge(
    { user, task, deliveryTime }: { user: User, task: Task, deliveryTime: Date },
  ): Promise<{ nudge: Nudge } | { error: string }> {
    if (deliveryTime.getTime() < Date.now()) {
      return { error: "Delivery time cannot be in the past" };
    }
    
    const newNudge: NudgeDoc = {
      _id: freshID(),
      user,
      task,
      deliveryTime: new Date(deliveryTime),
      triggered: false,
      canceled: false,
    };

    try {
      await this.nudges.insertOne(newNudge);
      return { nudge: newNudge._id };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        return { error: "Nudge already exists for this task" };
      }
      throw err;
    }
  }

  /**
   * Cancels a scheduled nudge.
   * @requires The nudge must exist and must not already be triggered or canceled.
   * @effects Marks the nudge as canceled, preventing future delivery.
   */
  public async cancelNudge(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const nudgeDoc = await this.nudges.findOne({ user, task });
    if (!nudgeDoc) return { error: "Nudge for this task does not exist" };

    if (nudgeDoc.triggered) return { error: "Nudge has already been triggered" };
    if (nudgeDoc.canceled) return { error: "Nudge has already been canceled" };

    await this.nudges.updateOne(
      { _id: nudgeDoc._id },
      { $set: { canceled: true } }
    );

    return {};
  }

  /**
   * Deletes all nudges associated with a user.
   * @effects Removes every nudge targeted at the specified user.
   */
  public async deleteUserNudges(
    { user }: { user: User},
  ): Promise<Empty> {
    await this.nudges.deleteMany({ user });

    return {};
  }

  /**
   * Sends a motivational nudge to a user.
   * @requires The current time must be later than the nudge's delivery time.
   *           The nudge must not already be triggered or canceled.
   * @effects Generates a motivational message using the AI model and marks the nudge as triggered.
   */
  public async nudgeUser(
    params: { 
      user: User; 
      task: Task; 
      title: string; 
      description: string;
      recentEmotions: Emotion[];
    }
  ): Promise<{ message: string, nudge: Nudge } | { error: string }> {
    const { user, task, title, description, recentEmotions } = params;
    const now = new Date();

    const nudgeDoc = await this.nudges.findOne({
      user,
      task,
      triggered: false,
      canceled: false,
      deliveryTime: { $lte: now },
    });

    if (!nudgeDoc) {
      const failedNudge = await this.nudges.findOne({ user, task });

      if (!failedNudge) return { error: "Nudge does not exist for this task" };
      if (failedNudge.triggered) return { error: "Nudge has already been triggered" };
      if (failedNudge.canceled) return { error: "Nudge has been canceled" };
      if (failedNudge.deliveryTime.getTime() > now.getTime()) return { error: "Nudge delivery time has not arrived yet" };

      return { error: "Unknown error triggering nudge" };
    }
    
    const prompt = this.buildPrompt(title, description, recentEmotions);

    try {
      const response = await this.llm.executeLLM(prompt);
      const generatedMessage = response.trim();

      if (!generatedMessage) {
        console.warn("LLM returned empty message");
        return { error: "Failed to generate motivational message" };
      }

      const error = this.validateMessage(generatedMessage);
      if (error) {
        console.warn("Message failed validation:", {
          message: generatedMessage,
          reason: error,
        });
        return { error: "Generated message did not meet quality criteria" };
      }

      await this.nudges.updateOne(
        { _id: nudgeDoc._id },
        { $set: { triggered: true } }
      );

      return { message: generatedMessage, nudge: nudgeDoc._id };
    } catch (err) {
      console.error("Error generating nudge:", err);
      return { error: "Failed to generate motivational message" };
    }
  }

  /**
   * Retrieves a specific nudge for a given task.
   * @requires A nudge must exist for the specified user and task.
   * @effects Returns the matching nudge document.
   */
  public async getNudge(
    { user, task }: { user: User, task: Task }
  ): Promise<NudgeDoc | { error: string }> {
    const nudgeDoc = await this.nudges.findOne({ user, task });
    if (!nudgeDoc) return { error: "Nudge for this task does not exist" };

    return nudgeDoc;
  }

  /**
   * Retrieves all nudges for a user with optional filtering.
   * @effects Returns the user's nudges filtered by status (pending, triggered, or canceled).
   */
  public async getUserNudges(
    { 
      user, 
      status, 
      limit = 50 
    }: { 
      user: User; 
      status?: "pending" | "triggered" | "canceled";
      limit?: number;
    }
  ): Promise<NudgeDoc[]> {
    const filter: Record<string, unknown> = { user };

    if (status === "pending") {
      filter.triggered = false;
      filter.canceled = false;
    } else if (status === "triggered") {
      filter.triggered = true;
    } else if (status === "canceled") {
      filter.canceled = true;
    }

    return await this.nudges
      .find(filter)
      .sort({ deliveryTime: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Retrieves all ready-to-deliver nudges for a user.
   * @effects Returns nudges whose delivery time has arrived and are not yet triggered or canceled.
   */
  public async getReadyNudges(
    { user }: { user: User }
  ): Promise<NudgeDoc[]> {
    const now = new Date();
    return await this.nudges
      .find({
        user,
        triggered: false,
        canceled: false,
        deliveryTime: { $lte: now }
      })
      .sort({ deliveryTime: 1 })
      .toArray();
  }

  /**
   * Constructs the AI prompt used to generate a motivational nudge message.
   * @effects Returns a formatted prompt containing task context and recent user emotions.
   */
  private buildPrompt(title: string, description: string, emotions: Emotion[]): string {
    return `
    You are Nudgr, a friendly AI coach helping users take action on tasks they’ve been avoiding.

    Your job is to generate a SHORT, motivating message (1–2 sentences, under 200 characters) to help the user get started on a task. Keep it kind, specific, and light — no guilt or pressure.

    Context:
    Task Title: "${title}"
    Task Description: "${description}"
    Recent Emotions: [${emotions.join(", ")}]

    Your message should:
    - Mention the task or emotion if useful.
    - Include an action verb (e.g., start, try, focus, tackle, take a moment).
    - Feel supportive, clear, and natural.
    - Avoid vague advice ("You got this!") or excessive enthusiasm ("You are unstoppable!").

    Examples:
    - “Take a moment to dive into the first part of ‘${title}’. It doesn’t have to be perfect.”
    - “You’ve felt [${emotions[0] ?? "tired"}] — try starting with a small part of this task.”
    - “Focus on just one piece of ‘${title}’. That’s a win.”

    Only return the message. Do not include explanations or reasoning.
    `.trim();
  }


  /**
   * Validates the generated motivational message for brevity and relevance.
   * @effects Returns `null` if valid, or an error string if validation fails.
   */
  private validateMessage(message: string): string | null {
    // --- 1. Shortness constraint ---
    if (message.length > 200) return "Message too long.";

    // const msgLower = message.toLowerCase();
    
    // --- 2. Actionable intent ---
    // const actionVerbs = [
    //   'start', 'try', 'begin', 'work', 'focus', 'attempt',
    //   'take a moment', 'give it a shot', 'make progress', 'tackle', 'dive in', 'move forward',
    //   'add', 'enhance', 'improve', 'polish', 'shine'
    // ];

    // const encouragementPatterns = [
    //   /you (can|should|might)/i,
    //   /why not/i,
    //   /give it a (try|shot)/i,
    //   /let's/i
    // ];

    // const containsAction = actionVerbs.some(v => msgLower.includes(v)) || 
    //                       encouragementPatterns.some(pattern => pattern.test(message));

    // if (!containsAction) {
    //   return "Message lacks actionable prompt."
    // }

    return null;
  }
}

