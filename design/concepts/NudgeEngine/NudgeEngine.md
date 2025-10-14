# concept: NudgeEngine

* **concept**: NudgeEngine \[User, Task]
* **purpose**: To encourage users to begin tasks through timely, low-pressure prompts.
* **principle**: If a user schedules or receives a nudge for a task, then at the appointed time (or context trigger), the app reminds them to start small, making initiation easier and more frequent.
* **state**:
  * A set of `Nudges` with
    * a `user` of type `User`
    * a `task` of type `Task`
    * a `deliveryTime` of type `DateTime`
    * a `triggered` of type `Boolean`
    * an `acknowledged` of type `Boolean`
* **actions**:
  * `scheduleNudge (user: User, task: Task, deliveryTime: DateTime)`
    * **requires**: The task belongs to the user. The deliveryTime has not already passed.
    * **effects**: Creates a new nudge for the user and task with the specified deliveryTime.
  * `system nudgeUser (): (nudge: Nudge)`
    * **requires**: The current time has exceeded the `deliveryTime` of a nudge.
    * **effects**: Sends a nudge notification to user. Sets `triggered` := true.
  * `acknowledgeNudge (nudge: Nudge)`
    * **requires**: The nudge must already have been triggered. 
    * **effects**: Sets `acknowledged` := true. 
  * `cancelNudge (user: User, task: Task)`
    * **requires**: A nudge must exist for the given user-task pair. The nudge must not have already been triggered.
    * **effects**: Removes the nudge from the set of nudges.
  * `deleteUserNudges (user: User)`
    * **effects**: Removes all nudges targeted at the specified user.  