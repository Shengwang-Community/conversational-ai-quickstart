# Skill: Conversational AI API Integration

ConversationalAIAPI is the core module for subtitle rendering and Agent state management.

## Core Features

- Real-time subtitle rendering (supports text/word/chunk modes)
- Agent state monitoring
- Message sending (text/image)
- Interrupt control

## Initialization

```typescript
import { ConversationalAIAPI, EConversationalAIAPIEvents } from '@/conversational-ai-api'

// Initialize (requires RTC/RTM client created first)
const convoAIAPI = ConversationalAIAPI.init({
  rtcEngine: rtcClient,
  rtmEngine: rtmClient,
  enableLog: true,  // Enable during development
})

// Subscribe to channel messages
convoAIAPI.subscribeMessage(channelName)
```

## Event Listeners

### Transcript Updated

```typescript
import type { ITranscriptHelperItem, IUserTranscription, IAgentTranscription } from '@/conversational-ai-api/type'

convoAIAPI.on(
  EConversationalAIAPIEvents.TRANSCRIPT_UPDATED,
  (chatHistory: ITranscriptHelperItem<Partial<IUserTranscription | IAgentTranscription>>[]) => {
    // chatHistory contains all conversation records
    const transcripts = chatHistory
      .sort((a, b) => {
        if (a.turn_id !== b.turn_id) return a.turn_id - b.turn_id
        return Number(a.uid) - Number(b.uid)
      })
      .map((item) => ({
        id: `${item.turn_id}-${item.uid}-${item._time}`,
        type: Number(item.uid) !== 0 ? 'agent' : 'user',
        text: item.text || '',
        status: item.status,  // 0=in progress, 1=ended, 2=interrupted
        timestamp: item._time || Date.now(),
      }))
  }
)
```

### Agent State Changed

```typescript
import type { EAgentState } from '@/conversational-ai-api/type'

convoAIAPI.on(
  EConversationalAIAPIEvents.AGENT_STATE_CHANGED,
  (agentUserId: string, event: { state: EAgentState }) => {
    // state: idle/listening/thinking/speaking/silent
    console.log(`Agent state: ${event.state}`)
  }
)
```

### Agent Error

```typescript
convoAIAPI.on(
  EConversationalAIAPIEvents.AGENT_ERROR,
  (agentUserId: string, error: { message: string }) => {
    console.error(`Agent error: ${error.message}`)
  }
)
```

### Other Events

```typescript
// Agent interrupted
convoAIAPI.on(EConversationalAIAPIEvents.AGENT_INTERRUPTED, (agentUserId, event) => {
  console.log(`Agent interrupted: turn ${event.turnID}`)
})

// Performance metrics
convoAIAPI.on(EConversationalAIAPIEvents.AGENT_METRICS, (agentUserId, metrics) => {
  console.log(`${metrics.type} ${metrics.name}: ${metrics.value}ms`)
})

// Debug log
convoAIAPI.on(EConversationalAIAPIEvents.DEBUG_LOG, (message) => {
  console.debug(message)
})
```

## Sending Messages

### Send Text

```typescript
import { EChatMessageType, EChatMessagePriority } from '@/conversational-ai-api/type'

await convoAIAPI.chat(agentUserId, {
  messageType: EChatMessageType.TEXT,
  text: 'Hello',
  priority: EChatMessagePriority.INTERRUPTED,  // Interrupt current response
  responseInterruptable: true,
})
```

### Send Image

```typescript
await convoAIAPI.chat(agentUserId, {
  messageType: EChatMessageType.IMAGE,
  uuid: 'unique-id',
  url: 'https://example.com/image.jpg',
  // Or use base64
  // base64: 'data:image/jpeg;base64,...',
})
```

### Interrupt Agent

```typescript
await convoAIAPI.interrupt(agentUserId)
```

## Cleanup

```typescript
// Unsubscribe
convoAIAPI.unsubscribe()

// Remove all event listeners
convoAIAPI.removeAllEventListeners()

// Completely destroy (singleton pattern)
convoAIAPI.destroy()
```

## Subtitle Rendering Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `text` | Full sentence rendering | Simple scenarios |
| `word` | Word-by-word rendering (PTS sync) | High precision sync |
| `chunk` | Chunk rendering | Streaming output |

Mode is auto-detected based on received messages, no manual setting required.

## Type Definitions

```typescript
import {
  EConversationalAIAPIEvents,
  EAgentState,
  ETurnStatus,
  EChatMessageType,
  EChatMessagePriority,
  type ITranscriptHelperItem,
  type IUserTranscription,
  type IAgentTranscription,
} from '@/conversational-ai-api/type'
```

## Important Notes

1. Must initialize RTC/RTM client before initializing ConversationalAIAPI
2. `subscribeMessage` automatically binds RTC/RTM events
3. Subtitle sync depends on RTC's `audio-pts` event
4. When cleaning up, call `unsubscribe` first, then `removeAllEventListeners`

## Reference Files

- `src/conversational-ai-api/index.ts` - API implementation
- `src/conversational-ai-api/type.ts` - Type definitions
- `src/conversational-ai-api/utils/sub-render.ts` - Subtitle render controller
- `src/services/agora-service.ts` - Integration example
