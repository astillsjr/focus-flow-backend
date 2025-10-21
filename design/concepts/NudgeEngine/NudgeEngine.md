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
* **actions**:
  * `scheduleNudge (user: User, task: Task, deliveryTime: DateTime)`
    * **requires**: AA nudge for this task does not already exist. The delivery time has not already passed.
    * **effects**: Creates a new nudge for the task with the specified delivery time.
  * `cancelNudge (user: User, task: Task)`
    * **requires**: The nudge must exist and not have already been triggered or canceled.
    * **effects**: Marks the nudge as canceled.
  * `deleteUserNudges (user: User)`
    * **effects**: Removes all nudges targeted at the specified user.
  * `system nudgeUser (): (nudge: Nudge)`
    * **requires**: The current time has exceeded the delivery time of a nudge.
    * **effects**: Generate a motivational message for the user. Marks the nudge as triggered. 

  Add query for getting the nudge based on user and task so you can check when a user marks a task as started if the nudge needs to be canceled. _getNudgeForTask()...