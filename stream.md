# Unified Event Stream - Frontend Update Guide

## Summary
The backend has been updated to provide a unified Server-Sent Events (SSE) stream that delivers multiple types of real-time notifications:
- **Nudge notifications** - when nudges become ready
- **Bet events** - when bets are resolved or expire

Events are processed on-demand when users are actively connected, ensuring efficient resource usage and real-time delivery. The frontend should update to use the unified SSE stream for all real-time notifications.

## Key Changes

### 1. **Nudges Now Store Messages and Trigger Timestamps**
- **Change**: When a nudge is triggered, the generated AI message is stored in the database along with a `triggeredAt` timestamp
- **Impact**: Nudges returned from API calls now include a `message` field and `triggeredAt` timestamp
- **NudgeDoc Structure**:
  ```typescript
  {
    _id: string,
    user: string,
    task: string,
    deliveryTime: Date,  // When the nudge was scheduled to be delivered
    triggeredAt: Date | null,  // When the nudge was actually triggered (null if not yet triggered)
    message?: string  // AI-generated message, present when triggered
  }
  ```
- **Note**: The `triggered: boolean` field has been replaced with `triggeredAt: Date | null` for more accurate tracking

### 2. **Unified SSE-Based Event Processing**
- **Change**: Multiple event types (nudges and bets) are now processed on-demand through a unified SSE connection, not via background processing
- **Impact**: Events are only processed when users are actively connected, saving resources
- **Architecture**: 
  - **Unified SSE endpoint** handles triggering and delivering all event types
  - Events are processed when users connect (backlog) and polled every 5 seconds while connected
  - When a user disconnects or logs out, event processing stops immediately
  - No background scheduler - all processing happens through active SSE connections
- **Frontend Action**: Connect to unified SSE endpoint to receive all real-time notifications

### 3. **Unified Server-Sent Events (SSE) Endpoint**
- **Primary Endpoint**: `GET /api/events/stream?accessToken=<token>` (recommended)
- **Legacy Endpoint**: `GET /api/nudges/stream?accessToken=<token>` (backward compatible, uses same unified stream)
- **Purpose**: Real-time notifications for multiple event types (nudges, bet events)
- **Authentication**: Access token via query parameter or `Authorization: Bearer <token>` header
- **Event Types**:
  - `nudge` - Nudge notifications
  - `bet_resolved` - Bet successfully resolved (task completed)
  - `bet_expired` - Bet expired (deadline passed)
  - `connected` - Connection established
  - `heartbeat` - Connection keepalive (every 30 seconds)
  - `error` - Error notifications

### 4. **Backlog Processing on Connection**
- **Change**: When connecting via SSE, the system automatically processes all ready events since the user's last connection
- **Impact**: Clients catch up on missed events when reconnecting, and ready events are processed immediately
- **Implementation**: 
  - Tracks `lastSeenNudgeTimestamp` per user (when the last nudge was sent)
  - Tracks `lastSeenBetTimestamp` per user (when the last bet event was sent)
  - On connect, gets all ready nudges with `deliveryTime > lastSeenNudgeTimestamp`
  - On connect, gets all recently resolved bets and expired bets
  - Triggers and sends these events immediately
  - Also sends any already-triggered events that weren't received (in case of disconnection)

### 5. **Bet Event Processing**
- **Change**: Bet resolution and expiration are now handled through the unified SSE stream
- **Impact**: Frontend receives real-time notifications when bets are resolved or expire, enabling automatic UI refresh
- **Event Details**:
  - `bet_resolved`: Sent when a bet is successfully resolved (task started before deadline)
    - Includes: `_id`, `task`, `wager`, `deadline`, `success: true`
  - `bet_expired`: Sent when a bet expires (deadline passed without task start)
    - Includes: `_id`, `task`, `wager`, `deadline`, `success: false`
- **Processing**: 
  - Successful bets are resolved when tasks are started (via syncs)
  - Expired bets are automatically resolved when detected (every 5 seconds)
  - Both resolution types trigger SSE events for frontend refresh (detected via polling every 5 seconds)

## Frontend Implementation Guide

### Option 1: Use Unified SSE Stream for Real-Time Notifications (Recommended)

