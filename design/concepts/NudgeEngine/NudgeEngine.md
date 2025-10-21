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
  * `scheduleNudge (user: User, task: Task, deliveryTime: DateTime): (nudge: NudgeId)`
    * **requires**: A nudge for this task does not already exist. The delivery time has not already passed.
    * **effects**: Creates a new nudge for the task with the specified delivery time.
  * `cancelNudge (user: User, task: Task)`
    * **requires**: The nudge must exist and not have already been triggered or canceled.
    * **effects**: Marks the nudge as canceled.
  * `deleteUserNudges (user: User)`
    * **effects**: Removes all nudges targeted at the specified user.
  * `nudgeUser (user: User, task: Task, title: String, description: String, recentEmotions: Emotion[]): (message: string, nudge: NudgeId)`
    * **requires**: The current time has exceeded the delivery time of a nudge. The nudge has not been canceled or already triggered.
    * **effects**: Generate a motivational message for the user. Marks the nudge as triggered.
  * `_getNudgeForTask (user: User, task: Task): (nudge: Nudge)`
    * **requires**: The current time has exceeded the delivery time of a nudge. The nudge has not been canceled or already triggered.
    * **effects**: Generate a motivational message for the user. Marks the nudge as triggered. 