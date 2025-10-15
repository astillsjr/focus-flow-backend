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
    * a `success?` of type `Boolean`
* **actions**:
  * `initializeBettor (user: User)`
    * **requires**: The user doesn't already exist.
    * **effects**: Creates a new user with `points` := 0 and `streak` := 0.
  * `removeBettor (user: User)`
    * **requires**: The user exists.
    * **effects**: Removes the user and all the user bets.
  * `placeBet (user: User, task: Task, wager: Number, deadline: Date): (bet: Bet)`
    * **requires**: The user has ≥ wager points. The deadline has not already passed.
    * **effects**: Creates a new Bet for the given task for the user. Deducts `wager` points from the user.
  * `cancelBet (user: User, task: Task)`
    * **requires**: The bet for the user-task pair exists.
    * **effects**: Removes the bet from the user's bets and refunds the user their wager.
  * `resolveBet (user: User, task: Task)`
    * **requires**: The task was started before bet`s deadline.
    * **effects**: Sets `success` := true for the bet. Adds `wager` × multiplier to the user's `points` and increases user's streak by one.
  * `system resolveFailedBet (user: User, task: Task)`
    * **requires**: The bet's deadline has passed and `success` = null.
    * **effects**: Sets the bet's `sucess` := false. Resets the user's streak to 0.
  * `viewBetHistory (user: User): (bets: Bet[])`
    * **effects**: Returns a list of all bets for the user, ordered from most recent to least recent.
* **queries**:
  * `getUsersBet (user: User, task: Task): (bet: Bet)`
    * **requires**: The user must have a bet associated with the specified task.
    * **effects**: Returns the user's bet associated with the specified task.