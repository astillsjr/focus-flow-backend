# Action Inclusion/Exclusion Analysis

Based on the context.md file and the backend API documentation, here's which actions should be **included** (passed through directly) versus **excluded** (turned into request actions for syncing).

**Status:** ✅ All actions verified to exist in codebase

## Actions to INCLUDE (Pass Through Directly)

These are public endpoints that don't require authentication checks:

### UserAuthentication
- `register` ✓ - Public registration endpoint
- `login` ✓ - Public login endpoint

## Actions to EXCLUDE (Turn into Request Actions for Syncing)

These require authentication, authorization, or conditional logic and should be handled through syncs:

### UserAuthentication (5 actions)
- `logout` ✓ - Requires valid refresh token validation
- `refreshAccessToken` ✓ - Requires valid refresh token validation
- `getUserInfo` ✓ - Requires valid access token validation
- `changePassword` ✓ - Requires valid access token + password verification
- `deleteAccount` ✓ - Requires valid access token + password verification

### TaskManager (9 actions)
All actions require user ownership verification:
- `createTask` ✓ - Needs to verify user is authenticated
- `updateTask` ✓ - Needs to verify user owns the task
- `markStarted` ✓ - Needs to verify user owns the task
- `markComplete` ✓ - Needs to verify user owns the task; may trigger bet resolution syncs
- `deleteTask` ✓ - Needs to verify user owns the task
- `deleteUserTasks` ✓ - Needs to verify user authorization
- `getTask` ✓ - Needs to verify user owns the task
- `getTasks` ✓ - Needs to verify user authorization (filter by user)
- `getTaskStatus` ✓ - Needs to verify user owns the task (used by frontend)

### MicroBet (11 actions)
All actions require user authorization:
- `initializeBettor` ✓ - Should verify user is authenticated
- `removeBettor` ✓ - Should verify user authorization
- `placeBet` ✓ - Should verify user ownership and sufficient points
- `cancelBet` ✓ - Should verify user owns the bet
- `resolveBet` ✓ **[BACKEND-ONLY]** - Should verify user owns the bet; triggered automatically by task completion syncs
- `resolveExpiredBet` ✓ **[BACKEND-ONLY]** - Should verify user owns the bet; triggered automatically by scheduled backend automation
- `getBet` ✓ - Should verify user owns the bet
- `getActiveBets` ✓ - Should verify user authorization
- `getExpiredBets` ✓ - Should verify user authorization
- `getUserProfile` ✓ - Should verify user authorization
- `getRecentActivity` ✓ - Should verify user authorization

### EmotionLogger (8 actions)
All actions require user authorization:
- `logBefore` ✓ - Should verify user owns the task
- `logAfter` ✓ - Should verify user owns the task
- `deleteTaskLogs` ✓ - Should verify user owns the task
- `deleteUserLogs` ✓ - Should verify user authorization
- `analyzeRecentEmotions` ✓ - Should verify user authorization
- `getEmotionsForTask` ✓ - Should verify user owns the task
- `getEmotionLogs` ✓ - Should verify user authorization
- `getEmotionStats` ✓ - Should verify user authorization

### NudgeEngine (7 actions)
All actions require user authorization:
- `scheduleNudge` ✓ - Should verify user owns the task
- `cancelNudge` ✓ - Should verify user owns the nudge
- `deleteUserNudges` ✓ - Should verify user authorization
- `nudgeUser` ✓ **[BACKEND-ONLY]** - Triggered automatically when nudge delivery time arrives (via sync or scheduled task)
- `getNudge` ✓ - Should verify user owns the nudge
- `getUserNudges` ✓ - Should verify user authorization
- `getReadyNudges` ✓ - Should verify user authorization; may be called by backend automation for nudge delivery

## Verification Summary

- **Total Actions Verified:** 42 actions across 5 concepts
- **Actions to Include:** 2 (UserAuthentication: register, login)
- **Actions to Exclude:** 40 (all others)
- **Backend-Only Actions:** 3 (MicroBet.resolveBet, MicroBet.resolveExpiredBet, NudgeEngine.nudgeUser)

All listed actions have been verified to exist in the codebase implementation.

## Rationale

Based on the context.md file, actions should be excluded if they:

1. **Require authentication checks** - Most actions need to verify the user's access token is valid
2. **Require authorization checks** - Most actions need to verify the user owns the resource they're accessing/modifying
3. **Should be backend-only** - Some actions like `nudgeUser` and bet resolution actions should only be triggered automatically by syncs or scheduled tasks, not directly by frontend requests

Only `register` and `login` are included because they are public endpoints that don't require authentication.

By excluding these actions, you can implement syncs that:
- Validate tokens before executing actions
- Verify user ownership of resources
- Automate actions like bet resolution and nudge delivery based on task completion

## Backend-Only Actions

The following actions are marked **[BACKEND-ONLY]** and should **never** be called directly by the frontend. They are intended to be triggered automatically by:
- **Syncs** - Automated reactions to other concept actions (e.g., `resolveBet` triggered when `markComplete` occurs)
- **Scheduled Tasks** - Backend cron jobs or scheduled processes (e.g., `resolveExpiredBet` for expired bets, `nudgeUser` for ready nudges)

These actions should still be excluded from passthrough routes, but syncs should handle their invocation rather than frontend requests.

###Should be backend syncs (event-driven)  
These respond to action completions and fit the current sync pattern:

1. Automatic nudge scheduling (Item #1)
- When: TaskManager.createTask completes
- Then: NudgeEngine.scheduleNudge with calculated delivery time
- Pattern: Similar to existing syncs

2. Bet resolution on task start (Item #2)
- When: TaskManager.markStarted completes
- Then: MicroBet.resolveBet (if bet exists)
- Pattern: Standard sync with where clause to check for bet existence

3. Nudge cancellation on task start/complete (Item #3)
- When: TaskManager.markStarted or TaskManager.markComplete completes
- Then: NudgeEngine.cancelNudge
- Pattern: Two syncs (one for each action)

4. Cascading deletion on task deletion (Item #4)
- When: TaskManager.deleteTask completes
- Then: MicroBet.cancelBet, NudgeEngine.cancelNudge, EmotionLogger.deleteTaskLogs
- Pattern: Multiple then actions in a single sync

5. Bet resolution on task completion (Item #10)
- When: TaskManager.markComplete completes
- Then: MicroBet.resolveBet (if not already resolved)
- Pattern: Similar to #2, but for completion

6. Cascading user data deletion (Item #8)
- When: UserAuthentication.deleteAccount is called
- Then: Delete all tasks, emotion logs, nudges, and remove bettor
- Pattern: Multiple cascading deletions in one sync

## Need different mechanisms (not syncs)  
These require scheduled/periodic execution, which the current sync system doesn't support:

7. Automatic bet expiration monitoring (Item #5)
- Mechanism: Cron job or scheduled task
- Implementation: Periodic job that:
  - Queries MicroBet.getExpiredBets for all users
  - Calls MicroBet.resolveExpiredBet for each expired bet
- Frequency: Every 1-2 minutes
- Note: Could be a background worker process

8. Automatic nudge delivery (Item #6)
- Mechanism: Cron job or scheduled task
- Implementation: Periodic job that:
  - Queries NudgeEngine.getReadyNudges for all users
  - Calls NudgeEngine.nudgeUser for each ready nudge
- Frequency: Every minute
- Note: Could also use WebSocket/SSE for real-time delivery

## Better handled elsewhere

9. Auto-refresh access tokens (Item #7)
- Mechanism: HTTP middleware/interceptor
- Not a sync: Token refresh should be transparent at the HTTP layer
- Implementation: Middleware that checks token expiry and refreshes before requests

10.Store initialization after login/register (Item #9)
- Mechanism: Automatic profile creation or separate endpoint
- Alternative: Sync that triggers MicroBet.initializeBettor when UserAuthentication.register completes
- Could work as a sync, but automatic profile creation might be simpler

## Summary

### High priority syncs to implement:
1. Automatic nudge scheduling on task creation
2. Bet resolution on task start
3. Nudge cancellation on task start/complete
4. Cascading deletion on task deletion
5.Bet resolution on task completion
6. Cascading user data deletion

### Infrastructure needed:
- Scheduled task system for:
  - Bet expiration monitoring
  - Nudge delivery

### Architectural decisions:
- Token refresh → HTTP middleware
- Profile initialization → Sync or automatic creation

The sync system is event-driven (triggered by action completions), so periodic tasks like bet expiration and nudge delivery need a separate scheduled task infrastructure.