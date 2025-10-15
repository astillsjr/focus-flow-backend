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
    * a `dueDate?` of type `Date`
    * a `completed` of type `Boolean`
* **actions**:
  * `createTask (user: User, title: String, description: String, dueDate?: Date): (task: Task)`
    * **requires**: The title is not empty. The `dueDate` has not already passed. 
    * **effects**: Creates a new task associated with user, and sets `completed` := false and `createdAt` := current time. 
  * `updateTask (user: User, task: Task, title?: String, description?: String, dueDate?: Date): (task: Task)`
    * **requires**: The task exists and belongs to user.
    * **effects**: Updates the fields of the task.
  * `markStarted (user: User, task: Task)`
    * **requires**: The task belongs to user. The task must have `startedAt` = null.
    * **effects**: Sets `startedAt` := current time for the task.
  * `markComplete (user: User, task: Task)`
    * **requires**: The task belongs to user. The task must have `completed` = false.
    * **effects**: Sets `completed` := true for the task.
  * `deleteTask (user: User, task: Task)`
    * **requires**: The task belongs to the user.
    * **effects**: Removes the task from the user's task list.
  * `deleteUserTasks (user: User)`
    * **effects**: Removes alls tasks created by the specified user.
* **queries**:
  * `getUserTasks (user: User): (tasks: Task[])`
    * **effects**: Returns a list of all tasks for the user.