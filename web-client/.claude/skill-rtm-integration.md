# Skill: RTM Integration

Agora RTM SDK integration guide for real-time messaging and subtitle data reception.

## Dependencies

```bash
bun add agora-rtm
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| RTMClient | RTM client instance |
| MessageEvent | Message event |
| PresenceEvent | Presence event (Agent state changes) |
| ChannelType | Channel type (MESSAGE/USER) |

## Standard Implementation Flow

### 1. Initialize RTM Client

```typescript
import AgoraRTM, { type RTMClient } from 'agora-rtm'

const rtmClient = new AgoraRTM.RTM(appId, String(uid))
```

### 2. Login

```typescript
// token obtained from backend /api/token (types includes 2)
try {
  await rtmClient.login({ token })
} catch (e) {
  const error = e as { code?: number }
  if (error.code === -10017) {
    // Already logged in, can ignore
  } else {
    throw e
  }
}
```

### 3. Subscribe Channel

```typescript
await rtmClient.subscribe(channelName)
```

### 4. Event Listeners

```typescript
import type { RTMEvents } from 'agora-rtm'

// Message event (subtitle data)
rtmClient.addEventListener('message', (event: RTMEvents.MessageEvent) => {
  const messageData = event.message
  
  if (typeof messageData === 'string') {
    const parsed = JSON.parse(messageData)
    // Handle message
  } else if (messageData instanceof Uint8Array) {
    const decoder = new TextDecoder('utf-8')
    const parsed = JSON.parse(decoder.decode(messageData))
    // Handle message
  }
})

// Presence event (Agent state)
rtmClient.addEventListener('presence', (event: RTMEvents.PresenceEvent) => {
  const stateChanged = event.stateChanged as {
    state?: string
    turn_id?: string
  }
  
  if (stateChanged?.state && stateChanged?.turn_id) {
    // Agent state change: idle/listening/thinking/speaking
  }
})

// Connection status
rtmClient.addEventListener('status', (event) => {
  // Handle connection state change
})
```

### 5. Send Messages (User Input)

```typescript
// Send text message to Agent
await rtmClient.publish(agentUserId, JSON.stringify({
  priority: 'interrupted',  // interrupted/append/ignore
  interruptable: true,
  message: 'Hello',
}), {
  channelType: 'USER',
  customType: 'user.transcription',
})

// Send interrupt message
await rtmClient.publish(agentUserId, JSON.stringify({
  customType: 'message.interrupt',
}), {
  channelType: 'USER',
  customType: 'message.interrupt',
})
```

### 6. Logout

```typescript
await rtmClient.logout()
```

## Message Types

| Type | Description |
|------|-------------|
| `user.transcription` | User speech-to-text |
| `assistant.transcription` | Agent response text |
| `message.interrupt` | Interrupt message |
| `message.metrics` | Performance metrics |
| `message.error` | Error message |

## Agent States

| State | Description |
|-------|-------------|
| `idle` | Idle |
| `listening` | Listening |
| `thinking` | Thinking |
| `speaking` | Speaking |
| `silent` | Silent |

## Type Definitions

```typescript
import type { RTMClient, RTMEvents, ChannelType } from 'agora-rtm'
```

## Important Notes

1. RTM login may return error code -10017 indicating already logged in, needs special handling
2. Messages can be string or Uint8Array, need to handle separately
3. Presence events are used to monitor Agent state changes
4. When sending messages, channelType 'USER' indicates peer-to-peer message

## Reference Files

- `src/services/agora-service.ts` - Complete implementation example
- `src/conversational-ai-api/type.ts` - Message type definitions
