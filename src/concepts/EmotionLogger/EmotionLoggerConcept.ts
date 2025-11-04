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

// Define the types for our entries based on the concept state
type Log = ID;
export type Phase = "before" | "after";

/**
 * a set of Logs with
 *   a user User
 *   a task Task
 *   a phase String
 *   a emotion Emotion
 *   a createdAt Date
 */
interface LogDoc {
  _id: Log;
  user: User;
  task: Task;
  phase: Phase;
  emotion: Emotion;
  createdAt: Date;
}

/**
 * @concept EmotionLogger
 * @purpose To track and analyze user emotions before and after task completion, enabling self-awareness and emotional pattern recognition.
 */
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
   * Records an emotional log for a given task and phase.
   * @requires A log must not already exist for the same task and phase.
   * @effects Creates a new emotion log entry associated with the specified user, task, and phase.
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
   * Logs an emotion for a task before it is completed.
   * @requires A “before” log must not already exist for the same task.
   * @effects Adds a new log entry capturing the user's emotional state before completion.
   */
  public async logBefore(
    { user, task, emotion }: { user: User, task: Task, emotion: Emotion }
  ): Promise<{ log: Log } | { error: string }> {
    return await this.logPhase(user, task, "before", emotion);
  }

  /**
   * Logs an emotion for a task after it is completed.
   * @requires An “after” log must not already exist for the same task.
   * @effects Adds a new log entry capturing the user's emotional state after completion.
   */
  public async logAfter(
    { user, task, emotion }: { user: User, task: Task, emotion: Emotion }
  ): Promise<{ log: Log } | { error: string }> {
    return await this.logPhase(user, task, "after", emotion);
  }

  /**
   * Deletes all emotion logs for a specific task.
   * @effects Removes all logs associated with the specified task for the given user.
   */
  public async deleteTaskLogs(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty> {
    await this.logs.deleteMany({ user, task });
    return {};
  }

  /**
   * Deletes all emotion logs for a specific user.
   * @effects Removes every emotion log associated with the given user.
   */
  public async deleteUserLogs(
    { user }: { user: User },
  ): Promise<Empty> {
    await this.logs.deleteMany({ user });
    return {};
  }

  /**
   * Generates a reflection analyzing the user’s recent emotional patterns.
   * @requires The user must have at least one recorded emotion log.
   * @effects Produces a brief AI-generated emotional summary highlighting trends and shifts.
   */
  public async analyzeRecentEmotions(
    { user }: { user: User }
  ): Promise<{ analysis: string } | { error: string }> {
    const logs = await this.getUserLogs({ user, limit: 10 });

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
   * Retrieves all logged emotions for a specific task.
   * @effects Returns both “before” and “after” emotion states associated with the given task.
   */
  public async getEmotionsForTask(
    { user, task }: { user: User; task: Task }
  ): Promise<{ task: Task, emotions: Partial<Record<Phase, Emotion>> }> {
    const logs = await this.getLogsForTask({ user, task });

    const emotions: Partial<Record<Phase, Emotion>> = {};
    for (const log of logs) {
      emotions[log.phase] = log.emotion;
    }

    return { task, emotions };
  }

  /**
   * Retrieves emotion logs with pagination and filtering.
   * @effects Returns paginated and optionally filtered emotion logs.
   */
  public async getEmotionLogs(
    {
      user,
      page = 1,
      limit = 20,
      phase,
      emotion,
      sortBy = "createdAt",
      sortOrder = -1
    }: {
      user: User;
      page?: number;
      limit?: number;
      phase?: Phase;
      emotion?: Emotion;
      sortBy?: keyof LogDoc;
      sortOrder?: 1 | -1;
    }
  ): Promise<{
    logs: LogDoc[];
    total: number;
    page: number;
    totalPages: number;
  } | { error: string }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { user };

    if (phase) filter.phase = phase;
    if (emotion) filter.emotion = emotion;

    const [logs, total] = await Promise.all([
      this.logs
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.logs.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      totalPages
    };
  }

  /**
   * Computes overall emotion statistics for a user.
   * @requires The user must have at least one recorded emotion log.
   * @effects Returns aggregate emotion statistics including most/least common emotions,
   *          average logs per day, and a recent emotional trend classification.
   */
  public async getEmotionStats(
    { user }: { user: User }
  ): Promise<{
    totalLogs: number;
    mostCommonEmotion: Emotion | null;
    leastCommonEmotion: Emotion | null;
    averageEmotionsPerDay: number;
    recentTrend: "improving" | "declining" | "stable" | "insufficient_data";
  } | { error: string }> {
    const logs = await this.getUserLogs({ user, limit: 1000 });
    if (logs.length === 0) return { error: "No emotion logs found" };

    // Count emotions
    const emotionCounts: Record<Emotion, number> = Object.fromEntries(
      ALL_EMOTIONS.map(e => [e, 0])
    ) as Record<Emotion, number>;

    for (const log of logs) {
      emotionCounts[log.emotion]++;
    }

    // Find most and least common emotions
    const sortedEmotions = Object.entries(emotionCounts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);

    const mostCommonEmotion = sortedEmotions.length > 0 ? sortedEmotions[0][0] as Emotion : null;
    const leastCommonEmotion = sortedEmotions.length > 0 ? sortedEmotions[sortedEmotions.length - 1][0] as Emotion : null;

    // Calculate average emotions per day
    const firstLog = logs[logs.length - 1]; // Oldest log
    const lastLog = logs[0]; // Newest log
    const daysDiff = Math.max(1, Math.ceil((lastLog.createdAt.getTime() - firstLog.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const averageEmotionsPerDay = logs.length / daysDiff;

    // Simple trend analysis (last 5 vs previous 5)
    let recentTrend: "improving" | "declining" | "stable" | "insufficient_data" = "insufficient_data";
    if (logs.length >= 10) {
      const recent = logs.slice(0, 5);
      const previous = logs.slice(5, 10);
      
      // Simple heuristic: count positive emotions
      const positiveEmotions = new Set([
        Emotion.Excited, Emotion.Optimistic, Emotion.Motivated, Emotion.Confident,
        Emotion.Hopeful, Emotion.Energized, Emotion.Content, Emotion.Proud,
        Emotion.Inspired, Emotion.Productive, Emotion.Curious, Emotion.Calm, Emotion.Focused
      ]);

      const recentPositive = recent.filter(log => positiveEmotions.has(log.emotion)).length;
      const previousPositive = previous.filter(log => positiveEmotions.has(log.emotion)).length;

      if (recentPositive > previousPositive) recentTrend = "improving";
      else if (recentPositive < previousPositive) recentTrend = "declining";
      else recentTrend = "stable";
    }

    return {
      totalLogs: logs.length,
      mostCommonEmotion,
      leastCommonEmotion,
      averageEmotionsPerDay: Math.round(averageEmotionsPerDay * 100) / 100,
      recentTrend
    };
  }
  
  /**
   * Retrieves a user’s recent emotion logs.
   * @effects Returns up to `limit` most recent emotion logs for the user.
   */
  private getUserLogs(
    { user, limit = 100 }: { user: User; limit?: number }
  ): Promise<LogDoc[]> {
    return this.logs.find({ user }).sort({ createdAt: -1 }).limit(limit).toArray();
  }

  /**
   * Retrieves emotion logs for a specific task.
   * @effects Returns all logs for the specified user and task, ordered chronologically.
   */
  private getLogsForTask(
    { user, task }: { user: User; task: Task }
  ): Promise<LogDoc[]> {
    return this.logs.find({ user, task }).sort({ createdAt: 1 }).toArray();
  }

  /**
   * Constructs a natural-language prompt for LLM emotion analysis.
   * @effects Produces a structured prompt summarizing recent logs for reflective analysis.
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