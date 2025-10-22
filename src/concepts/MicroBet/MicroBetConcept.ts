import { Collection, Db, MongoServerError } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to avoid name clashes
const PREFIX = "MicroBet" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Task = ID;

// Define the types for our entires based on the concept state
type Bet = ID;

/**
 * a set of Users with
 *   a points Number
 *   a streak Number
 */
interface UserDoc {
  _id: User;
  points: number;
  streak: number;
}

/**
 * a set of Bets with
 *   a user User
 *   a task Task
 *   a wager Number
 *   a deadline Date
 *   a success? Boolean
 */
interface BetDoc {
  _id: Bet;
  user: User;
  task: Task;
  wager: number;
  deadline: Date;
  success?: boolean;
  createdAt: Date;
}

export default class MicroBetConcept {
  users: Collection<UserDoc>;
  bets: Collection<BetDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.bets = this.db.collection(PREFIX + "bets");

    this.bets.createIndex({ user: 1, task: 1 }, { unique: true }).catch((err) => {
      console.error("Failed to create bets index:", err);
    });
  }

  /**
   * Add a user to the betting system.
   * @requires The user is not already present.
   * @effects Creates a new betting profile for user with no points and a streak of zero.
   */
  public async initializeBettor(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const userProfile = await this.users.findOne({ _id: user });
    if (userProfile) return { error: "User already initialized" };

    await this.users.insertOne({ _id: user, points: 0, streak: 0 });
    return {};
  }

  /**
   * Remove a user from the betting system.
   * @effects Removes the user and all bets place by the user from the system.
   */
  public async removeBettor(
    { user }: { user: User },
  ): Promise<Empty> {
    await Promise.all([
      this.users.deleteOne({ _id: user }),
      this.bets.deleteMany({ user })
    ]);

    return {};
  }

  /**
   * Generate a bet.
   * @requires The user has a betting profile. A bet does not already exist for this task. The user has more than `wager` points. The deadline for the bet is after the current time.
   * @effects Creates a new bet for the task. Deducts `wager` points from the user.
   */
  public async placeBet({
    user, task, wager, deadline
  }: {
    user: User;
    task: Task;
    wager: number;
    deadline: Date;
  }): Promise<{ bet: Bet } | { error: string }> {
    if (deadline.getTime() < Date.now()) return { error: "Deadline must be in the future" };

    const userProfile = await this.users.findOne({ _id: user });
    if (!userProfile) return { error: "User profile not found" };

    if (userProfile.points < wager) return { error: "Insufficient points to wager" };

    const newBet: BetDoc = {
      _id: freshID(),
      user,
      task,
      wager,
      deadline,
      createdAt: new Date(),
    }

    try {
      const updated = await this.users.updateOne(
        { _id: user, points: { $gte: wager } },
        { $inc: { points: -wager } }
      );

      if (updated.modifiedCount === 0) return { error: "Failed to deduct points" };

      await this.bets.insertOne(newBet);

      return { bet: newBet._id };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        return { error: "Bet for this task already exists" };
      }

      // If insert fails after deducting, refund points
      await this.users.updateOne({ _id: user }, { $inc: { points: wager } });
      throw err; 
    }
  }

  /**
   * Cancel a bet.
   * @requires The user has a betting profile. The bet exists for the task and belongs to the user.
   * @effects Removes the bet. If the bet has not already been resolved then refunds the user their wager.
   */
  public async cancelBet(
    { user, task }: { user: User, task: Task }
  ): Promise<Empty | { error: string }> {
    const userProfile = await this.users.findOne({ _id: user });
    if (!userProfile) return { error: "User profile not found" };

    const betDoc = await this.bets.findOne({ user, task });
    if (!betDoc) return { error: "Bet not found" };

    await this.bets.deleteOne({ _id: betDoc._id });

    // Refund only if unresolved
    if (betDoc.success === undefined) {
      await this.users.updateOne({ _id: user }, { $inc: { points: betDoc.wager } });
    }

    return {};
  }

  /**
   * Attempt to resolve a bet.
   * @requires The user has a betting profile. The bet exists for the task and belongs to the user.
   * @effects If the bet has not already been resolved, marks the bet as a success, awards the user additional points, and increases the user's streak by 1. Otherwise indicates the bet is already resolved.
   */
  public async resolveBet(
    { user, task, completionTime }: { user: User, task: Task, completionTime: Date },
  ): Promise<
    { status: "already_resolved" } | 
    { status: "success", reward: number } | 
    { error: string }
  > {
    const userProfile = await this.users.findOne({ _id: user });
    if (!userProfile) return { error: "User profile not found" };

    const betDoc = await this.bets.findOne({ user, task });
    if (!betDoc) return { error: "Bet for this task does not exist" };

    if (betDoc.success !== undefined) {
      return { status: "already_resolved" };
    }

    if (completionTime > betDoc.deadline) {
      return { error: "Cannot resolve: deadline has passed" }; 
    }

    const reward = this.calculateReward(betDoc.wager, userProfile.streak + 1);

    await Promise.all([
      this.bets.updateOne({ _id: betDoc._id }, { $set: { success: true } }),
      this.users.updateOne({ _id: user }, { $inc: { points: reward, streak: 1 } }),
    ]);

    return { status: "success", reward };
  }

  /**
   * Resolve an expired bet.
   * @requires The user has a betting profile. The bet exists for the task and belongs to the user. The bet's deadline has already passed.
   * @effects If the bet has not already been resolved, marks the bet as a failure and resets the user's streak. Otherwise indicates the bet is already resolved.
   */
  public async resolveExpiredBet (
    { user, task }: { user: User, task: Task }
  ): Promise<Empty| { status: "already_resolved" } | { error: string }> {
    const userProfile = await this.users.findOne({ _id: user });
    if (!userProfile) return { error: "User profile not found" };

    const betDoc = await this.bets.findOne({ user, task });
    if (!betDoc) return { error: "Bet not found" };

    if (betDoc.success !== undefined) return { status: "already_resolved" };

    if (betDoc.deadline.getTime() > Date.now()) {
      return { error: "Deadline has not yet passed" };
    }

    await Promise.all([
      this.bets.updateOne({ _id: betDoc._id }, { $set: { success: false } }),
      this.users.updateOne({ _id: user }, { $set: { streak: 0 } }),
    ]);

    return {};
  }

  /**
   * View the user's bet history.
   * @requires The user has a betting profile.
   * @effects Returns a list of all bets for the user, ordered from most recent to least recent and filtered by status if provided.
   */
  public async viewBetHistory(
    { user, status }: { user: User, status?: "pending" | "success" | "failure" },
  ): Promise<BetDoc[] | { error: string }> {
    const userProfile = await this.users.findOne({ _id: user });
    if (!userProfile) return { error: "User profile not found" };

    const filter: Record<string, unknown> = { user };

    if (status === "pending") {
      filter.success = { $exists: false };
    } else if (status === "success") {
      filter.success = true;
    } else if (status === "failure") {
      filter.success = false;
    }

    return await this.bets.find(filter).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Fetch a users stats.
   * @requires The user has a betting profile. 
   */
  public async _getUserStats(
    { user }: { user: User }
  ): Promise<{ points: number, streak: number } | { error: string }> {
    const profile = await this.users.findOne({ _id: user });
    return profile
      ? { points: profile.points, streak: profile.streak }
      : { error: "User profile not found" };
  }

  /**
   * Fetch the bet for a specific task.
   * @requires The user has a betting profile. The has a bet placed on it.
   */
  public async _getBetForTask(
    { user, task }: { user: User, task: Task }
  ): Promise<BetDoc | { error: string }> {
    const bet = await this.bets.findOne({ user, task });
    return bet ?? { error: "Bet not found" };
  }

  /**
   * Fetch the active bets for a user.
   * @requires The user has a betting profile.
   */
  public async _getActiveBets(
    { user }: { user: User }
  ): Promise<BetDoc[] | { error: string }> {
    const userProfile = await this.users.findOne({ _id: user });
    if (!userProfile) return { error: "User profile not found" };

    return this.bets.find({ user, success: { $exists: false } }).toArray();
  }

  /**
   * Calculates the amount a bet should award.
   */
  private calculateReward (wager: number, streak: number): number {
    const STREAK_MULTIPLIER = 0.15;
    const streakBonus = Math.log(Math.log(streak + Math.E));
    const reward = wager * (1 + STREAK_MULTIPLIER * streakBonus);
    
    return Math.round(reward);
  }
}