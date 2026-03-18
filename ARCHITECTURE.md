# Agora Conversational AI Demo — Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 16 + React 19 + TypeScript + Agora Web SDK        │
│  (Port 3000)                                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ /api/* proxy (proxy.ts)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  Python FastAPI + Agora Agent SDK                           │
│  (Port 8000)                                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST API (Token007 auth)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Agora Cloud Services                      │
│  • RTC (Real-Time Communication — audio)                    │
│  • RTM (Real-Time Messaging — subtitles/transcription)      │
│  • Conversational AI Engine (ASR + LLM + TTS)               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Connection

```
User clicks "Start"
  → Frontend: GET /api/get_config
  → Backend: generate_convo_ai_token(app_id, app_certificate, channel, account)
  → Frontend: Join RTC channel + Login RTM with token
```

### 2. Agent Start

```
Frontend: POST /api/v2/startAgent { channelName, rtcUid, userUid }
  → Backend: Build AgoraAgent (Deepgram ASR + OpenAI LLM + ElevenLabs TTS)
  → Backend: session.start() → agent_id
  → Agent joins RTC channel → Frontend receives audio + RTM subtitles
```

### 3. Conversation

```
User speaks → RTC audio → Agora Cloud
  → Deepgram (ASR): audio → text
  → OpenAI (LLM): text → response
  → ElevenLabs (TTS): response → audio
  → RTC audio + RTM subtitles → Frontend
```

### 4. Agent Stop

```
Frontend: POST /api/v2/stopAgent { agentId }
  → Backend: session.stop()
  → Agent leaves channel → Frontend cleanup
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_config` | GET | Generate connection config (Token007, channel, UIDs) |
| `/v2/startAgent` | POST | Start AI agent |
| `/v2/stopAgent` | POST | Stop agent by agent_id |

Frontend calls these as `/api/*`, proxied to backend via `web/proxy.ts`.

## Authentication

Token007 (AccessToken2) — generated from `APP_ID` + `APP_CERTIFICATE` only. No API_KEY/API_SECRET needed. The SDK handles token generation and API auth internally.

## Detailed Documentation

- [web/ARCHITECTURE.md](./web/ARCHITECTURE.md) — Frontend architecture, components, state management
- [server/ARCHITECTURE.md](./server/ARCHITECTURE.md) — Backend architecture, endpoints, AI provider config
- [AGENTS.md](./AGENTS.md) — AI agent development guide
- [README.md](./README.md) — Quick start, configuration, deployment
