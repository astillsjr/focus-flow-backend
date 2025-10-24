# concept: MicroBet

* **concept**: MicroBet \[User, Task]
* **purpose**: To motivate users to start tasks through gamified accountability using symbolic or real stakes.
* **principle**: If a user bets that they’ll start a task at a certain time, and they do, they gain points or streaks; otherwise, they lose points, encouraging consistent effort.
* **state**:
  * A set of `Users` with
    * a `points` of type `Number`
    * a `streak` of type `Number`
  * A set of `Bets` with
    * a `user` of type `User`
    * a `task` of type `Task`
    * a `wager` of type `Number`
    * a `deadline` of type `Date`
    * a `taskDueDate?` of type `Date`
    * a `success?` of type `Boolean`
* **actions**:
  * `initializeBettor (user: User)`
    * **requires**: The user must not already be registered as a bettor.
    * **effects**: Creates a new betting profile for the user with 100 points and a streak of 0.
  * `removeBettor (user: User)`
    * **effects**: Deletes the user's profile and all bets placed by them.
  * `placeBet (user: User, task: Task, wager: Number, deadline: Date, taskDueDate?: Date): (bet: Bet)`
    * **requires**: The user must have a betting profile. No existing bet must exist for the same task. The user must have at least `wager` points. The bet deadline must be in the future. If provided, the bet deadline must be before the task due date.
    * **effects**: Creates a bet on the task and deducts the wager amount from the user's points. The task due date is stored for reward calculation.
  * `cancelBet (user: User, task: Task)`
    * **requires**: The user must have a betting profile. The bet must exist and belong to the user.
    * **effects**: Deletes the bet. If the bet is unresolved, refunds the wagered points to the user.
  * `resolveBet (user: User, task: Task, completionTime: Date): (status: String, reward?: Number)`
    * **requires**: The user must have a betting profile. The bet must exist and belong to the user. The completion time must not exceed the deadline.
    * **effects**: If unresolved, marks the bet as successful, awards a calculated reward (based on wager, streak, and time bonus) to the user, and increments their streak. Otherwise, reports that the bet was already resolved.
  * `resolveExpiredBet (user: User, task: Task)`
    * **requires**: The user must have a betting profile. The bet must exist and belong to the user. The deadline must have already passed.
    * **effects**: If unresolved, marks the bet as failed and resets the user's streak. Otherwise, reports that the bet was already resolved.
  * `getBet (user: User, task: Task): (bet: BetDoc)`
    * **requires**: The user must have a betting profile, and a bet must exist for the task.
    * **effects**: Returns the corresponding bet document.
  * `getActiveBets (user: User): (bets: BetDoc[])`
    * **requires**: The user must have a betting profile.
    * **effects**: Returns all bets that are still active and unresolved.
  * `getExpiredBets (user: User): (bets: BetDoc[])`
    * **requires**: The user must have a betting profile.
    * **effects**: Returns bets that have passed their deadlines but have not been resolved.
  * `getUserProfile (user: User): (points: Number, streak: Number, totalBets: Number, successfulBets: Number, failedBets: Number, pendingBets: Number)`
    * **requires**: The user must have a betting profile.
    * **effects**: Returns aggregated statistics on points, streak, and bet outcomes.
  * `getRecentActivity (user: User, limit?: Number): (bets: BetDoc[])`
    * **requires**: The user must have a betting profile.
    * **effects**: Returns the user's most recent bets, sorted by creation time.
  