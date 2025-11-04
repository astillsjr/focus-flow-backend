## Recommended incremental approach

### Step 1: Implement inclusion/exclusion decisions (start here)
Update src/concepts/Requesting/passthrough.ts with your decisions from ideas.md. This is the foundation.  
Priority:

1. Replace the example LikertSurvey entries with your actual inclusions/exclusions
2. Add the two inclusions: `register` and `login` from UserAuthentication
3. Add all 40 exclusions (or start with a few concepts to test)  

This lets you:

- Run the server and verify routes
- See which routes are "unverified"
- Test that the frontend still works

### Step 2: Test the server and verify routes
After updating passthrough.ts:  

1. Run `deno run build`
2. Run `deno run start`
3. Check console output for "unverified" routes (should be none if configured correctly)
4. Test frontend login/register to confirm inclusions work

### Step 3: Start with authentication syncs (simplest)
Begin with UserAuthentication actions that need token validation:

- `logout` sync
- `refreshAccessToken` sync
- `getUserInfo` sync

Why start here:

- Clear pattern: validate token → extract userId → call concept action
- Low complexity (no cross-concept dependencies)
- Establishes the authentication pattern to reuse

### Step 4: Add TaskManager syncs incrementally
After authentication works, add TaskManager syncs one at a time:

1. `createTask` — verify auth, extract userId from token, call action
2. `getTask` — verify auth + ownership
3. `updateTask` — verify auth + ownership
4. Continue with remaining actions

### Step 5: Add cross-concept syncs
Once basic syncs work, add automation:

- `markComplete` → trigger `resolveBet` (if bet exists)
- `resolveBet` → update user points/streak

### Step 6: Add backend-only automation syncs
Finally, add syncs for automated actions:

- Scheduled task for `resolveExpiredBet`
- Scheduled task for `nudgeUser` when delivery time arrives
