import { Collection, Db, MongoServerError } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from '@utils/gemini-llm.ts';
import { Emotion, ALL_EMOTIONS } from "@utils/emotions.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the environment");
}

// Collection prefix to avoid name clashes
const PREFIX = "EmotionLogger" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Task = ID;

// Define the types for our entires based on the concept state
type Log = ID;
export type Phase = "before" | "after";

/**
 * a set of Logs with
 *   a user User
 *   a task Task
 *   a phase String
 *   a emotion Emotion
 */
interface LogDoc {
  _id: Log;
  user: User;
  task: Task;
  phase: Phase;
  emotion: Emotion;
  createdAt: Date;
}

export default class EmotionLoggerConcept {
  logs: Collection<LogDoc>;
  llm: GeminiLLM;

  constructor(private readonly db: Db) {
    this.logs = this.db.collection(PREFIX + "logs");
    this.llm = new GeminiLLM(GEMINI_API_KEY!);

    this.logs.createIndex({ user: 1, task: 1, phase: 1 }, { unique: true }).catch((err) => {
      console.error("Failed to create unique index on EmotionLogger logs:", err);
    });
  }

  /**
   * Create a log for a specified phase.
   * @requires A log does not already exist for the task in the given phase.
   * @effects Adds a new log entry for the task in that phase.
   */
  private async logPhase(
    user: User,
    task: Task,
    phase: Phase,
    emotion: Emotion
  ): Promise<{ log: Log } | { error: string }> {
    const newLog: LogDoc = {
      _id: freshID(),
      user,
      task,
      phase,
      emotion,
      createdAt: new Date(),
    };

    try {
      await this.logs.insertOne(newLog);
      return { log: newLog._id };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        return { error: `A log in the ${phase} phase already exists for this task` };
      }
      throw err;
    }
  }

  /**
   * Create a new log for an uncompleted task.
   * @requires A log does not already exist for the task before it was complete.
   * @effects Adds a new log entry for the task before it was complete.
   */
  public async logBefore(
    { user, task, emotion }: { user: User, task: Task, emotion: Emotion }
  ): Promise<{ log: Log } | { error: string }> {
    return await this.logPhase(user, task, "before", emotion);
  }

  /**
   * Create a new log for a completed task.
   * @requires A log does not already exist for the task after it was complete.
   * @effects Adds a new log entry for the task after it was complete.
   */
  public async logAfter(
    { user, task, emotion }: { user: User, task: Task, emotion: Emotion }
  ): Promise<{ log: Log } | { error: string }> {
    return await this.logPhase(user, task, "after", emotion);
  }

  /**
   * Delete the logs of a given task.
   * @effects Removes all the logs associated with the given task.
   */
  public async deleteTaskLogs(
    { user, task }: { user: User, task:Task },
  ): Promise<Empty> {
    await this.logs.deleteMany({ user, task });
    return {};
  }

  /**
   * Remove a user's logs.
   * @effects Removes all emotions logged by the specified user.
   */
  public async deleteUserLogs(
    { user }: { user:User },
  ): Promise<Empty> {
    await this.logs.deleteMany({ user });
    return {};
  }

  /**
   * Get a user's emotional trends.
   * @requires The user has at least one log.
   * @effects Returns summary statistics of logs.
   */
  public async viewEmotionTrends(
    { user }: { user: User },
  ): Promise<{
    trends: {
      total: number;
      counts: Partial<Record<Emotion, number>>;
      byPhase: Record<Phase, Partial<Record<Emotion, number>>>;
      recentEmotions: { phase: Phase; emotion: Emotion; createdAt: Date }[];
    };
  } | { error: string }> {
    const userLogs = await this.logs.find({ user }).sort({ createdAt: -1 }).toArray();
    if (userLogs.length === 0) return { error: "No logs for this user" };

    const internalCounts: Record<Emotion, number> = Object.fromEntries(
      ALL_EMOTIONS.map(e => [e, 0])
    ) as Record<Emotion, number>;

    const internalByPhase: Record<Phase, Record<Emotion, number>> = {
      before: Object.fromEntries(ALL_EMOTIONS.map(e => [e, 0])) as Record<Emotion, number>,
      after: Object.fromEntries(ALL_EMOTIONS.map(e => [e, 0])) as Record<Emotion, number>,
    };

    for (const log of userLogs) {
      internalCounts[log.emotion]++;
      internalByPhase[log.phase][log.emotion]++;
    }

    const filterNonZero = (obj: Record<Emotion, number>): Partial<Record<Emotion, number>> =>
      Object.fromEntries(Object.entries(obj).filter(([, count]) => count > 0));

    return {
      trends: {
        total: userLogs.length,
        counts: filterNonZero(internalCounts),
        byPhase: {
          before: filterNonZero(internalByPhase.before),
          after: filterNonZero(internalByPhase.after),
        },
        recentEmotions: userLogs.slice(0, 5).map(({ phase, emotion, createdAt }) => ({
          phase,
          emotion,
          createdAt,
        })),
      }
    };
  }

  /**
   * Generate an analysis of the users recent emotion patterns.
   * @requires The user has at least one log.
   * @effects Creates a short summary analyzing the users recent emotional states.
   */
  public async analyzeRecentEmotions(
    { user }: { user: User }
  ): Promise<{ analysis: string } | { error: string }> {
    const logs = await this._getUserLogs({ user, limit: 10 });

    if (logs.length === 0) {
      return { error: "No recent emotion logs found for this user." };
    }

    const prompt = this.buildAnalysisPrompt(logs);

    try {
      const response = await this.llm.executeLLM(prompt);
      return { analysis: response.trim() };
    } catch (err) {
      console.error("Emotion analysis LLM error:", err);
      return { error: "Failed to generate emotional analysis." };
    }
  }

  /**
   * Get the emotion logs for a user.
   * @effects Returns the user's logs. 
   */
  public _getUserLogs(
    { user, limit = 100 }: { user: User; limit?: number }
  ): Promise<LogDoc[]> {
    return this.logs.find({ user }).sort({ createdAt: -1 }).limit(limit).toArray();
  }

  /**
   * Get the emotion logs for a specific task.
   * @effects Returns the user's logs for the task.
   */
  public _getLogsForTask(
    { user, task }: { user: User; task: Task }
  ): Promise<LogDoc[]> {
    return this.logs.find({ user, task }).sort({ createdAt: 1 }).toArray();
  }

  /**
   * Get the logged emotions for a specific task.
   * @effects Returns the user's emotions on the task.
   */
  public async _getEmotionsForTask(
    { user, task }: { user: User; task: Task }
  ): Promise<{ task: Task, emotions: Partial<Record<Phase, Emotion>> }> {
    const logs = await this._getLogsForTask({ user, task });

    const emotions: Partial<Record<Phase, Emotion>> = {};
    for (const log of logs) {
      emotions[log.phase] = log.emotion;
    }

    return { task, emotions };
  }
  
  /**
   * Construct a user nudge message prompt.
   */
  private buildAnalysisPrompt(logs: LogDoc[]): string {
    const formattedLogs = logs.map(log => {
      const date = log.createdAt.toISOString().split("T")[0];
      return `• [${date}] (${log.phase.toUpperCase()}) ${log.emotion}`;
    }).join("\n");

    return `
    You are a friendly and emotionally intelligent assistant helping users reflect on their recent task-related emotional patterns.

    Below is a log of recent emotions a user recorded **before** and **after** working on various tasks.

    Each entry contains the date, phase (before/after), and emotion:

    ${formattedLogs}

    Your job is to write a short (2–4 sentence) emotional reflection that helps the user notice trends. Gently highlight:
    - Any emotional shifts between "before" and "after"
    - Recurring emotions or fluctuations
    - General patterns in how the user feels about tasks

    Keep your tone kind, non-judgmental, and observational — like a coach helping someone build self-awareness.

    Only return the reflection. Do not include any explanations or bullet points.
    `.trim();
  }
}