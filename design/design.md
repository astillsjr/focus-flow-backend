# Major Changes Since ee0ccd5

This document summarizes major changes between commit `ee0ccd5` (assignemtn 4a) and the current `main` HEAD for `focus-flow-backend`.

References:
- Repository: `https://github.com/astillsjr/focus-flow-backend`
- Compare view: `https://github.com/astillsjr/focus-flow-backend/compare/ee0ccd5...HEAD`

## Overview

The codebase evolved from the initial scaffolding into a more fully realized concept-driven backend. Key themes:
- Concept implementations iterated substantially (EmotionLogger, MicroBet, NudgeEngine, TaskManager, UserAuthentication).
- LikertSurvey sample concept removed from `src` to reduce noise and focus on project-specific concepts.
- Added a lightweight concept server and AI integration utilities.
- Design documentation expanded (specs, implementing/testing guides) and API extraction workflow captured.

## Highlights

- Added concept server entrypoint: `src/concept_server.ts`.
- Introduced Gemini LLM utility: `src/utils/gemini-llm.ts`.
- MicroBet feature iteration including a time bonus to bets (commit `d326522`).
- NudgeEngine AI augmentation plus spec update (commits `5515487`, `814e477`).
- UserAuthentication refactor (commit `6784374`).
- Removed sample LikertSurvey concept from `src`.
- Expanded design/docs and `context/` history: background specs, implementation/testing docs, and API extraction prompts/results.

## Concept Changes

### EmotionLogger
- State changes
  - Added AI integration via `GeminiLLM` and `GEMINI_API_KEY` env var.
  - Introduced utility `ALL_EMOTIONS` usage for stats.
  - Ensured unique index on `(user, task, phase)` and standardized ID creation with `freshID()`.
- Added/renamed actions and queries
  - Added `analyzeRecentEmotions({ user }) → { analysis }` to generate AI reflections.
  - Added `getEmotionStats({ user })` returning: `totalLogs`, `mostCommonEmotion`, `leastCommonEmotion`, `averageEmotionsPerDay`, `recentTrend`.
  - Added `getEmotionLogs({ user, page, limit, phase?, emotion?, sortBy?, sortOrder? })` with pagination/filtering.
  - Added `getEmotionsForTask({ user, task })` returning per-phase emotions for a task.
  - Added helpers `getUserLogs`, `getLogsForTask`, `buildAnalysisPrompt`.
  - Replaced `viewEmotionTrends` with `getEmotionStats` (behavioral change: concrete stats vs placeholder string).
  - Added `deleteUserLogs({ user })` alongside existing `deleteTaskLogs`.
- Behavioral/policy updates
  - Duplicate phase writes now return a consistent error string.
  - Tests updated to assert structured stats and stricter messages.

### MicroBet
- State changes
  - `BetDoc` now supports optional `taskDueDate`; unique index on `(user, task)`.
  - Rewards now factor in: streak bonus + time bonus vs. task due date.
  - User initialization starts with `points=100` (was 0), clearer error messages.
- Added/renamed actions and queries
  - `initializeBettor` now guards duplicates with "User already initialized" and seeds starting points.
  - `placeBet({ user, task, wager, deadline, taskDueDate? })` validations:
    - deadline must be future; if `taskDueDate` provided, `deadline < taskDueDate`.
    - atomic points deduction; improved error strings: e.g., "User profile not found", "Failed to place bet".
  - `resolveBet({ user, task, completionTime })` returns `{ status: "success", reward }` or specific errors; uses new reward calc.
  - `resolveExpiredBet({ user, task })` resets streak and marks failure with refined errors.
  - New queries: `getBet`, `getActiveBets`, `getExpiredBets`, `getUserProfile`, `getRecentActivity`.
  - `viewBetHistory` replaced by `getRecentActivity` and `getUserProfile`.
  - `cancelBet` refunds only unresolved bets; clearer messages.
- Reward function
  - `calculateReward(wager, streak, betDeadline, taskDueDate?)` adds time bonus up to 25% for earlier bet deadlines relative to due date; default small bonus if no due date.

### NudgeEngine
- State changes
  - Integrated `GeminiLLM` with `GEMINI_API_KEY` env var; nudges indexed `(user, task)` unique.
  - `NudgeDoc` flow stabilized: `triggered`, `canceled`, `deliveryTime` gates.
