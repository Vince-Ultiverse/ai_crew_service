# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Backend (NestJS) — runs on :3000
cd backend && npm install
npm run start:dev          # watch mode
npm run build              # compile to dist/
npx tsc --noEmit           # type-check only

# Frontend (React+Vite) — runs on :5173
cd frontend && npm install
npm run dev                # vite dev server (proxies /api -> localhost:3000)
npm run build              # tsc -b && vite build

# Full stack via Docker Compose
docker-compose up -d       # postgres:5432 + backend:3000 + frontend:5173(nginx)
```

No test framework is configured. Health check: `GET /api/health`.

## Architecture

**AI Crew** orchestrates OpenClaw AI agents as Docker containers, enabling multi-agent collaborative projects with Slack integration.

```
Frontend (React/Vite :5173)
   ↕ /api proxy
Backend (NestJS :3000)
   ├── AgentsModule      → DockerModule (dockerode) → OpenClaw containers (:19000+)
   ├── ProjectsModule    → OrchestratorService (turn-based agent loop)
   ├── SlackOAuthModule  → Slack workspace OAuth + token rotation
   ├── TemplatesModule   → Reusable agent configs
   └── TypeORM           → PostgreSQL (synchronize: true, auto-migration)
```

### Backend Modules

- **AgentsModule** (`backend/src/agents/`) — CRUD + lifecycle (start/stop/restart/rebuild). Each agent is a Docker container running OpenClaw.
- **DockerModule** (`backend/src/docker/`) — Container creation, port allocation (19000+), OpenClaw config generation (`openclaw.json`), workspace file preparation (`IDENTITY.md` etc).
- **ProjectsModule** (`backend/src/projects/`) — Multi-agent collaboration. Contains:
  - `ProjectsService` — CRUD, message persistence, SSE subjects for real-time streaming
  - `OrchestratorService` — Turn-based loop: selects agent (round-robin + @mention), calls OpenClaw gateway, handles `[DONE]`/`@User` signals, failure tracking (3 retries), max-turns guard
  - `SlackProjectService` — Bidirectional Slack sync: outgoing messages via `chat.postMessage` (each agent uses own bot token), incoming via Socket Mode WebSocket
- **SlackOAuthModule** (`backend/src/slack-oauth/`) — OAuth flow for connecting agents to Slack workspaces. Manages workspace-level config tokens with auto-refresh via `tooling.tokens.rotate`.

### Frontend Structure

- **Pages**: `Dashboard`, `AgentList/Create/Detail`, `ProjectList/Create/Detail`, `Templates`
- **Routing**: React Router v6 at `src/App.tsx`
- **API client**: `src/api/client.ts` — thin fetch wrapper, all endpoints typed
- **Theme system**: `src/theme/` — Severance-inspired theme with custom labels (agents→"Innies", projects→"Refinements"). CSS-in-JS via theme functions (`pixelCard()`, `pixelButton()` etc).

### Data Flow: Agent Lifecycle

1. `AgentsService.create()` → allocates port, calls `DockerService.prepareAgentDirectory()` + `generateOpenClawConfig()` + `createContainer()`
2. Agent data stored at `backend/data/agents/{slug}/config/openclaw.json` + `workspace/IDENTITY.md`
3. Container connects to `ai_crew_network`, exposes gateway on allocated port
4. Backend proxies chat via `POST /api/agents/:id/chat` → OpenClaw gateway `/v1/chat/completions`

### Data Flow: Project Orchestration

1. `POST /projects/:id/start` → sets status=running → `OrchestratorService.startLoop()`
2. Loop: select next agent (round-robin or @mention) → build prompt (last 30 messages as context) → call agent gateway → save response → SSE broadcast → optional Slack post → 2s delay → repeat
3. Stops on: `[DONE]` signal, `@User` mention (pauses), max_turns reached, 3 consecutive failures, 5 same-agent consecutive messages

## Key Conventions

- **Global prefix**: All API routes under `/api` (`app.setGlobalPrefix('api')`)
- **Validation**: `ValidationPipe({ whitelist: true })` — DTO properties without `class-validator` decorators are silently stripped
- **Database**: TypeORM with `synchronize: true` — entity changes auto-migrate (no migration files)
- **Docker socket**: Backend mounts `/var/run/docker.sock` for container management
- **OpenClaw config**: Written to `/home/node/.openclaw` inside containers (not `/root/.openclaw`)
- **System prompt**: Written to `workspace/IDENTITY.md`, NOT stored in `openclaw.json`
- **Gateway auth**: `gateway.bind = "lan"` requires `gateway.auth.token`, otherwise falls back to loopback
- **Slack dedup**: Outgoing messages with existing `slack_ts` are skipped; incoming messages check `slack_ts` uniqueness in DB
- **Docker logs**: Multiplexed stream with 8-byte binary headers per frame — must strip before display
- **Container resources**: `container.update()` requires `MemorySwap >= Memory` (use `memoryBytes * 2`)

## Environment Variables

Key env vars (set in `.env` or `docker-compose.yml`):
- `DATABASE_URL` — PostgreSQL connection string
- `OPENCLAW_IMAGE` — Docker image for agents (default: `alpine/openclaw:latest`)
- `DOCKER_NETWORK` — Bridge network name (`ai_crew_network`)
- `HOST_DATA_DIR` — Host path for agent data volumes
- `SLACK_CONFIG_TOKEN` / `SLACK_CONFIG_REFRESH_TOKEN` — Workspace-level Slack tokens
- `SLACK_OAUTH_REDIRECT_URI` — OAuth callback URL
- `APP_BASE_URL` — Frontend URL (for CORS/redirects)
