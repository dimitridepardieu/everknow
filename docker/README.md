# Docker setup

## Structure

```
docker/
├── .env                    # Versions, credentials, domain (gitignored)
├── .env.example            # Template — copy to .env on setup
├── compose.yaml            # Base service definitions (shared dev/prod)
├── compose.dev.yaml        # Dev overrides — volume mounts, hot reload, ports
├── compose.prod.yaml       # Prod overrides — security hardening, restart policies
├── api/
│   └── Dockerfile          # Multi-stage Go build: base → dev (air) → build → prod (scratch)
├── web/
│   ├── Dockerfile          # Multi-stage Bun build: base → install → dev → build → prod
│   └── entrypoint.sh       # Runs bun install if node_modules is empty (dev only)
└── caddy/
    ├── Caddyfile           # Top-level Caddy config (auto-TLS, /api proxy, frontend include)
    ├── frontend.dev.caddy  # Dev frontend block — reverse_proxy to Vite dev server
    └── frontend.prod.caddy # Prod frontend block — serve static dist via file_server
```

## Usage

All commands are exposed through the `Makefile` at the repo root:

```bash
make up        # Start dev stack (default APP_ENV=dev)
make down      # Stop stack
make rebuild   # Down + build + up
make logs      # Follow container logs
```

To run the prod stack locally for validation before deploy:

```bash
APP_ENV=prod make rebuild
```

## How dev/prod selection works

The Makefile composes `compose.yaml` with `compose.$(APP_ENV).yaml`, where
`APP_ENV` defaults to `dev`. The base file defines the four services
(`api`, `web`, `postgres`, `caddy`); the environment file extends or
overrides each service with environment-specific settings.

## Adding a new service

1. Create a subdirectory under `docker/` (e.g. `docker/redis/`) for any
   service-specific config or Dockerfile.
2. Add the service block to `compose.yaml`.
3. Add dev-only overrides (volumes, ports) to `compose.dev.yaml`.
4. Add prod-only overrides (security, restart) to `compose.prod.yaml`.