- Added/renamed actions and queries
  - `scheduleNudge({ user, task, deliveryTime })` returns `nudge` id; rejects past delivery time and duplicates.
  - `cancelNudge({ user, task })` prevents cancel after trigger/cancel, with specific errors.
  - `nudgeUser({ user, task, title, description, recentEmotions })` now:
    - Validates eligibility (time reached, not triggered/canceled),
    - Builds AI prompt and generates a short message,
    - Validates message length/quality and marks as triggered; returns `{ message, nudge }`.
  - New queries: `getNudge`, `getUserNudges({ status?, limit? })`, `getReadyNudges`.
- Behavioral/policy updates
  - Clearer error taxonomy: missing, pre-emptive trigger, already triggered/canceled.

### TaskManager
- State changes
  - `TaskDoc` now allows optional `description`; added `completedAt`; added text index on `title`.
  - Introduced `TaskStatus = "pending" | "in-progress" | "completed"`.
- Added/renamed actions and queries
  - `createTask({ user, title, description?, dueDate? })` enforces trimmed non-empty unique titles; future `dueDate`.
  - `updateTask({ user, task, title?, description?, dueDate? })` validates duplicates, empties, and past `dueDate`.
  - `markStarted({ user, task, timeStarted })` stores provided timestamp; rejects future times and duplicates.
  - `markComplete({ user, task, timeCompleted })` stores provided timestamp; rejects future times and duplicates.
  - `deleteTask`, `deleteUserTasks` improved messages and guards.
  - New queries: `getTask({ user, task })` and `getTasks({ user, page, limit, status?, search?, sortBy?, sortOrder? })` with pagination and text search.
  - New helper `getTaskStatus({ task }) → TaskStatus`.

### UserAuthentication
- State changes
  - Replaced naive password handling with `bcryptjs`; added JWT-based auth with access/refresh tokens.
  - Added env var `JWT_SECRET`; tokens: access (15m) and refresh (7d).
  - Users now store `createdAt` and optional `refreshToken`; unique indexes on `username` and `email`.
- Added/renamed actions and queries
  - `register({ username, password, email }) → { accessToken, refreshToken }`
    - Validates unique username/email and email format; stores `hashedPassword` and `createdAt`.
  - `login({ username, password }) → { accessToken, refreshToken }` with bcrypt verify; stores refresh token.
  - `logout({ refreshToken })` invalidates refresh token (server-side revocation).
  - `changePassword({ accessToken, oldPassword, newPassword })` requires valid access token and correct old password.
  - `deleteAccount({ accessToken, password })` requires valid access token and password match.
  - `refreshAccessToken({ refreshToken }) → { accessToken }` issues new access token if refresh token is valid/current.
  - `getUserInfo({ accessToken }) → { user: { id, username, email } }` returns authenticated user info.
  - Helpers: `generateToken`, `verifyToken`, `isValidEmail`.
- Behavioral/policy updates
  - Session is now token-based, not `isLoggedIn` flag.
  - Error messages standardized (e.g., invalid/expired token, invalid refresh token, incorrect current password).

## Infrastructure & Utilities

- New server entry: `src/concept_server.ts` to run concept-driven workflows.
- New LLM helper: `src/utils/gemini-llm.ts` for AI augmentation paths.
- Updated `deno.json` and `deno.lock` to reflect new dependencies/config.
- `src/utils/emotions.ts` refined for EmotionLogger consistency.

## Documentation & Context

- Background docs updated:
  - `design/background/concept-specifications.md`
  - `design/background/implementing-concepts.md`
  - `design/background/testing-concepts.md`
- API extraction prompts and captures added:
  - `design/tools/api-extraction-from-code.md`
  - `design/tools/api-extraction-from-spec.md`
  - Corresponding `context/` history of prompts, responses, and steps
- README updated with improved guidance.

## Breaking Changes

- Removed LikertSurvey concept from `src`.
- Concept APIs may have changed during refactors (notably UserAuthentication, NudgeEngine, MicroBet). Revisit tests/usages.

## Upgrade Notes

1. Re-run tests after pulling changes: `deno test -A`.
2. If you depended on LikertSurvey code, migrate to project concepts or restore from history.
3. Review NudgeEngine and MicroBet behavior changes (time bonus, AI augmentation) and adjust client expectations.
4. Check auth flows after the UserAuthentication refactor for integration touchpoints.

## Commit Summary (ee0ccd5..HEAD)

Representative commits informing the above summary:
- `d326522` Added time bonus to bets
- `5515487` NudgeEngine AI augmentation
- `814e477` NudgeEngine spec update
- `6784374` Refactored UserAuthentication concept
- `70d75a1` TaskManager spec/implementation iteration
- `1f31c65` EmotionLogger concept iteration
- `ac73113` Added concept server, api-extraction prompt

See full history: `https://github.com/astillsjr/focus-flow-backend/commits/main`


