# concept: EmotionLogger

* **concept**: EmotionLogger \[User, Task]
* **purpose**: To help users recognize and reframe unhelpful emotional patterns around task initiation.
* **principle**: If users log how they feel before and after starting a task, they can visualize emotional shifts and learn that tasks often feel easier once begun.
* **state**:
  * A set of `Logs` with
    * a `user` of type `User`
    * a `task` of type `Task`
    * a `phase` of type `Phase` ("before"|"after")
    * a `emotion` of type `Emotion` (“dreading”, “anxious”, “neutral”, “motivated”, etc.)
    * a `createdAt` of type `Date`
* **actions**:
  * `logBefore (user: User, task: Task, phase: Phase, emotion: Emotion): (log: Log)`
    * **requires**: A log does not already exist for the task before it was complete.
    * **effects**: Adds a new log entry for the task before it was complete.
  * `logEmotion (user: User, task: Task, phase: Phase, emotion: Emotion): (log: Log)`
    * **requires**: A log does not already exist for the task after it was complete.
    * **effects**: Adds a new log entry for the task after it was complete.
  * `deleteTaskLogs (user: User, task: Task)`
    * **effects**: Removes the log from the users logs.
  * `viewEmotionTrends (user: User): (trends: string)`
    * **requires**: The user exists.
    * **effects**: Returns summary statistics or visual data of emotional shifts.
  * `deleteUserLogs (user: User)`
    * **effects**: Removes all emotion logs logged by the specified user.