```javascript
// Connect to unified SSE stream
const eventSource = new EventSource(`/api/events/stream?accessToken=${accessToken}`);

// Handle connection
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('Connected to unified event stream');
      // Backlog of ready events will be processed and sent immediately
      // Any already-triggered events since last connection will also be sent
      break;
      
    case 'nudge':
      // Display the nudge to the user
      // Note: This nudge was just triggered and the message was generated
      showNudgeNotification({
        nudgeId: data.nudge._id,
        taskId: data.nudge.task,
        message: data.nudge.message,  // AI-generated message
        deliveryTime: data.nudge.deliveryTime,  // When nudge was scheduled
      });
      break;
      
    case 'bet_resolved':
      // Bet was successfully resolved (task started before deadline)
      handleBetResolved({
        betId: data.bet._id,
        taskId: data.bet.task,
        wager: data.bet.wager,
        deadline: data.bet.deadline,
        success: true,
      });
      // Refresh bet list to show updated state
      refreshBetList();
      break;
      
    case 'bet_expired':
      // Bet expired (deadline passed without task start)
      handleBetExpired({
        betId: data.bet._id,
        taskId: data.bet.task,
        wager: data.bet.wager,
        deadline: data.bet.deadline,
        success: false,
      });
      // Refresh bet list to show updated state
      refreshBetList();
      break;
      
    case 'heartbeat':
      // Connection is alive (every 30 seconds)
      break;
      
    case 'error':
      console.error('SSE error:', data.message);
      break;
  }
});

// Handle connection errors
eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  // Optionally implement reconnection logic
};

// Close connection when done
// eventSource.close();
```

**Benefits:**
- Real-time delivery (no polling delay)
- Automatic catch-up on missed notifications
- Efficient (only sends when events are ready)
- Single connection for all event types
- Automatic UI refresh when bets are resolved or expire

### Option 2: Poll for Triggered Nudges (Not Recommended)

**Note**: Polling is not recommended because:
- Events are only processed when users are connected via SSE
- If you're not connected via SSE, nudges won't be triggered and bet events won't be sent
- You'll miss real-time delivery

If you must use polling (e.g., SSE not supported):

```javascript
// Poll for triggered nudges
async function fetchTriggeredNudges(accessToken) {
  const response = await fetch('/api/NudgeEngine/getUserNudges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken,
      status: 'triggered',
      limit: 50
    })
  });
  
  const result = await response.json();
  
  if (result.nudges) {
    // Filter to only nudges with messages (successfully triggered)
    const nudgesWithMessages = result.nudges.filter(n => n.triggeredAt !== null && n.message);
    
    // Display nudges to user
    nudgesWithMessages.forEach(nudge => {
      showNudgeNotification({
        nudgeId: nudge._id,
        taskId: nudge.task,
        message: nudge.message,
        deliveryTime: nudge.deliveryTime,
      });
    });
  }
}

// Poll every 5-10 seconds to catch nudges quickly
// Note: This will NOT trigger nudges, only fetch already-triggered ones
setInterval(() => {
  fetchTriggeredNudges(accessToken);
}, 5000);
```

### Option 3: Hybrid Approach

Use SSE for real-time delivery, with polling as a fallback:

```javascript
let eventSource = null;
let pollingInterval = null;

function startEventNotifications(accessToken) {
  // Try SSE first
  try {
    eventSource = new EventSource(`/api/events/stream?accessToken=${accessToken}`);
    
    eventSource.addEventListener('message', handleEvent);
    eventSource.onerror = () => {
      // SSE failed, fall back to polling
      eventSource.close();
      startPolling(accessToken);
    };
  } catch (error) {
    // SSE not supported, use polling
    startPolling(accessToken);
  }
}

function startPolling(accessToken) {
  pollingInterval = setInterval(() => {
    fetchTriggeredNudges(accessToken);
    // Also poll for bet updates if needed
    fetchBetUpdates(accessToken);
  }, 60000);
}

function handleEvent(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'nudge':
      showNudgeNotification(data.nudge);
      break;
    case 'bet_resolved':
      handleBetResolved(data.bet);
      refreshBetList();
      break;
    case 'bet_expired':
      handleBetExpired(data.bet);
      refreshBetList();
      break;
  }
}
```

## API Changes

### Updated Response: `getUserNudges`
Nudges now include the `message` field and `triggeredAt` timestamp when triggered:
```json
{
  "nudges": [
    {
      "_id": "nudge_id",
      "user": "user_id",
      "task": "task_id",
      "deliveryTime": "2025-01-15T10:00:00Z",
      "triggeredAt": "2025-01-15T10:05:23Z",
      "message": "Take a moment to dive into the first part of your task. It doesn't have to be perfect."
    }
  ]
}
```

**Status Filtering**:
- `status: "pending"` - Returns nudges where `triggeredAt` is `null`
- `status: "triggered"` - Returns nudges where `triggeredAt` is not `null`

### Updated Response: `getNudge`
Same structure - includes `triggeredAt` and `message` when triggered.

