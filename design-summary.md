# Design Summary: Focus Flow Backend

This document summarizes how the final design of the Focus Flow backend differs from the initial concept design in Assignment 2. The system implements a task management application with gamification, emotional tracking, and AI-powered nudges to help users stay motivated and complete tasks.

## Key Architectural Changes

### State Model Refinements

**TaskManager Concept:**
- **Initial Design (Assignment 2):** Tasks had explicit `status` enum (NotStarted, InProgress, Completed), `scheduledStartTime`, and `actualStartTime` fields.
- **Final Design:** Status is now **derived** from timestamp fields (`createdAt`, `startedAt`, `completedAt`), resulting in three states: `pending`, `in-progress`, and `completed`. This eliminates redundancy and ensures consistency between status and timestamps. The `dueDate` field was added to support deadline-based nudge scheduling.

**NudgeEngine Concept:**
- **Initial Design:** Nudges tracked user `response` (Accepted, Ignored, Snoozed, None) to measure engagement.
- **Final Design:** Response tracking was removed. Instead, the system focuses on **AI-generated motivational messages** using Gemini LLM, with `triggeredAt` timestamp and `message` fields to track delivery. This simplifies the concept while adding intelligent, context-aware nudge generation based on task details and recent user emotions.

**EmotionLogger Concept:**
- **Initial Design:** Each emotion entry contained a `set of emotions` (allowing multiple emotions per entry).
- **Final Design:** Each entry contains a **single emotion** (`emotion` field), with a `phase` field (`before` or `after`) to capture emotional state at different stages. This simplification makes analysis easier and aligns with the principle that users log one primary emotion at a time.

**MicroBet Concept:**
- **Initial Design:** Simple betting with `outcome` enum (Pending, Success, Failure) and basic reward calculation.
- **Final Design:** Added a **user profile system** with `points` and `streak` tracking. Rewards are now calculated using a formula incorporating streak bonuses and timing bonuses (earlier bet deadlines relative to task due dates get higher rewards). The `outcome` enum was replaced with a `success` boolean for simplicity, with `resolvedAt` timestamp for tracking.

### Action Changes

**TaskManager:**
- Removed `remove` action; replaced with `deleteTask` (more explicit naming).
- Added `updateTask` for partial updates (title, description, dueDate).
- Changed from status-based transitions to timestamp-based actions: `markStarted` and `markComplete` replace status updates.
- Added `getTasks` with pagination, filtering, and search capabilities.
- Added `getTaskStatus` helper to derive status from task document.

**NudgeEngine:**
- Removed `recordResponse` action (no longer tracking user responses).
- `nudgeUser` now generates AI-powered messages using task context and recent emotions.
- Added query methods: `getReadyNudges`, `getReadyNudgesSince`, `getNewTriggeredNudges` for incremental polling patterns.

**EmotionLogger:**
- Replaced `logEmotion` (which took emotionType and set of emotions) with `logBefore` and `logAfter` actions (each taking a single emotion).
- Added `analyzeRecentEmotions` for AI-powered emotional reflection.
- Added `getEmotionStats` for aggregate statistics (most/least common emotions, trends).

**MicroBet:**
- Added `initializeBettor` to set up user profiles with starting points (100) and streak (0).
- `resolveBet` now calculates dynamic rewards based on streak and timing.
- Added `resolveExpiredBet` for handling bets that pass their deadline without completion.
- Added `getUserProfile` for comprehensive betting statistics.

### Synchronization Enhancements

**Automatic Nudge Scheduling:**
- **Initial Design:** Sync triggered nudge generation when task created, using `scheduledStartTime - X min` formula.
- **Final Design:** Automatic nudge scheduling occurs in two variants:
  - **Tasks with due dates:** Nudge scheduled at halfway point between creation and due date (minimum 1 minute delay).
  - **Tasks without due dates:** Nudge scheduled 5 minutes from creation.
  This adaptive approach ensures nudges arrive at appropriate times regardless of task type.

**Bet Resolution Timing:**
- **Initial Design:** Bet resolved when task marked as started (`markStarted`).
- **Final Design:** Same trigger, but now uses `timeStarted` as the `completionTime` for bet resolution, ensuring accurate timing validation.

**Cascading Deletions:**
- **New Feature:** Added `AutoCascadeDeleteOnTaskDelete` sync that automatically:
  - Cancels associated bet (if exists)
  - Deletes associated nudge (force delete, even if triggered)
  - Deletes associated emotion logs
  This maintains data consistency and prevents orphaned records.

**Nudge Cancellation:**
- **New Feature:** Added `AutoCancelNudgeOnTaskStart` to cancel scheduled nudges when users start tasks early, preventing unnecessary notifications.

### Implementation Details

**AI Integration:**
- Both `NudgeEngine` and `EmotionLogger` now use Gemini LLM for:
  - Generating personalized motivational nudge messages (context-aware, incorporating task details and recent emotions)
  - Analyzing emotional patterns and generating reflective summaries

**Query Patterns:**
- Implemented incremental polling patterns with `getReadyNudgesSince` and `getNewTriggeredNudges` to support efficient frontend synchronization.
- Added pagination and filtering support across multiple concepts (`getTasks`, `getEmotionLogs`).

**Error Handling:**
- All actions return structured error responses: `{ error: string }` for failures, empty dictionary `{}` for success when no data is returned.
- Comprehensive validation in preconditions (unique titles, future dates, existence checks).

## Missing from Assignment 4b

No visual design documents (Assignment 4b) were found in the codebase. The final implementation focuses entirely on backend API design following the concept design pattern, with no frontend UI specifications available for comparison.

## Design Philosophy Maintained

The final design maintains the core principles of concept design:
- **Independence:** Each concept remains independent, with no direct dependencies.
- **Completeness:** Each concept is self-contained and handles its own functionality.
- **Composition via Syncs:** Cross-concept interactions happen exclusively through synchronizations.
- **Separation of Concerns:** Each concept addresses a single, coherent aspect of functionality.

The evolution from Assignment 2 to the final design represents a refinement of the initial concept, with practical improvements based on implementation needs: derived state to avoid redundancy, AI integration for richer user experience, and more sophisticated gamification mechanics.
