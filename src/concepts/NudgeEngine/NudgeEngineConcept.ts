import { Collection, Db, MongoServerError  } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

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

export default class NudgeEngineConcept {
  nudges: Collection<NudgeDoc>;

  constructor(private readonly db: Db) {
    this.nudges = this.db.collection(PREFIX + "nudges");

    this.nudges.createIndex(
      { user: 1, task: 1 }, 
      { unique: true }
    ).catch((err) => {
      console.error("Failed to create unique index on NudgeEngine nudges:", err);
    });
  }

  /**
   * Schedule a nudge for a task.
   * @requires A nudge for this task does not already exist. The delivery time has not already passed.
   * @effects Creates a new nudge for the task with the specified delivery time.
   */
  public async scheduleNudge(
    { user, task, deliveryTime }: { user: User, task: Task, deliveryTime: Date },
  ): Promise<{ nudge: Nudge } | { error: string }> {
    if (deliveryTime.getTime() < Date.now()) {
      return { error: "Delivery time cannot be in the past" };
    }
    
    const newNudgeId = freshID();
    const newNudge: NudgeDoc = {
      _id: newNudgeId,
      user,
      task,
      deliveryTime: new Date(deliveryTime),
      triggered: false,
      canceled: false,
    };

    try {
      await this.nudges.insertOne(newNudge);
      return { nudge: newNudgeId };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        return { error: "Nudge already exists for this task" };
      }
      throw err;
    }
  }

  /**
   * Cancel a nudge for a task.
   * @requires The nudge must exist and not have already been triggered or canceled.
   * @effects Marks the nudge as canceled.
   */
  public async cancelNudge(
    { user, task }: { user: User, task: Task },
  ): Promise<Empty | { error: string }> {
    const existingNudge = await this.nudges.findOne({ user, task });
    if (!existingNudge) return { error: "Nudge for this task does not exist" };

    if (existingNudge.triggered) return { error: "Nudge has already been triggered" };
    if (existingNudge.canceled) return { error: "Nudge has already been canceled" };

    await this.nudges.updateOne(
      { _id: existingNudge._id },
      { $set: { canceled: true } }
    );

    return {};
  }

  /**
   * Remove all nudges for a user.
   * @effects Removes all nudges targeted at the specified user. 
   */
  public async deleteUserNudges(
    { user }: { user: User},
  ): Promise<Empty> {
    await this.nudges.deleteMany({ user });

    return {};
  }

  /**
   * Send a nudge to a user.
   * @requires The current time has exceeded the delivery time of a nudge.
   * @effects Sends a notification to the user. Marks the nudge as triggered.
   */
  public async nudgeUser(
    { user, task }: { user: User, task: Task },
  ): Promise<{ message: string} | { error: string }> {
    const now = new Date();

    // Atomically find and update if all preconditions are met
    const result = await this.nudges.findOneAndUpdate(
      {
        user,
        task,
        triggered: false,
        canceled: false,
        deliveryTime: { $lte: now },
      },
      { $set: { triggered: true } },
      { returnDocument: "after" },
    );
    
    if (result) return { message: "Nudge triggered — notification system not yet implemented." };

    // Fetch the doc again to determine the specific error reason
    const existingNudge = await this.nudges.findOne({ user, task });

    if (!existingNudge) return { error: "Nudge does not exist for this task" };

    if (existingNudge.triggered) return { error: "Nudge has already been triggered" };

    if (existingNudge.canceled) return { error: "Nudge has been canceled" };

    if (existingNudge.deliveryTime.getTime() > now.getTime()) return { error: "Nudge delivery time has not arrived yet" };

    return { error: "Unknown error triggering nudge" };
  }
}