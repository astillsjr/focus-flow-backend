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
    * **requires**: The user is not already present.
    * **effects**: Creates a new betting profile for user with no points and a streak of zero.
  * `removeBettor (user: User)`
    * **requires**: The user exists.
    * **effects**: Removes the user and all bets place by the user from the system.
  * `placeBet (user: User, task: Task, wager: Number, deadline: Date): (bet: Bet)`
    * **requires**: The user has a betting profile. A bet does not already exist for this task. The user has more than `wager` points. The deadline for the bet is after the current time.
    * **effects**: Creates a new bet for the task. Deducts `wager` points from the user.
  * `cancelBet (user: User, task: Task)`
    * **requires**: The user has a betting profile. The bet exists for the task and belongs to the user.
    * **effects**: Removes the bet. If the bet has not already been resolved then refunds the user their wager.
  * `resolveBet (user: User, task: Task)`
    * **requires**: The task was started before bet`s deadline.
    * **effects**: If the bet has not already been resolved, marks the bet as a success, awards the user additional points, and increases the user's streak by 1. Otherwise indicates the bet is already resolved.
  * `resolveExpiredBet (user: User, task: Task)`
    * **requires**: The user has a betting profile. The bet exists for the task and belongs to the user. The bet's deadline has already passed.
    * **effects**: If the bet has not already been resolved, marks the bet as a failure and resets the user's streak. Otherwise indicates the bet is already resolved.
  * `viewBetHistory (user: User): (bets: Bet[])`
    * **requires**: The user has a betting profile.
    * **effects**: Returns a list of all bets for the user, ordered from most recent to least recent.