# Agora Conversational AI Skills Overview

This project provides 4 core skills for implementing conversational AI features.

## Skills List

| Skill | File | Keywords | When to Use |
|-------|------|----------|-------------|
| RTC Integration | `skill-rtc-integration.md` | `RTC`, `audio`, `microphone`, `join channel`, `publish`, `AgoraRTC` | User asks about audio connection, joining channels, or RTC client setup |
| RTM Integration | `skill-rtm-integration.md` | `RTM`, `message`, `subscribe`, `login`, `AgoraRTM` | User asks about messaging, subscribing to channels, or RTM client setup |
| Conversational AI API | `skill-conversational-ai-api.md` | `subtitle`, `transcript`, `agent state`, `chat`, `interrupt`, `ConversationalAIAPI` | User asks about subtitle rendering, agent state monitoring, or sending messages |

## Auto-Activation Rules

**When user message contains any keyword from a skill, automatically reference that skill document.**

Examples:
- "How to join RTC channel?" → Auto-load `skill-rtc-integration.md`
- "Show agent state" → Auto-load `skill-conversational-ai-api.md`
- "Subscribe to RTM messages" → Auto-load `skill-rtm-integration.md`

## Usage

Reference skill documents in chat via `@skill-xxx.md` or let auto-activation handle it.

## Integration Order

```
1. Get Token (Backend API: /api/token)
2. RTC Integration → Join audio channel
3. RTM Integration → Subscribe message channel
4. ConversationalAIAPI → Initialize subtitle rendering
5. Start Agent (Backend API: /api/v2/startAgent)
```

## Complete Connection Flow

```typescript
async function connect(channelName: string) {
  // 1. Generate UIDs
  const uid = Math.floor(Math.random() * 9000000) + 1000
  const agentUid = Math.floor(Math.random() * 90000000) + 10000000

  // 2. Initialize RTC
  AgoraRTC.setParameter('ENABLE_AUDIO_PTS', true)
  const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

  // 3. Initialize RTM
  const rtmClient = new AgoraRTM.RTM(appId, String(uid))

  // 4. Get Token
  const token = await generateToken(channelName, String(uid), 86400, [1, 2])

  // 5. RTM Login
  await rtmClient.login({ token })

  // 6. RTC Join
  const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
  await rtcClient.join(appId, channelName, token, uid)
  await rtcClient.publish([localAudioTrack])

  // 7. RTM Subscribe
  await rtmClient.subscribe(channelName)

  // 8. Initialize ConvoAI API
  const convoAIAPI = ConversationalAIAPI.init({
    rtcEngine: rtcClient,
    rtmEngine: rtmClient,
    enableLog: true,
  })
  convoAIAPI.subscribeMessage(channelName)

  // 9. Start Agent
  const agentId = await startAgent(channelName, String(agentUid))
}
```

## Disconnect Flow

```typescript
async function disconnect() {
  // 1. Stop Agent
  await stopAgent(channelName, agentId)

  // 2. Cleanup ConvoAI
  convoAIAPI.unsubscribe()
  convoAIAPI.removeAllEventListeners()

  // 3. RTM Logout
  await rtmClient.logout()

  // 4. RTC Leave
  localAudioTrack.stop()
  localAudioTrack.close()
  await rtcClient.leave()
}
```

## Key Files

| File | Description |
|------|-------------|
| `src/services/agora-service.ts` | Complete integration example |
| `src/services/api.ts` | Backend API wrapper |
| `src/conversational-ai-api/` | Subtitle rendering module |
| `server-python/` | Backend service |
