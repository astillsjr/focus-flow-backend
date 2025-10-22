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
  * `deleteUserLogs (user: User)`
    * **effects**: Removes all emotion logs logged by the specified user.
  * `viewEmotionTrends (user: User): (trends: Trends)`
    * **requires**: The user has at least one log.
    * **effects**: Returns summary statistics of logs.
  * `analyzeRecentEmotions (user: User): (analysis: string)`
    * **requires**: The user has at least one log.
    * **effects**: Creates a short summary analyzing the users recent emotional states.
  * `_getUserLogs (user: User, limit: number): (logs: Log[])`
    * **effects**: Returns the user logs. 
  * `_getLogsForTask (user: User, task: Task): (logs: Log[])`
    * **effects**: Returns the user's logs for the task.
  * `_getEmotionsForTask (user: User, task: Task): (task: Task, emotions: Emotions)`
    * **effects**: Returns the user's emotions on the task.
  
  