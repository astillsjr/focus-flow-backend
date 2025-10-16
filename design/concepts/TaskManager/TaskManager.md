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
    * **requires**: The title is unique and nonempty.  The due date is after the current time. 
    * **effects**: Creates a new task for the user. 
  * `updateTask (user: User, task: Task, title?: String, description?: String, dueDate?: Date): (task: Task)`
    * **requires**: The task exists and belongs to user.
    * **effects**: Updates the fields of the task.
  * `markStarted (user: User, task: Task, timeStarted: Date)`
    * **requires**: The task belongs to the user. The task has not already been started. The start time of the task is prior to the current time.
    * **effects**: Marks the task as started at the provided start time.
  * `markComplete (user: User, task: Task)`
    * **requires**: The task belongs to the user. The task has not already been completed. The complete time of the task is prior to the current time.
    * **effects**: Marks the task as completed at the provided completion time.
  * `deleteTask (user: User, task: Task)`
    * **requires**: The task belongs to the user.
    * **effects**: Removes the task from the user's task list.
  * `deleteUserTasks (user: User)`
    * **effects**: Removes all tasks created by the specified user.
* **queries**:
  * `getUserTasks (user: User): (tasks: Task[])`
    * **effects**: Fetches all tasks for a specific user.