### Updated Response: `getReadyNudges`
Still returns untriggered nudges (`triggeredAt: null`, no `message` field yet).

## Migration Checklist

- [ ] Update nudge data types to include `message?: string` and `triggeredAt: Date | null` (replacing `triggered: boolean`)
- [ ] Update any code that checks `nudge.triggered` to check `nudge.triggeredAt !== null` instead
- [ ] **Implement unified SSE connection** - This is required for nudges to be triggered and bet events to be received
- [ ] Update UI to display nudge messages
- [ ] **Implement bet event handlers** - Handle `bet_resolved` and `bet_expired` events
- [ ] **Update bet list refresh logic** - Refresh bet list when bet events are received
- [ ] Handle connection lifecycle (connect on login, disconnect on logout)
- [ ] Update endpoint URL from `/api/nudges/stream` to `/api/events/stream` (or keep using legacy endpoint)
- [ ] Remove old polling logic for ready nudges (SSE is now the only way to trigger nudges)
- [ ] Remove any frontend calls to `scheduleNudge` endpoint (now backend-only)
- [ ] Remove any frontend calls to `nudgeUser` endpoint (now backend-only, triggered via SSE)
- [ ] Test connection/disconnection scenarios
- [ ] Test logout behavior (SSE should close automatically)
- [ ] Test bet event handling (bet resolution and expiration)

## Notes

1. **Unified SSE Connection Required**: Events are only processed when users are connected via SSE. If you're not connected, nudges won't be triggered and bet events won't be sent. Make sure to establish an SSE connection when users log in.

2. **Real-Time Processing**: When you connect via SSE, the system immediately:
   - Processes all ready nudges since your last connection (backlog)
   - Processes all recently resolved bets and expired bets (backlog)
   - Polls every 5 seconds for new ready nudges and triggers them
   - Polls every 5 seconds for expired bets and resolves them
   - Sends events to you in real-time as they're generated

3. **Connection Lifecycle**: 
   - Connect to SSE when user logs in
   - SSE connection automatically closes when user logs out (authentication check)
   - Reconnect on login to resume event processing

4. **Message Storage**: All triggered nudges have their messages and `triggeredAt` timestamps stored in the database, so you can retrieve them later via API calls.

5. **Bet Event Processing**: 
   - Expired bets are automatically resolved when detected (every 5 seconds)
   - Resolved bets (via task start) trigger events via polling (every 5 seconds)
   - Bet events include full bet details for UI refresh
   - Frontend should refresh bet lists when receiving bet events

6. **No Breaking Changes**: 
   - Existing API endpoints still work, they just now return additional data (`message` field and `triggeredAt` timestamp instead of `triggered` boolean)
   - Legacy endpoint `/api/nudges/stream` still works and uses the same unified stream

7. **Backend-Only Endpoints**: 
   - `scheduleNudge` is **backend-only** - nudges are automatically scheduled when tasks are created via the `AutoScheduleNudgeOnTaskCreate` sync
   - `nudgeUser` is **backend-only** - called automatically by SSE connections when ready nudges are detected
   - `resolveBet` is **backend-only** - called automatically when tasks are started via the `AutoResolveBetOnTaskStart` sync
   - `resolveExpiredBet` is **backend-only** - called automatically by SSE connections when expired bets are detected
   - The frontend should not call these endpoints directly

8. **Nudge Lifecycle**:
   - Nudges are automatically scheduled when tasks are created
   - Nudges are automatically canceled when tasks are started (user doesn't need encouragement anymore)
   - Nudges are automatically canceled when tasks are deleted (cleanup)
   - Nudges are **NOT** canceled when tasks are completed (they've already served their purpose of encouraging starting)

9. **Bet Lifecycle**:
   - Bets are placed via frontend API calls
   - Successful bets are resolved when tasks are started (via `AutoResolveBetOnTaskStart` sync)
   - Expired bets are resolved when deadlines pass (via SSE polling)
   - Both resolution types trigger SSE events for frontend refresh

10. **Efficiency**: This approach is more efficient because:
    - Events are only processed when users are connected (saves LLM API calls for nudges)
    - No background processing for disconnected users
    - Resources are only used for active connections
    - Single connection handles all event types

11. **Authentication**: The SSE endpoint automatically verifies authentication every polling cycle. If a user logs out, the connection is closed immediately and polling stops.

12. **Event Types**: The unified stream supports multiple event types:
    - `connected` - Initial connection message
    - `nudge` - Nudge notifications
    - `bet_resolved` - Bet successfully resolved
    - `bet_expired` - Bet expired
    - `heartbeat` - Connection keepalive (every 30 seconds)
    - `error` - Error notifications

