# concept: NudgeEngine

* **concept**: NudgeEngine \[User, Task]
* **purpose**: To encourage users to begin tasks through timely, low-pressure prompts.
* **principle**: If a user schedules a task, then a nudge is generated for the task. When a nudge is prompted to be sent, the AI model analyzes the user’s current mood trends and the nature of the task to generate a motivational message.
* **state**:
  * A set of `Nudges` with
    * a `user` of type `User`
    * a `task` of type `Task`
    * a `deliveryTime` of type `Date`
    * a `triggeredAt` of type `Date` (null when not yet triggered)
    * a `message` of type `String` (optional, set when nudge is triggered)
* **actions**:
  * `scheduleNudge (user: User, task: Task, deliveryTime: Date): (nudge: Nudge)`
    * **requires**: No existing nudge must exist for the same task. The delivery time must be in the future.
    * **effects**: Creates a new nudge record associated with the task and user.
  * `cancelNudge (user: User, task: Task, force?: Boolean)`
    * **requires**: The nudge must exist. If `force` is false (default), the nudge must not already be triggered.
    * **effects**: Deletes the nudge, preventing future delivery. When `force` is true, deletes the nudge even if it has been triggered (for cleanup operations).
  * `deleteUserNudges (user: User)`
    * **effects**: Removes every nudge targeted at the specified user.
  * `nudgeUser (user: User, task: Task, title: String, description: String, recentEmotions: Emotion[]): (message: String, nudge: Nudge)`
    * **requires**: The current time must be later than the nudge's delivery time. The nudge must not already be triggered or canceled.
    * **effects**: Generates a motivational message using the AI model and marks the nudge as triggered.
  * `getNudge (user: User, task: Task): (nudge: NudgeDoc)`
    * **requires**: A nudge must exist for the specified user and task.
    * **effects**: Returns the matching nudge document.
  * `getUserNudges (user: User, status?: "pending" | "triggered", limit?: Number): (nudges: NudgeDoc[])`
    * **effects**: Returns the user's nudges filtered by status (pending or triggered).
  * `getReadyNudges (user: User): (nudges: NudgeDoc[])`
    * **effects**: Returns nudges whose delivery time has arrived and are not yet triggered.
  * `getReadyNudgesSince (user: User, sinceTimestamp: Date): (nudges: NudgeDoc[])`
    * **effects**: Returns nudges whose delivery time is after the given timestamp, delivery time has arrived, and are not yet triggered.
  * `getNewTriggeredNudges (user: User, afterTimestamp: Date, limit?: Number): (nudges: NudgeDoc[])`
    * **effects**: Returns nudges that were triggered after the specified timestamp.
  * `getLastTriggeredTimestamp (user: User): (timestamp: Date | null)`
    * **effects**: Returns the most recent triggered nudge timestamp for a user, used to initialize incremental queries.