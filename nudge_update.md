# Nudge Handling Backend Changes - Frontend Update Guide

## Summary
The backend nudge system has been updated to automatically process nudges, store messages, and provide real-time notifications via Server-Sent Events (SSE). The frontend should update to take advantage of these new features.

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

### 2. **Automatic Background Processing**
- **Change**: Background scheduler runs every 60 seconds to automatically trigger ready nudges
- **Impact**: Nudges are processed even when no frontend clients are connected
- **Architecture**: 
  - **Background scheduler** is the single source of truth for triggering nudges (generates messages)
  - **SSE endpoint** only delivers notifications to connected clients (does not trigger nudges)
  - This separation prevents race conditions and ensures reliable delivery
- **Frontend Action**: No changes needed - nudges are processed automatically

### 3. **Server-Sent Events (SSE) Endpoint**
- **New Endpoint**: `GET /api/nudges/stream?accessToken=<token>`
- **Purpose**: Real-time nudge notifications for connected clients
- **Authentication**: Access token via query parameter or `Authorization: Bearer <token>` header

### 4. **Backlog Delivery on Connection**
- **Change**: When connecting via SSE, clients automatically receive nudges triggered in the last 24 hours
- **Impact**: Clients catch up on missed notifications when reconnecting
- **Implementation**: Uses `triggeredAt` timestamp to accurately identify nudges triggered within the last 24 hours

## Frontend Implementation Guide

### Option 1: Use SSE for Real-Time Notifications (Recommended)

```javascript
// Connect to SSE stream
const eventSource = new EventSource(`/api/nudges/stream?accessToken=${accessToken}`);

// Handle connection
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('Connected to nudge stream');
      // You'll immediately receive backlog of missed nudges
      break;
      
    case 'nudge':
      // Display the nudge to the user
      showNudgeNotification({
        nudgeId: data.nudge._id,
        taskId: data.nudge.task,
        message: data.nudge.message,
        deliveryTime: data.nudge.deliveryTime,
        triggeredAt: data.nudge.triggeredAt  // When the nudge was actually triggered
      });
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
- Efficient (only sends when nudges are ready)

### Option 2: Poll for Triggered Nudges (Fallback)

If you prefer polling or can't use SSE:

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
        triggeredAt: nudge.triggeredAt
      });
    });
  }
}

// Poll every 60 seconds (or whatever interval you prefer)
setInterval(() => {
  fetchTriggeredNudges(accessToken);
}, 60000);
```

### Option 3: Hybrid Approach

Use SSE for real-time delivery, with polling as a fallback:

```javascript
let eventSource = null;
let pollingInterval = null;

function startNudgeNotifications(accessToken) {
  // Try SSE first
  try {
    eventSource = new EventSource(`/api/nudges/stream?accessToken=${accessToken}`);
    
    eventSource.addEventListener('message', handleNudge);
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
  }, 60000);
}

function handleNudge(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'nudge') {
    showNudgeNotification(data.nudge);
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
- [ ] Implement SSE connection or polling for triggered nudges
- [ ] Update UI to display nudge messages
- [ ] Handle backlog notifications when client reconnects
- [ ] Remove old polling logic for ready nudges (if using SSE)
- [ ] Remove any frontend calls to `scheduleNudge` endpoint (now backend-only)
- [ ] Test offline/online scenarios

## Notes

1. **Background Processing**: Nudges are automatically triggered every 60 seconds by the backend scheduler, so you don't need to manually trigger them from the frontend.

2. **Message Storage**: All triggered nudges have their messages and `triggeredAt` timestamps stored in the database, so you can retrieve them later.

3. **SSE Backlog**: The SSE endpoint automatically sends nudges from the last 24 hours when you connect (using `triggeredAt` timestamp), so you'll catch up on missed notifications.

4. **No Breaking Changes**: Existing API endpoints still work, they just now return additional data (`message` field and `triggeredAt` timestamp instead of `triggered` boolean).

5. **Polling Still Works**: You can continue using the polling approach if SSE doesn't fit your needs, but you'll need to poll `getUserNudges(status: "triggered")` instead of `getReadyNudges`.

6. **Backend-Only Endpoints**: 
   - `scheduleNudge` is now **backend-only** - nudges are automatically scheduled when tasks are created via the `AutoScheduleNudgeOnTaskCreate` sync
   - `nudgeUser` is **backend-only** - called automatically by the background scheduler
   - The frontend should not call these endpoints directly

7. **Nudge Lifecycle**:
   - Nudges are automatically scheduled when tasks are created
   - Nudges are automatically canceled when tasks are started (user doesn't need encouragement anymore)
   - Nudges are automatically canceled when tasks are deleted (cleanup)
   - Nudges are **NOT** canceled when tasks are completed (they've already served their purpose of encouraging starting)

