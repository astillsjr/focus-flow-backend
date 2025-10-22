# concept: NudgeEngine

* **concept**: NudgeEngine \[User, Task]
* **purpose**: To encourage users to begin tasks through timely, low-pressure prompts.
* **principle**: If a user schedules a task, then a nudge is generated for the task. When a nudge is prompted to be sent, the AI model analyzes the user’s current mood trends and the nature of the task to generate a motivational message.
* **state**:
  * A set of `Nudges` with
    * a `user` of type `User`
    * a `task` of type `Task`
    * a `deliveryTime` of type `Date`
    * a `triggered` of type `Boolean`
    * a `canceled` of type `Boolean`
* **actions**:
  * `scheduleNudge (user: User, task: Task, deliveryTime: Date): (nudge: Nudge)`
    * **requires**: No existing nudge must exist for the same task. The delivery time must be in the future.
    * **effects**: Creates a new nudge record associated with the task and user.
  * `cancelNudge (user: User, task: Task)`
    * **requires**: The nudge must exist and must not already be triggered or canceled.
    * **effects**: Marks the nudge as canceled, preventing future delivery.
  * `deleteUserNudges (user: User)`
    * **effects**: Removes every nudge targeted at the specified user.
  * `nudgeUser (user: User, task: Task, title: String, description: String, recentEmotions: Emotion[]): (message: String, nudge: Nudge)`
    * **requires**: The current time must be later than the nudge's delivery time. The nudge must not already be triggered or canceled.
    * **effects**: Generates a motivational message using the AI model and marks the nudge as triggered.
  * `getNudge (user: User, task: Task): (nudge: NudgeDoc)`
    * **requires**: A nudge must exist for the specified user and task.
    * **effects**: Returns the matching nudge document.
  * `getUserNudges (user: User, status?: "pending" | "triggered" | "canceled", limit?: Number): (nudges: NudgeDoc[])`
    * **effects**: Returns the user's nudges filtered by status (pending, triggered, or canceled).
  * `getReadyNudges (user: User): (nudges: NudgeDoc[])`
    * **effects**: Returns nudges whose delivery time has arrived and are not yet triggered or canceled. 