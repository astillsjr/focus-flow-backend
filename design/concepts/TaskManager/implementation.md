[@concept-design-overview](../../background/concept-design-overview.md)
[@implementing-concepts](../../background/implementing-concepts.md)
[@concept-state](../../background/detailed/concept-state.md)
[@TaskManager](TaskManager.md)

# implement: implement the TaskManager concept
# response:

The `TaskManager` concept provides a reusable, user-facing unit of functionality specifically designed for the creation, tracking, and management of individual work items or tasks.

### Purpose

The primary purpose of the `TaskManager` concept is to enable users to define, organize, monitor, and update the state and attributes of tasks from their inception to completion. It encapsulates the core logic and state necessary to manage a task's lifecycle, assignments, and temporal constraints.

### What is a `TaskManager` concept?

A `TaskManager` concept focuses solely on the essence of task management. It is not a full project management system, nor does it handle user profiles, notifications, or complex permissions directly. These broader functionalities would be achieved by composing `TaskManager` with other concepts (e.g., `Project`, `Notification`, `UserAuthentication`, `Permission`) via synchronizations.

### State

The `TaskManager` concept maintains its own independent state, which is sufficiently rich to support its behavior but no richer than necessary. Its state primarily consists of tasks and their associated attributes, as well as relationships to user identities.

*   **Objects:**
    *   **Task:** The central entity, representing a discrete unit of work.

*   **Relationships and Properties (maintained within `TaskManager`'s state):**
    *   `Task` `has_description` `String`: A detailed textual account of the work required.
    *   `Task` `has_status` `StatusEnum`: The current state of the task (e.g., `Open`, `InProgress`, `Completed`, `Blocked`, `Cancelled`).
    *   `Task` `has_dueDate` `DateTime`: The target deadline for task completion.
    *   `Task` `has_priority` `PriorityEnum`: An indicator of the task's relative importance or urgency (e.g., `Low`, `Medium`, `High`, `Urgent`).
    *   `Task` `is_assigned_to` `UserId`: The identifier of the user (or users) currently responsible for the task. (Crucially, only the user's ID is stored, not their name, email, or other personal details, which belong to other concepts like `UserProfile`).
    *   `Task` `created_by` `UserId`: The identifier of the user who initially created the task.
    *   `Task` `completed_at` `DateTime`: An optional timestamp indicating when the task was marked as `Completed`.

    The state ensures that the concept can enforce rules like preventing double assignment or tracking completion times, but it avoids extraneous information.

### Actions

`TaskManager` interacts with users and other concepts through a defined set of atomic actions, representing both user-initiated commands and spontaneous internal events.

*   **User-performed actions (corresponding to API functions/endpoints):**
    *   `createTask(creatorUserId, description, dueDate, priority)`: Initiates a new task with initial details.
    *   `updateTaskDescription(taskId, newDescription)`: Modifies the task's textual description.
    *   `updateTaskStatus(taskId, newStatus, actingUserId)`: Changes the task's lifecycle stage (e.g., from `Open` to `InProgress`, or `InProgress` to `Completed`). `actingUserId` is for potential authorization via syncs.
    *   `updateTaskDueDate(taskId, newDueDate)`: Adjusts the task's deadline.
    *   `updateTaskPriority(taskId, newPriority)`: Sets or changes the task's importance level.
    *   `assignTask(taskId, assignerUserId, assigneeUserId)`: Designates a user as responsible for a task. `assignerUserId` is for authorization.
    *   `unassignTask(taskId, unassignerUserId, assigneeUserId)`: Removes a user's assignment from a task. `unassignerUserId` is for authorization.
    *   `deleteTask(taskId, actingUserId)`: Permanently removes a task. `actingUserId` is for authorization.
    *   `getTask(taskId)`: Retrieves the current details of a specific task.
    *   `listTasks(filterCriteria)`: Retrieves a collection of tasks based on specified criteria (e.g., by assignee, status, priority, due date range).

*   **Output actions (occurring spontaneously under the concept's control):**
    *   `taskApproachingDueDate(taskId, assignedUserId, dueDate)`: Emitted by the concept when a task's due date is imminent (e.g., 24 hours away).
    *   `taskBecameOverdue(taskId, assignedUserId, dueDate)`: Emitted when a task's due date has passed without being marked `Completed`.
    *   `taskMarkedCompleted(taskId, assignedUserId, completedByUserId)`: Emitted when a task's status successfully transitions to `Completed`.
    *   `taskAssigned(taskId, assigneeUserId, assignerUserId)`: Emitted when a task is successfully assigned to a user.

### Human Behavioral Protocol

From a human user's perspective, the `TaskManager` concept models the intuitive process of managing personal or collaborative work items: "I create a to-do, describe what needs to be done, perhaps assign it to someone, track its progress, and mark it as done when finished. I might also adjust its priority or deadline."

### Concept Independence and Completeness

`TaskManager` exemplifies the key principles of concept design:
*   **Independence:** It makes no direct calls to other concepts. For example, when `taskApproachingDueDate` is emitted, `TaskManager` does not directly send an email; instead, a separate *synchronization rule* would detect this output action and then trigger an action in a `Notification` concept. Similarly, it doesn't handle user authentication or authorization; it simply accepts `userId` arguments, assuming their validity is established by syncs with `Session` or `UserAuthentication` concepts.
*   **Completeness:** All aspects of a task's properties and lifecycle management are self-contained within this concept. It doesn't rely on external concepts to store descriptions, manage statuses, or calculate due date thresholds. For instance, the logic to determine "due soon" is part of `TaskManager` itself, leading to the emission of `taskApproachingDueDate`.

### Concept Reuse and Familiarity

The `TaskManager` concept is highly reusable across a wide range of applications:
*   Managing issues in a bug tracking system.
*   Tracking feature