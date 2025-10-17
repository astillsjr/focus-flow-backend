import { Collection, Db, MongoServerError } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { Emotion } from "@utils/emotions.ts";

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

  constructor(private readonly db: Db) {
    this.logs = this.db.collection(PREFIX + "logs");

    this.logs.createIndex(
      { user: 1, task: 1, phase: 1 },
      { unique: true }
    ).catch((err) => {
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
    const newLogId = freshID();
    const newLog: LogDoc = {
      _id: newLogId,
      user,
      task,
      phase,
      emotion,
      createdAt: new Date(),
    };

    try {
      await this.logs.insertOne(newLog);
      return { log: newLogId };
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
  ): Promise<Empty | { error: string }> {
    await this.logs.deleteMany({ user, task });

    return {};
  }

  /**
   * Get a user's emotional trends.
   * @requires The user exists.
   * @effects Returns summary statistics or visual data of emotional shifts.
   */
  public async viewEmotionTrends(
    { user }: { user: User },
  ): Promise<{ trends: string } | { error: string }> {
    const userLogs = await this.logs.find({ user }).toArray();
    if (userLogs.length === 0) return { error: "No logs for this user" };

    return { trends: "Trend analysis not implemented yet" };
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
}