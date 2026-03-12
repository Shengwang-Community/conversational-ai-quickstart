# Claude AI Assistant Guidelines

> **Primary Reference**: See **[AGENTS.md](./AGENTS.md)** for complete AI workflow rules and project specifications.

This file contains Claude-specific quick references and skill document pointers.

## Skill Documents (.claude/)

When working on Agora SDK integration, reference these skill documents:

| Skill | File | Keywords |
|-------|------|----------|
| Overview | `.claude/skill-overview.md` | Integration workflow, connection flow |
| RTC Integration | `.claude/skill-rtc-integration.md` | `RTC`, `audio`, `microphone`, `AgoraRTC` |
| RTM Integration | `.claude/skill-rtm-integration.md` | `RTM`, `message`, `subscribe`, `AgoraRTM` |
| ConversationalAI API | `.claude/skill-conversational-ai-api.md` | `subtitle`, `transcript`, `agent state` |

**Auto-activation**: When user mentions keywords, automatically reference the corresponding skill document.

## Quick Commands

See [AGENTS.md - Common Commands](./AGENTS.md#common-commands) for full list.

```bash
bun dev          # Start both frontend and backend
bun run lint     # Run Biome lint (required before commit)
```

## Critical Constraints

See [AGENTS.md - Key Constraints](./AGENTS.md#key-constraints) for details:

1. Frontend gets all config from backend (no env vars)
2. Backend must run on port 8000 before frontend starts
3. Run `bun run lint` before commit
4. Type-first: All code must be properly typed

## Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| [AGENTS.md](./AGENTS.md) | AI workflow + project specs | AI Agents |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture | Developers |
| [README.md](./README.md) | User guide | End users |
| `../server-python/AGENTS.md` | Backend-specific rules | AI Agents |
| `../server-python/README.md` | Backend setup | Developers |
