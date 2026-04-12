# Flashcard Academy — Project Status

> Last updated: 2026-04-12
> Purpose: Give full context to any Claude Code agent joining the project.

## What is this project?

An AI-powered flashcard app targeting young parents (Instagram audience) who want their children (6-10 years old) to learn autonomously. Secondary audience: university students learning for themselves.

**Pitch:** "AI generates, parents filter, children learn."

**Key docs:**
- Product spec: `docs/superpowers/specs/2026-04-09-flashcard-academy-mvp-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-09-flashcard-academy-mvp.md`
- Project rules: `CLAUDE.md`

## What has been completed

### Phase 1: Project Setup (DONE)

**Monorepo structure:**
```
flashcardacademy/
├── api/                 ← Go 1.26.2 module (stdlib only), go.mod initialized
├── web/                 ← React 19.2 + Vite 8.0.8 + TypeScript 6.0.2
│   ├── shadcn (Base UI, Luma preset) configured
│   ├── Tailwind 4.2 configured
│   ├── Zod 4.3.6 installed
│   └── Biome 2.4.11 (replaces ESLint + Prettier)
├── docker/              ← Complete Docker setup (see below)
├── docs/                ← Spec + implementation plan
├── .devcontainer/       ← VS Code Dev Containers (api + web)
├── Makefile             ← Docker commands
└── CLAUDE.md            ← 6 rules (language, mobile-first, pedagogy, docker, commits, formatting)
```

**Docker setup (production-ready):**

4 containers: `api`, `web`, `caddy`, `postgres`

| File | Purpose |
|------|---------|
| `docker/.env` | Single source of truth for all versions and config |
| `docker/compose.yaml` | Base: services, networks, volumes, healthchecks |
| `docker/compose.dev.yaml` | Dev overlay: targets dev stages, volume mounts, ports |
| `docker/compose.prod.yaml` | Prod overlay: targets prod stages, security hardening |
| `docker/Dockerfile.api` | Multi-stage: base → dev (air) → build → prod (scratch) |
| `docker/Dockerfile.web` | Multi-stage: base → install → dev → build → prod (init container) |
| `docker/Caddyfile` | Unified config: env vars for dev/prod, API reverse proxy, frontend import |
| `docker/frontend.dev.caddy` | Dev: reverse proxy to Vite dev server |
| `docker/frontend.prod.caddy` | Prod: static file server with SPA fallback |

