# Plan: Local Native Development Setup

## Goal

Add a `compose.local.yaml` file that runs only datastores (Postgres, and later Redis, etc.) in Docker, while Go API and Bun frontend run natively on the developer's machine. This is an **alternative** to the existing full-Docker dev setup, not a replacement.

## Why

- Faster feedback loop: native `go test`, `go run`, `bun run dev` with no Docker overhead
- Native debugger access (dlv for Go, browser devtools with proper sourcemaps)
- Full LSP support (gopls, TypeScript) without container indirection
- macOS volume mount I/O overhead eliminated for api/ and web/

## Files to create or modify

### 1. `docker/compose.local.yaml` (new)

Standalone compose file — only Postgres, no dependency on `compose.yaml`.
Reads shared variables from `docker/.env` to avoid duplicating version/credentials.

```yaml
name: ${PROJECT_CODENAME}

services:
  postgres:
    image: postgres:${POSTGRES_VERSION}
    container_name: ${PROJECT_CODENAME}-postgres
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - pgdata_local:/var/lib/postgresql
    ports:
      - "${DEV_HOST:-127.0.0.1}:5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}", "-d", "${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s

volumes:
  pgdata_local:
```

Notes:
- Separate volume (`pgdata_local`) to avoid conflicts with the full-Docker dev volume.
- No networks needed — Postgres is accessed via localhost port mapping.
- Add more datastores here later (Redis, etc.) as needed.

### 2. `.mise.toml` (new, project root)

Pins Go and Bun versions for local development. Versions must match `docker/.env`.

```toml
[tools]
go = "1.26.2"
bun = "1.3.12"
```

Prerequisite: developer installs mise (https://mise.jdx.dev) once, then `mise install` in the project root.

### 3. `web/vite.config.ts` (modify)

Add a dev proxy so the frontend can reach the local Go API on the same origin.

```ts
server: {
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
```

This replaces the Caddy reverse proxy role in local dev. The existing `host`, `allowedHosts`, and `hmr` config for Docker dev should be kept (they are ignored when running Vite natively).

### 4. `Makefile` (modify)

Add targets for local dev workflow:

```makefile
COMPOSE_LOCAL = docker compose -f docker/compose.local.yaml --env-file docker/.env

local:
	$(COMPOSE_LOCAL) up -d

local-down:
	$(COMPOSE_LOCAL) down

local-clean:
	$(COMPOSE_LOCAL) down -v

local-fmt:
	cd api && gofmt -w .
	cd web && bunx --bun @biomejs/biome check --write .
```

### 5. `.env.local` or environment variables (developer setup)

When running the Go API natively, DATABASE_URL must point to localhost instead of the Docker DNS name `postgres`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
```

This can be set via a `.env.local` file loaded by the Go app, or exported in the shell, or passed inline: `DATABASE_URL=... go run .`

## Developer workflow after setup

```bash
# Start Postgres
make local

# Terminal 1 — Go API with hot-reload
cd api && air
# or: cd api && go run .

# Terminal 2 — Vite dev server
cd web && bun run dev
# → localhost:5173 (frontend)
# → localhost:5173/api/* proxied to localhost:8080

# Run tests
cd api && go test ./...

# Format
make local-fmt

# Stop Postgres
make local-down
```

## Tradeoffs

| Gained | Given up |
|--------|----------|
| Faster feedback loop (~10x for go test) | Caddy not present in dev (Vite proxy replaces it) |
| Native debugger, LSP, profiler | Must install mise + go + bun locally (one-time) |
| No Docker volume I/O overhead | Two version sources (.mise.toml + docker/.env) to keep in sync |
| Simpler mental model in dev | HTTPS not available locally (Caddy provided it via internal CA) |

## When to implement

When the current full-Docker dev setup becomes a bottleneck — slow test cycles, debugging friction, or need for native tooling (profiler, dlv, etc.).
