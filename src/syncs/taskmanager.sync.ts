/**
 * TaskManager synchronizations.
 * Handles task CRUD operations with user authentication via access tokens.
 */

import { TaskManager, UserAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ============================================================================
// CREATE TASK
// ============================================================================

export const CreateTaskRequest: Sync = ({ request, accessToken, title, description, dueDate }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/createTask", accessToken, title, description, dueDate },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const CreateTaskWithUser: Sync = ({ request, user, title, description, dueDate }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/createTask" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.createTask, { user: user.id, title, description, dueDate }]),
});

export const CreateTaskResponse: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/createTask" }, { request }],
    [TaskManager.createTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
});

export const CreateTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/createTask" }, { request }],
    [TaskManager.createTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// UPDATE TASK
// ============================================================================

export const UpdateTaskRequest: Sync = ({ request, accessToken, task, title, description, dueDate }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/updateTask", accessToken, task, title, description, dueDate },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const UpdateTaskWithUser: Sync = ({ request, user, task, title, description, dueDate }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/updateTask", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.updateTask, { user: user.id, task, title, description, dueDate }]),
});

export const UpdateTaskResponse: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/updateTask" }, { request }],
    [TaskManager.updateTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
});

export const UpdateTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/updateTask" }, { request }],
    [TaskManager.updateTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// MARK STARTED
// ============================================================================

export const MarkStartedRequest: Sync = ({ request, accessToken, task, timeStarted }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/markStarted", accessToken, task, timeStarted },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const MarkStartedWithUser: Sync = ({ request, user, task, timeStarted }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/markStarted", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.markStarted, { user: user.id, task, timeStarted }]),
});

export const MarkStartedResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/markStarted" }, { request }],
    [TaskManager.markStarted, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const MarkStartedResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/markStarted" }, { request }],
    [TaskManager.markStarted, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// MARK COMPLETE
// ============================================================================

export const MarkCompleteRequest: Sync = ({ request, accessToken, task, timeCompleted }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/markComplete", accessToken, task, timeCompleted },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const MarkCompleteWithUser: Sync = ({ request, user, task, timeCompleted }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/markComplete", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.markComplete, { user: user.id, task, timeCompleted }]),
});

export const MarkCompleteResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/markComplete" }, { request }],
    [TaskManager.markComplete, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const MarkCompleteResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/markComplete" }, { request }],
    [TaskManager.markComplete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// DELETE TASK
// ============================================================================

export const DeleteTaskRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/deleteTask", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const DeleteTaskWithUser: Sync = ({ request, user, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/deleteTask", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.deleteTask, { user: user.id, task }]),
});

export const DeleteTaskResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/deleteTask" }, { request }],
    [TaskManager.deleteTask, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const DeleteTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/deleteTask" }, { request }],
    [TaskManager.deleteTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// DELETE USER TASKS
// ============================================================================

export const DeleteUserTasksRequest: Sync = ({ request, accessToken }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/deleteUserTasks", accessToken },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const DeleteUserTasksWithUser: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/deleteUserTasks" }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.deleteUserTasks, { user: user.id }]),
});

export const DeleteUserTasksResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/deleteUserTasks" }, { request }],
    [TaskManager.deleteUserTasks, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// GET TASK
// ============================================================================

export const GetTaskRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/getTask", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetTaskWithUser: Sync = ({ request, user, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTask", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.getTask, { user: user.id, task }]),
});

export const GetTaskResponse: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTask" }, { request }],
    [TaskManager.getTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
});

export const GetTaskResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTask" }, { request }],
    [TaskManager.getTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// GET TASKS (list with pagination)
// ============================================================================

export const GetTasksRequest: Sync = ({ request, accessToken, page, limit, sortBy, sortOrder }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/getTasks", accessToken, page, limit, sortBy, sortOrder },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

export const GetTasksWithUser: Sync = ({ request, user, page, limit, sortBy, sortOrder }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTasks", page, limit, sortBy, sortOrder }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.getTasks, { user: user.id, page, limit, sortBy, sortOrder }]),
});

export const GetTasksResponse: Sync = ({ request, tasks, total, page, totalPages }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTasks" }, { request }],
    [TaskManager.getTasks, {}, { tasks, total, page, totalPages }],
  ),
  then: actions([Requesting.respond, { request, tasks, total, page, totalPages }]),
});

// ============================================================================
// GET TASK STATUS
// ============================================================================

export const GetTaskStatusRequest: Sync = ({ request, accessToken, task }) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskManager/getTaskStatus", accessToken, task },
    { request },
  ]),
  then: actions([UserAuthentication.getUserInfo, { accessToken }]),
});

// Note: getTaskStatus is a helper method that requires a TaskDoc object
// We get the task first, then calculate status from the task document
export const GetTaskStatusWithUser: Sync = ({ request, user, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTaskStatus", task }, { request }],
    [UserAuthentication.getUserInfo, {}, { user }],
  ),
  then: actions([TaskManager.getTask, { user: user.id, task }]),
});

// Calculate status from task document: "pending" | "in-progress" | "completed"
export const GetTaskStatusResponse: Sync = ({ request, task, status }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTaskStatus" }, { request }],
    [TaskManager.getTask, {}, { task }],
  ),
  where: async (frames) => {
    // Compute status from task properties
    // task is a symbol variable, and frame[task] gives us the task document
    return frames.map((frame) => {
      const taskDoc = frame[task] as { completedAt?: Date; startedAt?: Date } | undefined;
      if (!taskDoc) return frame;
      const computedStatus = taskDoc.completedAt 
        ? "completed" 
        : (taskDoc.startedAt ? "in-progress" : "pending");
      return { ...frame, [status]: computedStatus };
    });
  },
  then: actions([Requesting.respond, { request, status }]),
});

export const GetTaskStatusResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskManager/getTaskStatus" }, { request }],
    [TaskManager.getTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

