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
  * `logBefore (user: User, task: Task, emotion: Emotion): (log: Log)`
    * **requires**: A "before" log must not already exist for the same task.
    * **effects**: Adds a new log entry capturing the user's emotional state before completion.
  * `logAfter (user: User, task: Task, emotion: Emotion): (log: Log)`
    * **requires**: An "after" log must not already exist for the same task.
    * **effects**: Adds a new log entry capturing the user's emotional state after completion.
  * `deleteTaskLogs (user: User, task: Task)`
    * **effects**: Removes all logs associated with the specified task for the given user.
  * `deleteUserLogs (user: User)`
    * **effects**: Removes every emotion log associated with the given user.
  * `analyzeRecentEmotions (user: User): (analysis: String)`
    * **requires**: The user must have at least one recorded emotion log.
    * **effects**: Produces a brief AI-generated emotional summary highlighting trends and shifts.
  * `getEmotionsForTask (user: User, task: Task): (task: Task, emotions: Partial<Record<Phase, Emotion>>)`
    * **effects**: Returns both "before" and "after" emotion states associated with the given task.
  * `getEmotionLogs (user: User, page?: Number, limit?: Number, phase?: Phase, emotion?: Emotion, sortBy?: keyof LogDoc, sortOrder?: 1 | -1): (logs: LogDoc[], total: Number, page: Number, totalPages: Number)`
    * **effects**: Returns paginated and optionally filtered emotion logs.
  * `getEmotionStats (user: User): (totalLogs: Number, mostCommonEmotion: Emotion | null, leastCommonEmotion: Emotion | null, averageEmotionsPerDay: Number, recentTrend: String)`
    * **requires**: The user must have at least one recorded emotion log.
    * **effects**: Returns aggregate emotion statistics including most/least common emotions, average logs per day, and a recent emotional trend classification.
  
  