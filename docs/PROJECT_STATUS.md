# Flashcard Academy — Project Status

> Last updated: 2026-05-14
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
├── web/                 ← React 19 + Vite 8 + TypeScript 6 (bare scaffold, see commit eb139c9)
│   ├── React Compiler enabled (auto-memoization)
│   ├── Prettier + ESLint (replaced Biome)
│   ├── Tailwind 4 — to reinstall in Phase 2
│   ├── shadcn (Base UI) — to reinstall in Phase 2
│   └── Zod 4 — to reinstall in Phase 2
├── docker/              ← Complete Docker setup (see below)
├── docs/                ← Spec + implementation plan
├── Makefile             ← Docker commands
└── CLAUDE.md            ← Project rules (language, mobile-first, pedagogy, docker, commits, formatting)
```

**Docker setup (production-ready):**

4 containers: `api`, `web`, `caddy`, `postgres`

| File | Purpose |
|------|---------|
| `docker/.env` | Single source of truth for all versions and config |
| `docker/compose.yaml` | Base: services, networks, volumes, healthchecks |
| `docker/compose.dev.yaml` | Dev overlay: targets dev stages, volume mounts, ports |
| `docker/compose.prod.yaml` | Prod overlay: targets prod stages, security hardening |
| `docker/api/Dockerfile` | Multi-stage: base → dev (air) → build → prod (scratch) |
| `docker/web/Dockerfile` | Multi-stage: base → install → dev → build → prod (init container) |
| `docker/web/entrypoint.sh` | Runs bun install if node_modules is empty (dev only) |
| `docker/caddy/Caddyfile` | Unified config: env vars for dev/prod, API reverse proxy, frontend import |
| `docker/caddy/frontend.dev.caddy` | Dev: reverse proxy to Vite dev server |
| `docker/caddy/frontend.prod.caddy` | Prod: static file server with SPA fallback |
| `docker/README.md` | Documents the per-service layout and dev/prod selection |

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
- Prettier + ESLint for formatting + linting (replaced Biome on 2026-05-13)

**Makefile commands:**
- `make up` / `make down` — start/stop dev environment
- `APP_ENV=prod make up` — start prod environment (validate prod stack locally)
- `make rebuild` — down + build + up
- `make api` / `make web` / `make caddy` / `make postgres` — open interactive shells
- `make psql` — interactive psql session ; `make exec-psql CMD="..."` — one-shot SQL
- `make exec-api CMD="..."` / `make exec-web CMD="..."` — one-shot commands in containers
- `make fmt` — format Go (gofmt) + frontend (Prettier) + lint fix (ESLint)
- `make logs` — follow container logs
- `make check-versions` — verify versions match `.env`

## What is NOT done yet — next steps

### Phase 2: Interactive Wireframe (NEXT)

The wireframe was previously built (commit 4c7d50e) but the frontend was
reset on 2026-05-13 to start fresh. Three design variants remain available
on branches `design-v1`, `design-v2`, `design-v3` for visual reference.

Plan for the new wireframe:
- Reinstall Tailwind 4, shadcn (Base UI), Zod 4
- Decide on a router (TanStack Router or React Router v7)
- Basic shadcn components only, NO custom styling
- Fake JSON data for all entities
- Goal: validate the complete user flow interactively
- Mobile-first viewports

See implementation plan for detailed task list.

### Phases 3-6 (later)

- Phase 3: Backend API + Database (Go stdlib, Postgres)
- Phase 4: Connect wireframe to backend
- Phase 5: Deployment (OVH VPS, Cloudflare DNS)
- Phase 6: UI Design & Polish (design comes LAST)

## Key architectural decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Backend language | Go 1.26.2 stdlib only | Fast, stable, minimal deps, easy deploy, LLM-era advantage |
| Frontend | React 19 + Vite + React Compiler | Mobile-first PWA, modern, auto-memoization |
| UI library | shadcn (Base UI) — to reinstall | Headless, customizable, good defaults |
| Styling | Tailwind 4 — to reinstall | Utility-first, Rust-fast compile |
| Validation | Zod 4 — to reinstall | Schema-first, type inference |
| Runtime | Bun 1.3.12 | Fast, replaces Node + npm in one binary |
| Database | Postgres 18.3 | Robust, proven, single DB for MVP |
| Auth | Google + Apple OAuth only | Minimal friction for mobile users |
| Payments | Stripe (Billing + Tax + Portal) | Handles subscriptions + VAT automatically |
| LLM | Multi-provider interface (Claude Sonnet for generation, Haiku for validation, Ollama for dev) | Cost optimization + provider flexibility |
| Formatting | Prettier + ESLint (replaced Biome) | Vite-aligned defaults, mature ecosystem |
| Reverse proxy | Caddy | Auto HTTPS, simple config, unified dev/prod |
| Prod API image | scratch | ~15MB, minimal attack surface |
| Dev approach | Wireframe first → API → Design last | Validate flow before investing in visuals |
| Dev environment | Full-Docker (api, web, postgres, caddy) | Dev/prod parity, HTTPS local for future PWA-offline testing |
| LSP | Local (host-installed Go + Bun) | Snappier feedback than via container indirection |

## TODOs before production

These are noted in the codebase (search for `TODO`):

1. **`docker/compose.yaml`** — Migrate Postgres password to Docker secrets (`POSTGRES_PASSWORD_FILE`)
2. **`docker/.env`** — Replace `ACME_EMAIL=TODO_YOUR_EMAIL@example.com` with real email for Let's Encrypt
3. **`docker/caddy/Caddyfile`** — Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, -Server, CSP)
4. **`docker/compose.prod.yaml`** — Consider `sslmode=require` for Postgres connection in prod
5. **Structured logging** — Implement JSON logging in Go API for monitoring
6. **`docker/compose.prod.yaml`** — `SITE_ADDRESS=flashcardacademy.io` needs to be set
7. **Postgres least-privilege user (to reassess)** — API currently connects as the `postgres` superuser. Consider creating a dedicated app role with minimal privileges before prod.
8. **Extend `make fmt` to root-level `.md` files (optional)** — Prettier currently only formats `web/` (the container's mount scope). Could add a `$(COMPOSE) run --rm -v "$(PWD):/repo" -w /repo --no-deps web bunx --bun prettier --write "*.md" "docs/**/*.md"` step. Skip unless drift becomes a real problem.

## Versions (source of truth: `docker/.env`)

| Tool | Version |
|------|---------|
| Go | 1.26.2 |
| Bun | 1.3.12 |
| Caddy | 2.11.2 |
| Postgres | 18.3 |
| Air | 1.65.0 |
| React | 19.2.6 |
| Vite | 8.0.12 |
| TypeScript | 6.0.3 |
| Tailwind | 4 (to reinstall) |
| Zod | 4 (to reinstall) |
| shadcn | Base UI (to reinstall) |
| Prettier | 3.8.3 |
| ESLint | 10.3.0 |

## Recent git history

```
df51408 chore: Drop .devcontainer/ in favor of local LSP
4d21b43 chore(docker): Reorganize docker/ into per-service subdirectories
86a8b53 chore: Switch from Biome to ESLint + Prettier toolchain
d198ebc chore(web): Restore .dockerignore after scaffold reset
eb139c9 chore: Reset web/ to bare Vite + React + Compiler scaffold
4c7d50e feat: Add interactive wireframe with TanStack Router and all MVP screens
```

## Developer profile

- **Name:** Dimitri, French native speaker
- **Background:** Business school (marketing/entrepreneurship) + software engineer
- **Solo entrepreneur** on this project
- **Preferences:** ship fast, iterate, minimal, procedural code, latest versions, mobile-first
- **Conversations in French**, code/docs/commits in English
- **Always ask before executing** — especially installs, irreversible commands, commits
