# Skill: RTC Integration

Agora RTC SDK integration guide for real-time audio/video communication.

## Dependencies

```bash
bun add agora-rtc-sdk-ng
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| IAgoraRTCClient | RTC client instance |
| IMicrophoneAudioTrack | Local microphone audio track |
| IAgoraRTCRemoteUser | Remote user |
| ConnectionState | Connection state |

## Standard Implementation Flow

### 1. Initialize RTC Client

```typescript
import AgoraRTC, { type IAgoraRTCClient } from 'agora-rtc-sdk-ng'

// Enable audio PTS (required for subtitle sync)
AgoraRTC.setParameter('ENABLE_AUDIO_PTS', true)

// Create client
const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
```

### 2. Create Local Audio Track

```typescript
const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
  AEC: true,   // Echo cancellation
  ANS: false,  // Noise suppression (recommend off for conversation)
  AGC: true,   // Auto gain control
})
```

### 3. Join Channel

```typescript
// Generate UID (recommend range: 1000-9999999)
const uid = Math.floor(Math.random() * 9000000) + 1000

// token obtained from backend /api/token
await rtcClient.join(appId, channelName, token, uid)
await rtcClient.publish([localAudioTrack])
```

### 4. Event Listeners

```typescript
// User joined
rtcClient.on('user-joined', (user) => {
  console.log(`User joined: ${user.uid}`)
})

// User published audio
rtcClient.on('user-published', async (user, mediaType) => {
  await rtcClient.subscribe(user, mediaType)
  if (mediaType === 'audio' && user.audioTrack) {
    user.audioTrack.play()
  }
})

// Connection state change
rtcClient.on('connection-state-change', (curState, revState, reason) => {
  console.log(`RTC state: ${curState}, reason: ${reason}`)
})

// Audio PTS (for subtitle sync)
rtcClient.on('audio-pts', (pts: number) => {
  // Pass to ConversationalAIAPI
})
```

### 5. Microphone Control

```typescript
// Mute/unmute
localAudioTrack.setMuted(true)  // Mute
localAudioTrack.setMuted(false) // Unmute
```

### 6. Leave Channel

```typescript
// Stop and close local audio track
localAudioTrack.stop()
localAudioTrack.close()

// Leave channel
await rtcClient.leave()
```

## Type Definitions

```typescript
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  ConnectionState,
  ConnectionDisconnectedReason,
} from 'agora-rtc-sdk-ng'
```

## Important Notes

1. `ENABLE_AUDIO_PTS` must be set before creating client, required for subtitle sync
2. User UID range: 1000-9999999, Agent UID range: 10000000-99999999
3. Must stop/close local audio track before leaving channel

## Reference Files

- `src/services/agora-service.ts` - Complete implementation example
