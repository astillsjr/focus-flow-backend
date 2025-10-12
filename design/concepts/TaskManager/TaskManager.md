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
    * **requires**: `title` is not empty. The `dueDate` has not already passed. 
    * **effects**: Creates a new task associated with `user`, and sets `completed` := false and `createdAt` := current time. 
  * `updateTask (user: User, task: Task, title?: String, description?: String, dueDate?: Date): (task: Task)`
    * **requires**: `task` belongs to `user`.
    * **effects**: Updates specified fields of `task`.
  * `markStarted (user: User, task: Task)`
    * **requires**: `task` belongs to user. `task` must have no `startedAt` value.
    * **effects**: Sets `startedAt` := current time for `task`.
  * `markComplete (user: User, task: Task)`
    * **requires**: `task` belongs to user. `task` must have `completed` = false.
    * **effects**: Sets `completed` := true for `task`.
  * `deleteTask (user: User, task: Task)`
    * **requires**: `task` belongs to `user`.
    * **effects**: Removes `task` from `user`'s task list.
  * `viewTasks (user: User): (tasks: Task[])`
    * **effects**: Returns list of all tasks for `user`.