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
  * `createTask (user: User, title: String, description: String, dueDate?: Date): (task: Task)`
    * **requires**: The title must be unique and non-empty. If provided, the due date must be in the future.
    * **effects**: Inserts a new task record for the user and returns its ID.
  * `updateTask (user: User, task: Task, title?: String, description?: String, dueDate?: Date): (task: Task)`
    * **requires**: The task must exist and belong to the user. Updated fields must follow the same validation rules as task creation.
    * **effects**: Modifies the specified fields of the task.
  * `markStarted (user: User, task: Task, timeStarted: Date)`
    * **requires**: The task must belong to the user. The task must not already be started. The provided start time must be in the past.
    * **effects**: Sets the task's `startedAt` field to the provided time.
  * `markComplete (user: User, task: Task, timeCompleted: Date)`
    * **requires**: The task must belong to the user. The task must not already be completed. The provided completion time must be in the past.
    * **effects**: Sets the task's `completedAt` field to the provided time.
  * `deleteTask (user: User, task: Task)`
    * **requires**: The task must belong to the user.
    * **effects**: Removes the specified task from the user's records.
  * `deleteUserTasks (user: User)`
    * **effects**: Removes every task associated with the user.
  * `getTask (user: User, task: Task): (task: TaskDoc)`
    * **requires**: The task must exist and belong to the user.
    * **effects**: Returns the corresponding task document.
  * `getTasks (user: User, page?: Number, limit?: Number, status?: TaskStatus, search?: String, sortBy?: keyof TaskDoc, sortOrder?: 1 | -1): (tasks: TaskDoc[], total: Number, page: Number, totalPages: Number)`
    * **effects**: Returns tasks matching the provided filters and pagination parameters.
  * `getTaskStatus (task: TaskDoc): (status: TaskStatus)`
    * **effects**: Returns `"pending"`, `"in-progress"`, or `"completed"` based on task state.