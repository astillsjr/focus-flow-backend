# concept: TaskManager

* **concept**: TaskManager \[User]
* **purpose**: To create, organize, and update the tasks intended to be complete.
* **principle**: If a user creates and maintains a list of tasks with details such as title, description, and deadlines, then the app can use this information to schedule nudges, place bets, and log emotions.
* **state**:
  * A set of `Tasks` with
    * a `user` of type `User`
    * a `title` of type `String`
    * a `description` of type `String`
    * a `createdAt` of type `Date`
    * a `startedAt?` of type `Date`
    * a `completedAt?` of type `Date`
    * a `dueDate?` of type `Date`
    
* **actions**:
  * `createTask (user: User, title: String, description: String, dueDate?: Date): (task: TaskId)`
    * **requires**: The title is unique and nonempty.  The due date is after the current time. 
    * **effects**: Creates a new task for the user. 
  * `updateTask (user: User, task: TaskId, title?: String, description?: String, dueDate?: Date): (task: TaskId)`
    * **requires**: The task exists and belongs to the user. Field updates follow task creation restrictions.
    * **effects**: Updates the fields of the task.
  * `markStarted (user: User, task: TaskId, timeStarted: Date)`
    * **requires**: The task belongs to the user. The task has not already been started. The start time of the task has already passed.
    * **effects**: Marks the task as started.
  * `markComplete (user: User, task: TaskId)`
    * **requires**: The task belongs to the user. The task has not already been marked completed. The completion time of the task has passed.
    * **effects**: Marks the task as complete.
  * `deleteTask (user: User, task: TaskId)`
    * **requires**: The task belongs to the user.
    * **effects**: Removes the task from the user's task list.
  * `deleteUserTasks (user: User)`
    * **effects**: Removes all tasks created by user.
  * `_getTaskById (user: User, task: TaskId): (task: Task)`
    * **requires**: The task belongs to the user.
    * **effects**: Returns the task.
  * `_getUserTasks (user: User, limit?: Number, skip?: Number, sortBy?: keyof Task, sortOrder?: 1 | -1, status?: String, query?: String, dueBefore?: Date, dueAfter?: Date): (tasks: Task[])`
    * **effects**: Fetches all tasks that satify the constraints.
  * `_getTaskStatus (task: Task): (status: String)`
    * **effects**: Returns the status of a task.