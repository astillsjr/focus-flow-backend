# API Specification: FocusFlow Backend

This document provides comprehensive API documentation for all concepts in the FocusFlow application.

**Base URL:** `/api`

**HTTP Method:** All endpoints use `POST`

**Content Type:** `application/json`

---

## UserAuthentication Concept

**Purpose:** To authenticate users so that each person's data is securely associated with their identity and protected from unauthorized access.

---

### POST /api/UserAuthentication/register

**Description:** Register a new user.

**Requirements:**
- The provided email and username must not already exist.
- The email must be in valid format.

**Effects:**
- Creates a new user record with a hashed password and returns a new pair of session tokens.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

**Success Response Body:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/login

**Description:** Logs in an existing user.

**Requirements:**
- The provided username and password must match an existing user account.

**Effects:**
- Returns a new pair of access and refresh tokens for the authenticated user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/logout

**Description:** Logs out a user.

**Requirements:**
- A valid refresh token must be provided.

**Effects:**
- Invalidates the user's current refresh token, ending their session.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/changePassword

**Description:** Changes a user's password.

**Requirements:**
- A valid access token must be provided.
- The old password must match the user's current password.

**Effects:**
- Updates the user's stored password hash to the new password.

**Request Body:**
```json
{
  "accessToken": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/deleteAccount

**Description:** Deletes a user's account.

**Requirements:**
- A valid access token must be provided.
- The provided password must match the user's current password.

**Effects:**
- Permanently removes the user's account.

**Request Body:**
```json
{
  "accessToken": "string",
  "password": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/refreshAccessToken

**Description:** Refreshes a user's access token.

**Requirements:**
- A valid and active refresh token must be provided.

**Effects:**
- Generates and returns a new short-lived access token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Success Response Body:**
```json
{
  "accessToken": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/getUserInfo

**Description:** Fetches the authenticated user's information.

**Requirements:**
- A valid access token must be provided.

**Effects:**
- Returns the user's ID, username, and email address.

**Request Body:**
```json
{
  "accessToken": "string"
}
```

**Success Response Body:**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## TaskManager Concept

**Purpose:** To create, organize, and update the tasks intended to be complete.

---

### POST /api/TaskManager/createTask

**Description:** Creates a new task for the specified user.

**Requirements:**
- The title must be unique and non-empty.
- If provided, the due date must be in the future.

**Effects:**
- Inserts a new task record for the user and returns its ID.

**Request Body:**
```json
{
  "user": "string",
  "title": "string",
  "description": "string (optional)",
  "dueDate": "Date (optional)"
}
```

**Success Response Body:**
```json
{
  "task": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/TaskManager/updateTask

**Description:** Updates the details of an existing task.

**Requirements:**
- The task must exist and belong to the user.
- Updated fields must follow the same validation rules as task creation.

**Effects:**
- Modifies the specified fields of the task.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "title": "string (optional)",
  "description": "string (optional)",
  "dueDate": "Date (optional)"
}
```

**Success Response Body:**
```json
{
  "task": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/TaskManager/markStarted

**Description:** Marks a task as started.

**Requirements:**
- The task must belong to the user.
- The task must not already be started.
- The provided start time must be in the past.

**Effects:**
- Sets the task's `startedAt` field to the provided time.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "timeStarted": "Date"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/TaskManager/markComplete

**Description:** Marks a task as completed.

**Requirements:**
- The task must belong to the user.
- The task must not already be completed.
- The provided completion time must be in the past.

**Effects:**
- Sets the task's `completedAt` field to the provided time.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "timeCompleted": "Date"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/TaskManager/deleteTask

**Description:** Deletes a single task.

**Requirements:**
- The task must belong to the user.

**Effects:**
- Removes the specified task from the user's records.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/TaskManager/deleteUserTasks

**Description:** Deletes all tasks for a given user.

**Effects:**
- Removes every task associated with the user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{}
```

---

### POST /api/TaskManager/getTask

**Description:** Retrieves a single task by its ID.

**Requirements:**
- The task must exist and belong to the user.

**Effects:**
- Returns the corresponding task document.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{
  "_id": "string",
  "user": "string",
  "title": "string",
  "description": "string",
  "createdAt": "Date",
  "startedAt": "Date (optional)",
  "completedAt": "Date (optional)",
  "dueDate": "Date (optional)"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/TaskManager/getTasks

**Description:** Retrieves a paginated and optionally filtered list of tasks.

**Effects:**
- Returns tasks matching the provided filters and pagination parameters.

**Request Body:**
```json
{
  "user": "string",
  "page": "number (optional, default: 1)",
  "limit": "number (optional, default: 10)",
  "status": "string (optional: 'pending' | 'in-progress' | 'completed')",
  "search": "string (optional)",
  "sortBy": "string (optional, default: 'createdAt')",
  "sortOrder": "number (optional: 1 | -1, default: -1)"
}
```

**Success Response Body:**
```json
{
  "tasks": [
    {
      "_id": "string",
      "user": "string",
      "title": "string",
      "description": "string",
      "createdAt": "Date",
      "startedAt": "Date (optional)",
      "completedAt": "Date (optional)",
      "dueDate": "Date (optional)"
    }
  ],
  "total": "number",
  "page": "number",
  "totalPages": "number"
}
```

---

### POST /api/TaskManager/getTaskStatus

**Description:** Determines the current status of a task.

**Effects:**
- Returns `"pending"`, `"in-progress"`, or `"completed"` based on task state.

**Request Body:**
```json
{
  "_id": "string",
  "user": "string",
  "title": "string",
  "description": "string",
  "createdAt": "Date",
  "startedAt": "Date (optional)",
  "completedAt": "Date (optional)",
  "dueDate": "Date (optional)"
}
```

**Success Response Body:**
```json
{
  "status": "string ('pending' | 'in-progress' | 'completed')"
}
```

---

## NudgeEngine Concept

**Purpose:** To generate personalized, context-aware motivational nudges using AI, leveraging task details and user emotion history.

---

### POST /api/NudgeEngine/scheduleNudge

**Description:** Schedules a new nudge for a task.

**Requirements:**
- No existing nudge must exist for the same task.
- The delivery time must be in the future.

**Effects:**
- Creates a new nudge record associated with the task and user.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "deliveryTime": "Date"
}
```

**Success Response Body:**
```json
{
  "nudge": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/NudgeEngine/cancelNudge

**Description:** Cancels a scheduled nudge.

**Requirements:**
- The nudge must exist and must not already be triggered.

**Effects:**
- Deletes the nudge from the database, preventing future delivery.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/NudgeEngine/deleteUserNudges

**Description:** Deletes all nudges associated with a user.

**Effects:**
- Removes every nudge targeted at the specified user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{}
```

---

### POST /api/NudgeEngine/nudgeUser

**Description:** Sends a motivational nudge to a user.

**Requirements:**
- The current time must be later than the nudge's delivery time.
- The nudge must not already be triggered.

**Effects:**
- Generates a motivational message using the AI model and marks the nudge as triggered.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "title": "string",
  "description": "string",
  "recentEmotions": ["string"]
}
```

**Success Response Body:**
```json
{
  "message": "string",
  "nudge": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/NudgeEngine/getNudge

**Description:** Retrieves a specific nudge for a given task.

**Requirements:**
- A nudge must exist for the specified user and task.

**Effects:**
- Returns the matching nudge document.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{
  "_id": "string",
  "user": "string",
  "task": "string",
  "deliveryTime": "Date",
  "triggered": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/NudgeEngine/getUserNudges

**Description:** Retrieves all nudges for a user with optional filtering.

**Effects:**
- Returns the user's nudges filtered by status (pending or triggered).

**Request Body:**
```json
{
  "user": "string",
  "status": "string (optional: 'pending' | 'triggered')",
  "limit": "number (optional, default: 50)"
}
```

**Success Response Body:**
```json
[
  {
    "_id": "string",
    "user": "string",
    "task": "string",
    "deliveryTime": "Date",
    "triggered": "boolean"
  }
]
```

---

### POST /api/NudgeEngine/getReadyNudges

**Description:** Retrieves all ready-to-deliver nudges for a user.

**Effects:**
- Returns nudges whose delivery time has arrived and are not yet triggered.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
[
  {
    "_id": "string",
    "user": "string",
    "task": "string",
    "deliveryTime": "Date",
    "triggered": "boolean"
  }
]
```

---

## MicroBet Concept

**Purpose:** To motivate users to start tasks through gamified accountability using symbolic or real stakes.

---

### POST /api/MicroBet/initializeBettor

**Description:** Initializes a user in the betting system.

**Requirements:**
- The user must not already be registered as a bettor.

**Effects:**
- Creates a new betting profile for the user with 100 points and a streak of 0.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/removeBettor

**Description:** Removes a user and their bets from the system.

**Effects:**
- Deletes the user's profile and all bets placed by them.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{}
```

---

### POST /api/MicroBet/placeBet

**Description:** Places a new bet on a task.

**Requirements:**
- The user must have a betting profile.
- No existing bet must exist for the same task.
- The user must have at least `wager` points.
- The bet deadline must be in the future.
- If provided, the bet deadline must be before the task due date.

**Effects:**
- Creates a bet on the task and deducts the wager amount from the user's points.
- The task due date is stored for reward calculation with time bonus.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "wager": "number",
  "deadline": "Date",
  "taskDueDate": "Date (optional)"
}
```

**Success Response Body:**
```json
{
  "bet": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/cancelBet

**Description:** Cancels an existing bet.

**Requirements:**
- The user must have a betting profile.
- The bet must exist and belong to the user.

**Effects:**
- Deletes the bet. If the bet is unresolved, refunds the wagered points to the user.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/resolveBet

**Description:** Resolves a bet when a task is completed.

**Requirements:**
- The user must have a betting profile.
- The bet must exist and belong to the user.
- The completion time must not exceed the deadline.

**Effects:**
- If unresolved, marks the bet as successful, awards a calculated reward (based on wager, streak, and time bonus) to the user, and increments their streak. Otherwise, reports that the bet was already resolved.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "completionTime": "Date"
}
```

**Success Response Body:**
```json
{
  "status": "string ('already_resolved' | 'success')",
  "reward": "number (optional)"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/resolveExpiredBet

**Description:** Resolves a bet that has passed its deadline.

**Requirements:**
- The user must have a betting profile.
- The bet must exist and belong to the user.
- The deadline must have already passed.

**Effects:**
- If unresolved, marks the bet as failed and resets the user's streak. Otherwise, reports that the bet was already resolved.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{
  "status": "string (optional: 'already_resolved')"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/getBet

**Description:** Retrieves a specific bet for a user.

**Requirements:**
- The user must have a betting profile, and a bet must exist for the task.

**Effects:**
- Returns the corresponding bet document.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{
  "_id": "string",
  "user": "string",
  "task": "string",
  "wager": "number",
  "deadline": "Date",
  "taskDueDate": "Date (optional)",
  "success": "boolean (optional)",
  "createdAt": "Date"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/getActiveBets

**Description:** Retrieves all active (unresolved) bets for a user.

**Requirements:**
- The user must have a betting profile.

**Effects:**
- Returns all bets that are still active and unresolved.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
[
  {
    "_id": "string",
    "user": "string",
    "task": "string",
    "wager": "number",
    "deadline": "Date",
    "taskDueDate": "Date (optional)",
    "success": "boolean (optional)",
    "createdAt": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/getExpiredBets

**Description:** Retrieves all expired (unresolved and past-deadline) bets for a user.

**Requirements:**
- The user must have a betting profile.

**Effects:**
- Returns bets that have passed their deadlines but have not been resolved.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
[
  {
    "_id": "string",
    "user": "string",
    "task": "string",
    "wager": "number",
    "deadline": "Date",
    "taskDueDate": "Date (optional)",
    "success": "boolean (optional)",
    "createdAt": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/getUserProfile

**Description:** Retrieves the user's overall betting profile and statistics.

**Requirements:**
- The user must have a betting profile.

**Effects:**
- Returns aggregated statistics on points, streak, and bet outcomes.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{
  "points": "number",
  "streak": "number",
  "totalBets": "number",
  "successfulBets": "number",
  "failedBets": "number",
  "pendingBets": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/MicroBet/getRecentActivity

**Description:** Retrieves recent betting activity for a user.

**Requirements:**
- The user must have a betting profile.

**Effects:**
- Returns the user's most recent bets, sorted by creation time.

**Request Body:**
```json
{
  "user": "string",
  "limit": "number (optional, default: 10)"
}
```

**Success Response Body:**
```json
[
  {
    "_id": "string",
    "user": "string",
    "task": "string",
    "wager": "number",
    "deadline": "Date",
    "taskDueDate": "Date (optional)",
    "success": "boolean (optional)",
    "createdAt": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## EmotionLogger Concept

**Purpose:** To help users recognize and reframe unhelpful emotional patterns around task initiation.

---

### POST /api/EmotionLogger/logBefore

**Description:** Logs an emotion for a task before it is completed.

**Requirements:**
- A "before" log must not already exist for the same task.

**Effects:**
- Adds a new log entry capturing the user's emotional state before completion.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "emotion": "string"
}
```

**Success Response Body:**
```json
{
  "log": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/EmotionLogger/logAfter

**Description:** Logs an emotion for a task after it is completed.

**Requirements:**
- An "after" log must not already exist for the same task.

**Effects:**
- Adds a new log entry capturing the user's emotional state after completion.

**Request Body:**
```json
{
  "user": "string",
  "task": "string",
  "emotion": "string"
}
```

**Success Response Body:**
```json
{
  "log": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/EmotionLogger/deleteTaskLogs

**Description:** Deletes all emotion logs for a specific task.

**Effects:**
- Removes all logs associated with the specified task for the given user.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{}
```

---

### POST /api/EmotionLogger/deleteUserLogs

**Description:** Deletes all emotion logs for a specific user.

**Effects:**
- Removes every emotion log associated with the given user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{}
```

---

### POST /api/EmotionLogger/analyzeRecentEmotions

**Description:** Generates a reflection analyzing the user's recent emotional patterns.

**Requirements:**
- The user must have at least one recorded emotion log.

**Effects:**
- Produces a brief AI-generated emotional summary highlighting trends and shifts.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{
  "analysis": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/EmotionLogger/getEmotionsForTask

**Description:** Retrieves all logged emotions for a specific task.

**Effects:**
- Returns both "before" and "after" emotion states associated with the given task.

**Request Body:**
```json
{
  "user": "string",
  "task": "string"
}
```

**Success Response Body:**
```json
{
  "task": "string",
  "emotions": {
    "before": "string (optional)",
    "after": "string (optional)"
  }
}
```

---

### POST /api/EmotionLogger/getEmotionLogs

**Description:** Retrieves emotion logs with pagination and filtering.

**Effects:**
- Returns paginated and optionally filtered emotion logs.

**Request Body:**
```json
{
  "user": "string",
  "page": "number (optional, default: 1)",
  "limit": "number (optional, default: 20)",
  "phase": "string (optional: 'before' | 'after')",
  "emotion": "string (optional)",
  "sortBy": "string (optional, default: 'createdAt')",
  "sortOrder": "number (optional: 1 | -1, default: -1)"
}
```

**Success Response Body:**
```json
{
  "logs": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "phase": "string ('before' | 'after')",
      "emotion": "string",
      "createdAt": "Date"
    }
  ],
  "total": "number",
  "page": "number",
  "totalPages": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/EmotionLogger/getEmotionStats

**Description:** Computes overall emotion statistics for a user.

**Requirements:**
- The user must have at least one recorded emotion log.

**Effects:**
- Returns aggregate emotion statistics including most/least common emotions, average logs per day, and a recent emotional trend classification.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body:**
```json
{
  "totalLogs": "number",
  "mostCommonEmotion": "string (or null)",
  "leastCommonEmotion": "string (or null)",
  "averageEmotionsPerDay": "number",
  "recentTrend": "string ('improving' | 'declining' | 'stable' | 'insufficient_data')"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## Notes

- All Date fields should be sent as ISO 8601 formatted strings (e.g., `"2023-10-15T14:30:00Z"`).
- All ID fields (user, task, bet, nudge, log) are strings.
- Optional fields can be omitted from request bodies.
- Array responses indicate query methods (methods that retrieve lists of data).
- Single object responses indicate action methods (methods that perform operations).

