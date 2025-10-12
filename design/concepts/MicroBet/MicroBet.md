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
  * `placeBet (user: User, task: Task, wager: Number, deadline: Date)`
    * **requires**: The user has ≥ wager points.
    * **effects**: Creates a new Bet for the given task for the user. Deducts `wager` points from the user.
  * `completeBet (user: User, task: Task, bet: Bet)`
    * **requires**: The task was started before bet`s deadline.
    * **effects**: Sets `success` := true for the bet. Adds `wager` × multiplier to the user's `points` and increases user's streak by one.
  * `system resolveFailedBet (user: User, bet: Bet)`
    * **requires**: The bet's deadline has passed and `success` = null.
    * **effects**: Sets the bet's `sucess` := false. Resets the user's streak to 0.
  * `viewBetHistory (user: User): (bets: Bet[])`
    * **effects**: Returns a list of all bets for the user, ordered from most recent to least recent.