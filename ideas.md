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

