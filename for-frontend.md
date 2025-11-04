# API Endpoints - Implemented Syncs

This document lists all API endpoints that have been implemented with syncs in the backend. All endpoints require authentication via `accessToken` in the request body (except for login/register which are handled separately).

## Authentication

### `POST /UserAuthentication/getUserInfo`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /UserAuthentication/logout`
**Request:**
```json
{
  "refreshToken": "string"
}
```
**Response:** `{}` (empty object)

### `POST /UserAuthentication/refreshAccessToken`
**Request:**
```json
{
  "refreshToken": "string"
}
```
**Response:**
```json
{
  "accessToken": "string"
}
```

### `POST /UserAuthentication/changePassword`
**Request:**
```json
{
  "accessToken": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```
**Response:** `{}` (empty object)

### `POST /UserAuthentication/deleteAccount`
**Request:**
```json
{
  "accessToken": "string",
  "password": "string"
}
```
**Response:** `{}` (empty object)
**Note:** Automatically cascades deletion of all user data (tasks, emotion logs, nudges, bettor profile).

---

## TaskManager

### `POST /TaskManager/createTask`
**Request:**
```json
{
  "accessToken": "string",
  "title": "string",
  "description": "string",
  "dueDate": "string (ISO date) | null"
}
```
**Note:** `dueDate` must be `null` if not present, not omitted. Backend automatically converts ISO date strings to Date objects.
**Response:**
```json
{
  "task": "string (task ID)"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```
**Note:** Automatically schedules a nudge when task is created.

