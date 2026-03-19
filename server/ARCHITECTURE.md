# Agora Agent Service - Backend Architecture

## Overview

Python FastAPI service providing REST APIs for Agora Conversational AI Agent management and token generation.

**Core Responsibilities**:
- Generate RTC/RTM tokens for client connections
- Start/stop AI agents with ASR, LLM, and TTS configuration
- Proxy between frontend and Agora Conversational AI API

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.8+ |
| HTTP Server | Uvicorn |
| Agent SDK | agent-server-sdk (shengwang_agent) |
| Config | python-dotenv |

## Project Structure

```
server/
├── src/
│   ├── server.py           # FastAPI app, routes, CORS
│   └── agent.py            # Agent lifecycle management
├── .env.example            # Environment template
└── requirements.txt        # Python dependencies
```

## Module Architecture

### 1. server.py - HTTP API Layer

**Responsibilities**:
- Define FastAPI application and routes
- Handle HTTP request/response
- CORS configuration
- Error handling and status codes
- Environment variable loading

**Key Components**:

```python
app = FastAPI(title="Agora Agent & Token Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

agent = Agent()  # Singleton

@router.get("/get_config")           # Generate connection config
@router.post("/v2/startAgent")       # Start AI agent
@router.post("/v2/stopAgent")        # Stop AI agent
```

### 2. agent.py - Agent Management Layer

**Responsibilities**:
- Wrap agent-server-sdk (shengwang_agent)
- Configure ASR/LLM/TTS providers
- Manage agent lifecycle (start/stop via AgentSession)
- Parameter validation

**Key Components**:

```python
from shengwang_agent import AgentClient, Area
from shengwang_agent.agentkit import Agent as AgoraAgent
from shengwang_agent.agentkit.vendors import DeepSeekLLM, MicrosoftSTT, MiniMaxTTS

class Agent:
    def __init__(self):
        self.client = AgentClient(
            area=Area.CN,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
    
    def start(channel_name, agent_uid, user_uid):
        agora_agent = AgoraAgent(
            name=name,
            instructions="...",
            greeting="...",
            advanced_features={"enable_rtm": True},
            parameters={"data_channel": "rtm", "enable_error_message": True},
        )
        agora_agent = (
            agora_agent
            .with_llm(DeepSeekLLM(...))
            .with_tts(MiniMaxTTS(...))
            .with_stt(MicrosoftSTT(...))
        )
        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=["*"],
            enable_string_uid=True,
            idle_timeout=120,
        )
        return session.start()  # returns agent_id
```

## API Endpoints

### GET /get_config

Generate connection configuration for frontend client.

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "app_id": "your_app_id",
    "token": "007eJxT...",
    "uid": "1234567",
    "channel_name": "channel_1770199765",
    "agent_uid": "58888506"
  }
}
```

**Logic**:
1. Generate random UIDs for user and agent
2. Create channel name with timestamp
3. Generate token via `generate_convo_ai_token()` (24h expiry)
4. Return configuration bundle

### POST /v2/startAgent

Start an AI agent in specified channel.

**Request**:
```json
{
  "channelName": "channel_1770199765",
  "rtcUid": "58888506",
  "userUid": "1234567"
}
```

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "agent_id": "abc-123-def-456",
    "channel_name": "channel_1770199765",
    "status": "started"
  }
}
```

### POST /v2/stopAgent

Stop a running agent.

**Request**:
```json
{
  "agentId": "abc-123-def-456"
}
```

**Response**:
```json
{
  "code": 0,
  "msg": "success"
}
```

## Configuration

### Environment Variables

Loaded from `.env.local` (priority) or `.env`:

```bash
APP_ID=your_app_id                    # Agora App ID
APP_CERTIFICATE=your_app_certificate  # Agora App Certificate
LLM_API_KEY=your_key                 # DeepSeek LLM
STT_MICROSOFT_KEY=your_key           # Microsoft Azure Speech-to-Text
STT_MICROSOFT_REGION=chinaeast2      # Azure region
TTS_MINIMAX_KEY=your_key             # MiniMax Text-to-Speech
TTS_MINIMAX_GROUP_ID=your_id         # MiniMax Group ID
PORT=8000                             # HTTP server port
```

**Note**: Uses Token007 authentication generated from `APP_ID` and `APP_CERTIFICATE`. No API_KEY/API_SECRET needed.

### Token Generation

```python
from shengwang_agent.agentkit.token import generate_convo_ai_token

token = generate_convo_ai_token(
    app_id=app_id,
    app_certificate=app_certificate,
    channel_name=channel_name,
    account=str(user_uid),
    token_expire=86400,
)
```

## Three-Tier AI Configuration

### ASR (Automatic Speech Recognition)
**Provider**: Microsoft Azure
```python
MicrosoftSTT(key=stt_key, region="chinaeast2", language="zh-CN")
```

### LLM (Large Language Model)
**Provider**: DeepSeek
```python
DeepSeekLLM(url="https://api.deepseek.com/v1/chat/completions", api_key=llm_api_key, model="deepseek-chat")
```

### TTS (Text-to-Speech)
**Provider**: MiniMax
```python
MiniMaxTTS(key=tts_key, model="speech-01-turbo", voice_setting={"voice_id": "male-qn-qingse", "speed": 1.0}, group_id=group_id)
```

## Data Flow

```
Frontend Request
    ↓
FastAPI Router (server.py)
    ↓
Agent Class (agent.py)
    ↓
agent-server-sdk (AgentSession)
    ↓
Agora REST API
    ↓
AI Agent (ASR + LLM + TTS)
    ↓
RTC/RTM Channel
    ↓
Frontend Client
```

## Integration with Frontend

Frontend connects via Next.js proxy (`proxy.ts`):

```
/api/get_config    → http://localhost:8000/get_config
/api/v2/startAgent → http://localhost:8000/v2/startAgent
/api/v2/stopAgent  → http://localhost:8000/v2/stopAgent
```

## Error Handling

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| ValueError | 400 | Invalid parameters |
| RuntimeError | 500 | SDK/API errors |
| Agent not found | 404 | Invalid agent_id |

## Dependencies

```txt
fastapi>=0.100.0          # Web framework
uvicorn>=0.20.0           # ASGI server
python-dotenv>=1.0.0      # Environment variables
agent-server-sdk          # Agora Agent SDK (shengwang_agent)
```

## Reference

- [Agora Conversational AI Docs](https://docs.agora.io/en/conversational-ai/overview)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