**Docker features implemented:**
- Multi-stage builds with named targets (dev/prod)
- BuildKit cache mounts for Go modules and Bun packages
- Cross-compilation support (ARM Mac → Intel VPS via GOARCH=$TARGETARCH)
- Network segmentation: public (caddy, api, web) + private (api, postgres)
- Postgres healthcheck with pg_isready + service_healthy dependencies
- Non-root user in prod (appuser UID 10001 for Go, bun user for web)
- SSL certificates + timezone data in scratch image
- Prod hardening: no-new-privileges, read_only, tmpfs
- Init container pattern for web prod (build → copy dist to volume → exit)
- HTTPS everywhere via Caddy (internal CA for .localhost dev, Let's Encrypt for prod)
- Compression (zstd + gzip)
- Air hot-reload for Go dev, Vite HMR through Caddy WSS for web dev
- Biome for formatting + linting (replaced ESLint + Prettier)

**Dev Containers (VS Code):**
- `.devcontainer/api/` — attaches to Go container
- `.devcontainer/web/` — attaches to Bun container
- Two separate configs because Go and Bun must be in separate containers

**Makefile commands:**
- `make up` / `make down` — start/stop dev environment
- `ENV=prod make up` — start prod environment
- `make build` / `make build-prod` — build images (prod targets linux/amd64)
- `make api CMD="..."` / `make web CMD="..."` — exec in containers
- `make fmt` — format Go (gofmt) + frontend (Biome)
- `make logs` — follow container logs
- `make check-versions` — verify versions match .env

## What is NOT done yet — next steps

### Phase 2: Interactive Wireframe (NEXT)

This is the immediate next task. Build every screen as a functional wireframe:
- Basic shadcn components only, NO custom styling
- Fake JSON data for all entities
- Goal: validate the complete user flow interactively
- Mobile-first viewports
- Start with Task 2: fake data + React Router setup

See implementation plan for detailed task list (Tasks 2-14).

### Phases 3-6 (later)

- Phase 3: Backend API + Database (Go stdlib, Postgres)
- Phase 4: Connect wireframe to backend
- Phase 5: Deployment (OVH VPS, Cloudflare DNS)
- Phase 6: UI Design & Polish (design comes LAST)

## Key architectural decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Backend language | Go 1.26.2 stdlib only | Fast, stable, minimal deps, easy deploy, LLM-era advantage |
| Frontend | React 19 PWA + Vite + shadcn (Base UI) | Mobile-first, modern, component library |
| Runtime | Bun 1.3.12 | Fast, replaces Node + npm in one binary |
| Database | Postgres 18.3 | Robust, proven, single DB for MVP |
| Auth | Google + Apple OAuth only | Minimal friction for mobile users |
| Payments | Stripe (Billing + Tax + Portal) | Handles subscriptions + VAT automatically |
| LLM | Multi-provider interface (Claude Sonnet for generation, Haiku for validation, Ollama for dev) | Cost optimization + provider flexibility |
| Formatting | Biome (replaces ESLint + Prettier) | Single tool, Rust-fast, zero config |
| Reverse proxy | Caddy | Auto HTTPS, simple config, unified dev/prod |
| Prod API image | scratch | ~15MB, minimal attack surface |
| Dev approach | Wireframe first → API → Design last | Validate flow before investing in visuals |

## TODOs before production

These are noted in the codebase (search for `TODO`):

1. **`docker/compose.yaml`** — Migrate Postgres password to Docker secrets (`POSTGRES_PASSWORD_FILE`)
2. **`docker/.env`** — Replace `ACME_EMAIL=TODO_YOUR_EMAIL@example.com` with real email for Let's Encrypt
3. **`docker/Caddyfile`** — Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, -Server, CSP)
4. **`docker/compose.prod.yaml`** — Consider `sslmode=require` for Postgres connection in prod
5. **Structured logging** — Implement JSON logging in Go API for monitoring
6. **`docker/compose.prod.yaml`** — `SITE_ADDRESS=flashcardacademy.io` needs to be set

## Versions (source of truth: `docker/.env`)

| Tool | Version |
|------|---------|
| Go | 1.26.2 |
| Bun | 1.3.12 |
| Caddy | 2.11.2 |
| Postgres | 18.3 |
| Air | 1.65.0 |
| React | 19.2.5 |
| Vite | 8.0.8 |
| TypeScript | 6.0.2 |
| Tailwind | 4.2 |
| Zod | 4.3.6 |
| Biome | 2.4.11 |
| shadcn | latest (Base UI, Luma preset) |

## Git history

```
d91a7ee perf: Add BuildKit cache mounts for Bun dependencies
ce842b0 feat: Add cross-compilation support for multi-architecture builds
eeddca5 fix: Add timezone data to prod image for spaced repetition scheduling
7558f7a perf: Add BuildKit cache mounts for Go modules
42435b7 security: Add non-root user to API prod stage
a87ba3a chore: Switch Postgres to named volume and clean up unused env vars
bd98524 chore: Production-ready Docker setup with Caddy, multi-stage builds, and security hardening
d9e8123 chore: Replace ESLint with Biome and add formatting rule
861e8a9 init: Monorepo setup with Go API, React PWA, and Docker dev environment
```

## Developer profile

- **Name:** Dimitri, French native speaker
- **Background:** Business school (marketing/entrepreneurship) + software engineer
- **Solo entrepreneur** on this project
- **Preferences:** ship fast, iterate, minimal, procedural code, latest versions, mobile-first
- **Conversations in French**, code/docs/commits in English
- **Always ask before executing** — especially installs, irreversible commands, commits
