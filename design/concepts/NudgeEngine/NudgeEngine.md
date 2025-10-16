# concept: NudgeEngine

* **concept**: NudgeEngine \[User, Task]
* **purpose**: To encourage users to begin tasks through timely, low-pressure prompts.
* **principle**: If a user schedules or receives a nudge for a task, then at the appointed time (or context trigger), the app reminds them to start small, making initiation easier and more frequent.
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
    * **effects**: Sends a notification to the user. Marks the nudge as triggered. 