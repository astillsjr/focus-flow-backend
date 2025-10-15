import { Collection, Db } from "npm:mongodb";
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
 * a set of Bets wtih
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
  }

  /**
   * Add a user to the betting system.
   * @requires The user is not already present.
   * @effects Creates a new user with no points and a streak of zero.
   */
  public async initializeBetter(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (existingUser) return { error: "This user is already a part of the system" };

    const newUser: UserDoc = {
      _id: user,
      points: 0,
      streak: 0,
    };

    await this.users.insertOne(newUser);

    return {};
  }

  /**
   * Remove a user from the betting system.
   * @effects Removes the user and all bets place by the user from the system.
   */
  public async removeBettor(
    { user }: { user: User },
  ): Promise<Empty> {
    await this.users.deleteOne({ _id: user });
    await this.bets.deleteMany({ user });

    return {};
  }

  /**
   * Place a bet.
   * @requires The user exists. A bet does not already exist for this task. The user has ≥ wager points. The deadline has not already passed.
   * @effects Creates a new bet for the given task assigned to the given user. Deducts `wager` points from the user.
   */
  public async placeBet(
    params: {
      user: User;
      task: Task;
      wager: number;
      deadline: Date;
    }
  ): Promise<{ bet: Bet } | { error: string }> {
    const { user, task, wager, deadline } = params;

    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) return { error: "User does not exist" };

    const existingBet = await this.bets.findOne({ user, task });
    if (existingBet) return { error: "Bet for this task already exists" };

    if (existingUser.points < wager) return { error: "User does not have enough points to make this wager" };
    
    if (deadline.getTime() < Date.now()) return { error: "Due date cannot be in the past" };

    const newBetId = freshID();
    const newBet: BetDoc = {
      _id: newBetId,
      user,
      task,
      wager,
      deadline,
      createdAt: new Date(),
    }

    await this.bets.insertOne(newBet);

    await this.users.updateOne(
      { _id: existingUser._id },
      { $set: { points: existingUser.points - wager } }
    );

    return { bet: newBetId };
  }

  /**
   * Cancel a bet.
   * @requires The user exists. The bet for the user-task pair exists.
   * @effects Removes the bet. If the bet has not already been resolved then refunds the user their wager.
   */
  public async cancelBet(
    { user, task }: { user: User, task: Task }
  ): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) return { error: "User does not exist" };

    const existingBet = await this.bets.findOne({ user, task });
    if (!existingBet) return { error: "Bet for this task does not exist" };

    await this.bets.deleteOne({ _id: existingBet._id });

    if (existingBet.success === undefined) {
      await this.users.updateOne(
        { _id: existingUser._id },
        { $set: { points: existingUser.points + existingBet.wager } }
      );
    }
    
    return {};
  }

  /**
   * Resolve a potentially successful bet.
   * @requires The user exists. The bet for the user-task pair exists.
   * @effects If the bet has not already been resolved, marks the bet as a success, awards the user additional points, and increases the user's streak by 1.
   */
  public async resolveBet(
    { user, task, completionTime }: { user: User, task: Task, completionTime: Date },
  ): Promise<{ status: "already_resolved" } | { status: "success", reward: number } | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) return { error: "User does not exist" };

    const existingBet = await this.bets.findOne({ user, task });
    if (!existingBet) return { error: "Bet for this task does not exist" };

    if (
      existingBet.success === undefined &&
      completionTime.getTime() < existingBet.deadline.getTime()
    ) {
      await this.bets.updateOne(
        { _id: existingBet._id },
        { $set: { success: true } }
      );

      const betReward = this.calculateReward(existingBet.wager, existingUser.streak);
      await this.users.updateOne(
        { _id: existingUser._id },
        { $set: { 
            points: existingUser.points + betReward,
            streak: existingUser.streak + 1,
          } 
        }
      );

      return { status: "success", reward: betReward };
    }

    return { status: "already_resolved" };
  }

  /**
   * Resolve an expired bet.
   * @requires The user exists. The bet for the user-task pair exists. The bet's deadline has already passed.
   * @effects If the bet has not already been resolved, marks the bet as a failure and resets the user's streak.
   */
  private async resolveExpiredBet (
    { user, task }: { user: User, task: Task }
  ): Promise<Empty| { status: "already_resolved" } | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) return { error: "User does not exist" };

    const existingBet = await this.bets.findOne({ user, task });
    if (!existingBet) return { error: "Bet for this task does not exist" };

    if (existingBet.deadline.getTime() > Date.now()) return { error: "Deadline has not yet expired" };

    if (existingBet.success !== undefined) return { status: "already_resolved" };

    await this.bets.updateOne(
      { _id: existingBet._id },
      { $set: { success: false } }
    );

    await this.users.updateOne(
      { _id: existingUser._id },
      { $set: { streak: 0 } }
    );

    return {};
  }

  /**
  * Automatically resolve all expired unresolved bets.
  * @effects Marks bets as failed if their deadline has passed and they are unresolved.
  */
  public async resolveAllExpiredBets(): Promise<{ resolved: number }> {
    const now = new Date();

    const expiredBets = await this.bets.find({
      deadline: { $lt: now },
      success: { $exists: false }
    }).toArray();

    let resolvedCount = 0;

    for (const bet of expiredBets) {
      const user = bet.user;
      const task = bet.task;

      const res = await this.resolveExpiredBet({ user, task });
      if (!("error" in res)) resolvedCount++;
    }

    return { resolved: resolvedCount };
  }

  /**
   * View the user's bet history.
   * @requires The user exists.
   * @effects Returns a list of all bets for the user, ordered from most recent to least recent.
   */
  public async viewBetHistory(
    { user, status }: { user: User, status?: "pending" | "success" | "failure" },
  ): Promise<BetDoc[] | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) return { error: "User does not exist" };

    const filter: Record<string, unknown> = { user };

    if (status === "pending") {
      filter.success = { $exists: false };
    } else if (status === "success") {
      filter.success = true;
    } else if (status === "failure") {
      filter.success = false;
    }

    const betHistory = this.bets.find(filter).sort({ createdAt: -1 });

    return await betHistory.toArray();
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