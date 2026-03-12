# Agora Conversational AI Web Demo

Real-time voice conversation with AI agents, featuring live transcription and log monitoring.

## Prerequisites

- [Bun](https://bun.sh/) (package manager & script runner)
- Python 3.8+
- [Agora Account](https://console.agora.io/) with App ID & App Certificate
- API keys for: [OpenAI](https://platform.openai.com/), [ElevenLabs](https://elevenlabs.io/), [Deepgram](https://deepgram.com/)

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure backend
cd server-python
cp .env.example .env.local
# Edit .env.local with your credentials (see Configuration below)

# 3. Start services
cd ..
bun run dev
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Configuration

Edit `server-python/.env.local`:

```bash
# Agora Credentials (required)
APP_ID=your_agora_app_id
APP_CERTIFICATE=your_agora_app_certificate

# AI Service Providers (required)
ASR_DEEPGRAM_API_KEY=your_deepgram_api_key
LLM_API_KEY=your_openai_api_key
TTS_ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional
TTS_ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
TTS_ELEVENLABS_MODEL_ID=eleven_turbo_v2
PORT=8000
```

Authentication uses Token007 (AccessToken2), generated automatically from `APP_ID` and `APP_CERTIFICATE`. No separate API_KEY/API_SECRET needed.

Frontend gets all configuration from the backend API — no environment variables required on the frontend side.

## Commands

```bash
bun run dev          # Start both frontend and backend
bun run backend      # Backend only (port 8000)
bun run frontend     # Frontend only (port 3000)
bun run build        # Build frontend for production
bun run clean        # Clean build artifacts and venvs
```

## Project Structure

```
.
├── web-client/       # Frontend — Next.js 16 + React 19 + TypeScript + Agora Web SDK
├── server-python/    # Backend — Python FastAPI + Agora Agent SDK
├── ARCHITECTURE.md   # System architecture and data flow
└── AGENTS.md         # AI agent development guide
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| Connection issues | Backend running on port 8000? |
| Auth errors | `APP_ID` and `APP_CERTIFICATE` correct in `.env.local`? |
| Agent fails to start | AI provider API keys valid? Check logs at http://localhost:8000/docs |
| Frontend can't reach backend | Proxy config in `web-client/proxy.ts` |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flow
- [AGENTS.md](./AGENTS.md) — AI agent development guide
- [web-client/](./web-client/) — Frontend details
- [server-python/](./server-python/) — Backend details

## License

See [LICENSE](./LICENSE).