### `POST /TaskManager/updateTask`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "title": "string | null",
  "description": "string | null",
  "dueDate": "string (ISO date) | null"
}
```
**Note:** All optional parameters (`title`, `description`, `dueDate`) must be `null` if not being updated, not omitted. Backend automatically converts ISO date strings to Date objects.
**Response:**
```json
{
  "task": "string (task ID)"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /TaskManager/markStarted`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "timeStarted": "string (ISO date)"
}
```
**Response:** `{}` (empty object)
**Note:** Automatically resolves any associated bet and cancels any scheduled nudge.

### `POST /TaskManager/markComplete`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "timeCompleted": "string (ISO date)"
}
```
**Response:** `{}` (empty object)
**Note:** Automatically resolves any associated bet and cancels any scheduled nudge.

### `POST /TaskManager/deleteTask`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:** `{}` (empty object)
**Note:** Automatically cascades deletion of associated bet, nudge, and emotion logs.

### `POST /TaskManager/deleteUserTasks`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:** `{}` (empty object)

### `POST /TaskManager/getTask`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:**
```json
{
  "task": {
    "_id": "string",
    "user": "string",
    "title": "string",
    "description": "string",
    "createdAt": "Date",
    "dueDate": "Date | null",
    "startedAt": "Date | null",
    "completedAt": "Date | null"
  }
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /TaskManager/getTasks`
**Request:**
```json
{
  "accessToken": "string",
  "page": "number | null (optional, default: 1)",
  "limit": "number | null (optional, default: 10)",
  "sortBy": "string | null (optional, default: 'createdAt')",
  "sortOrder": "number | null (optional, default: -1)",
  "status": "string | null (optional, 'pending' | 'in-progress' | 'completed')",
  "search": "string | null (optional, text search query)"
}
```
**Note:** All optional parameters must be sent. Use `null` for unused parameters (not omitted). When `null` is sent:
- For `page`, `limit`, `sortBy`, `sortOrder`: The backend will use the default values shown above.
- For `status` and `search`: The backend will ignore the filter (no filtering applied).
**Response:**
```json
{
  "tasks": [
    {
      "_id": "string",
      "user": "string",
      "title": "string",
      "description": "string",
      "createdAt": "Date",
      "dueDate": "Date | null",
      "startedAt": "Date | null",
      "completedAt": "Date | null"
    }
  ],
  "total": "number",
  "page": "number",
  "totalPages": "number"
}
```

### `POST /TaskManager/getTaskStatus`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:**
```json
{
  "status": "pending" | "in-progress" | "completed"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

---

## MicroBet

### `POST /MicroBet/initializeBettor`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:** `{}` (empty object)
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /MicroBet/removeBettor`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:** `{}` (empty object)

### `POST /MicroBet/placeBet`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "wager": "number",
  "deadline": "string (ISO date)",
  "taskDueDate": "string (ISO date) | null"
}
```
**Note:** Backend automatically converts ISO date strings to Date objects for both `deadline` and `taskDueDate`.
**Response:**
```json
{
  "bet": "string (bet ID)"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /MicroBet/cancelBet`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:** `{}` (empty object)
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /MicroBet/getBet`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:**
```json
{
  "bet": {
    "_id": "string",
    "user": "string",
    "task": "string",
    "wager": "number",
    "deadline": "Date",
    "taskDueDate": "Date | null",
    "success": "boolean | undefined",
    "createdAt": "Date"
  }
}
```
**Note:** `success === undefined` means the bet is pending, `success === true` means successful, `success === false` means failed.
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /MicroBet/getActiveBets`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
```json
{
  "bets": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "wager": "number",
      "deadline": "Date",
      "taskDueDate": "Date | null",
      "success": "boolean | undefined",
      "createdAt": "Date"
    }
  ]
}
```
**Note:** Only returns bets where `success === undefined` (pending).

### `POST /MicroBet/getExpiredBets`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
```json
{
  "bets": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "wager": "number",
      "deadline": "Date",
      "taskDueDate": "Date | null",
      "success": "boolean | undefined",
      "createdAt": "Date"
    }
  ]
}
```
**Note:** Returns bets where `success === undefined` (unresolved) and deadline has passed. These are pending bets that have expired their deadline.

### `POST /MicroBet/getUserProfile`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
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

### `POST /MicroBet/getRecentActivity`
**Request:**
```json
{
  "accessToken": "string",
  "limit": "number | null (optional, default: 10)"
}
```
**Note:** All optional parameters must be sent. Use `null` for unused parameters (not omitted). When `null` is sent for `limit`, the backend will use the default value of 10.
**Response:**
```json
{
  "bets": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "wager": "number",
      "deadline": "Date",
      "taskDueDate": "Date | null",
      "success": "boolean | undefined",
      "createdAt": "Date"
    }
  ]
}
```
**Note:** Returns most recent bets regardless of status. `success === undefined` means pending, `success === true` means successful, `success === false` means failed.
**Error Response:**
```json
{
  "error": "string"
}
```

---

## NudgeEngine

### `POST /NudgeEngine/scheduleNudge`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "deliveryTime": "string (ISO date)"
}
```
**Note:** Backend automatically converts ISO date strings to Date objects.
**Response:**
```json
{
  "nudge": "string (nudge ID)"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /NudgeEngine/cancelNudge`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:** `{}` (empty object)
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /NudgeEngine/deleteUserNudges`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:** `{}` (empty object)

### `POST /NudgeEngine/getNudge`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:**
```json
{
  "nudge": {
    "_id": "string",
    "user": "string",
    "task": "string",
    "deliveryTime": "Date",
    "triggered": "boolean",
    "createdAt": "Date"
  }
}
```
**Note:** `triggered: false` means the nudge is pending, `triggered: true` means it has been delivered. Cancelled nudges are deleted and won't appear in responses.
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /NudgeEngine/getUserNudges`
**Request:**
```json
{
  "accessToken": "string",
  "status": "string | null (optional, 'pending' | 'triggered')",
  "limit": "number | null (optional, default: 50)"
}
```
**Note:** All optional parameters must be sent. Use `null` for unused parameters (not omitted). When `null` is sent:
- For `limit`: The backend will use the default value of 50.
- For `status`: The backend will ignore the filter (returns all nudges regardless of status).
**Response:**
```json
{
  "nudges": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "deliveryTime": "Date",
      "triggered": "boolean",
      "createdAt": "Date"
    }
  ]
}
```
**Note:** `triggered: false` means the nudge is pending, `triggered: true` means it has been delivered.

### `POST /NudgeEngine/getReadyNudges`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
```json
{
  "nudges": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "deliveryTime": "Date",
      "triggered": "boolean",
      "createdAt": "Date"
    }
  ]
}
```
**Note:** Only returns nudges where `triggered: false` and `deliveryTime <= now`.

---

## EmotionLogger

### `POST /EmotionLogger/logBefore`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "emotion": "string"
}
```
**Response:**
```json
{
  "log": {
    "_id": "string",
    "user": "string",
    "task": "string",
    "emotion": "string",
    "phase": "before",
    "createdAt": "Date"
  }
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /EmotionLogger/logAfter`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)",
  "emotion": "string"
}
```
**Response:**
```json
{
  "log": {
    "_id": "string",
    "user": "string",
    "task": "string",
    "emotion": "string",
    "phase": "after",
    "createdAt": "Date"
  }
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /EmotionLogger/deleteTaskLogs`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:** `{}` (empty object)

### `POST /EmotionLogger/deleteUserLogs`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:** `{}` (empty object)

### `POST /EmotionLogger/analyzeRecentEmotions`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
```json
{
  "analysis": "string"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /EmotionLogger/getEmotionsForTask`
**Request:**
```json
{
  "accessToken": "string",
  "task": "string (task ID)"
}
```
**Response:**
```json
{
  "task": "string (task ID)",
  "emotions": {
    "before": "string (emotion) | undefined",
    "after": "string (emotion) | undefined"
  }
}
```
**Note:** The `emotions` object contains the emotion for each phase (before/after) if logged. Keys may be absent if that phase hasn't been logged yet.

### `POST /EmotionLogger/getEmotionLogs`
**Request:**
```json
{
  "accessToken": "string",
  "page": "number | null (optional, default: 1)",
  "limit": "number | null (optional, default: 20)",
  "phase": "string | null (optional, 'before' | 'after')",
  "emotion": "string | null (optional)",
  "sortBy": "string | null (optional, default: 'createdAt')",
  "sortOrder": "number | null (optional, default: -1)"
}
```
**Note:** All optional parameters must be sent. Use `null` for unused parameters (not omitted). When `null` is sent:
- For `page`, `limit`, `sortBy`, `sortOrder`: The backend will use the default values shown above.
- For `phase` and `emotion`: The backend will ignore the filter (no filtering applied).
**Response:**
```json
{
  "logs": [
    {
      "_id": "string",
      "user": "string",
      "task": "string",
      "emotion": "string",
      "phase": "before" | "after",
      "createdAt": "Date"
    }
  ],
  "total": "number",
  "page": "number",
  "totalPages": "number"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

### `POST /EmotionLogger/getEmotionStats`
**Request:**
```json
{
  "accessToken": "string"
}
```
**Response:**
```json
{
  "totalLogs": "number",
  "mostCommonEmotion": "string",
  "leastCommonEmotion": "string",
  "averageEmotionsPerDay": "number",
  "recentTrend": "string"
}
```
**Error Response:**
```json
{
  "error": "string"
}
```

---

## Important Notes

1. **Authentication**: All endpoints (except login/register) require `accessToken` in the request body.

2. **Date Handling**: 
   - The backend automatically converts ISO date strings (e.g., `"2025-11-04T04:59:00.000Z"`) to `Date` objects for:
     - `dueDate` in `createTask` and `updateTask`
     - `deliveryTime` in `scheduleNudge`
     - `deadline` and `taskDueDate` in `placeBet`
   - Send dates as ISO strings from the frontend.

3. **Optional Parameters Convention**:
   - **CRITICAL**: All optional parameters that are listed in the request schema must be sent, even if not used. Use `null` for unused optional parameters. Do NOT omit them.
   - **Behavior when `null` is sent:**
     - For pagination/sorting parameters (`page`, `limit`, `sortBy`, `sortOrder`): The backend automatically converts `null` to the default value (as shown in the endpoint documentation).
     - For filter parameters (`status`, `search`, `phase`, `emotion`): The backend keeps `null` and ignores the filter (no filtering applied).
   - **Specific endpoints:**
     - For `createTask`: `dueDate` must be `null` if not present (not omitted).
     - For `updateTask`: `title`, `description`, and `dueDate` must be `null` if not being updated (not omitted).
     - For `getTasks`: All optional parameters (`page`, `limit`, `sortBy`, `sortOrder`, `status`, `search`) must be sent. Use `null` for defaults/filters.
     - For `getEmotionLogs`: All optional parameters (`page`, `limit`, `phase`, `emotion`, `sortBy`, `sortOrder`) must be sent. Use `null` for defaults/filters.
     - For `getUserNudges`: Both optional parameters (`status`, `limit`) must be sent. Use `null` for defaults/filters.
     - For `getRecentActivity`: `limit` must be sent. Use `null` for default.
   - This ensures sync patterns match correctly when optional parameters are not provided.

4. **Automatic Behaviors**:
   - Creating a task automatically schedules a nudge.
   - Starting a task automatically resolves any associated bet and cancels any scheduled nudge.
   - Completing a task automatically resolves any associated bet and cancels any scheduled nudge.
   - Deleting a task automatically deletes associated bet, nudge, and emotion logs.
   - Deleting a user account automatically deletes all user data (tasks, emotion logs, nudges, bettor profile).

5. **Response Format**:
   - Success responses return data objects or empty objects `{}`.
   - Error responses return `{ "error": "string" }`.
   - Query endpoints (like `getTasks`, `getActiveBets`) return arrays wrapped in objects with pagination metadata when applicable.

6. **Return Types**:
   - Methods that return arrays (like `getActiveBets`, `getExpiredBets`, `getRecentActivity`, `getReadyNudges`, `getUserNudges`) return objects with the array as a property:
     - `{ bets: [...] }` instead of `[...]`
     - `{ nudges: [...] }` instead of `[...]`
   - This is consistent across all query endpoints.

