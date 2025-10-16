# concept: EmotionLogger

* **concept**: EmotionLogger \[User, Task]
* **purpose**: To help users recognize and reframe unhelpful emotional patterns around task initiation.
* **principle**: If users log how they feel before and after starting a task, they can visualize emotional shifts and learn that tasks often feel easier once begun.
* **state**:
  * A set of `Logs` with
    * a `user` of type `User`
    * a `task` of type `Task`
    * a `phase` of type `Phase` ("before"|"after")
    * an `emotion` Enum(“dreading”, “anxious”, “neutral”, “motivated”, etc.)
* **actions**:
  * `logEmotion (user: User, task: Task, phase: Phase, emotion: Emotion): (log: Log)`
    * **effects**: Adds a new log entry for the user-task pair for that phase.
  * `deleteTaskLogs (user: User, task: Task)`
    * **requires**: The log for the user-task pair exists.
    * **effects**: Removes the log from the users logs.
  * `viewEmotionTrends (user: User): (trends: Data)`
    * **effects**: Returns summary statistics or visual data of emotional shifts.
  * `deleteUserLogs (user: User)`
    * **effects**: Removes all emotion logs logged by the specified user.