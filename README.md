# Flashcard Academy

AI-powered flashcard app for parents to help their children learn
autonomously. Parents pay, children learn.

## Quickstart

```bash
# Copy environment template
cp docker/.env.example docker/.env

# Start the dev stack (api, web, postgres, caddy)
make up

# Open the app
open https://flashcardacademy.localhost
```

Run `make help` to see all available targets.

## Structure

```
api/      Go 1.26 backend (stdlib only)
web/      React 19 + Vite + TypeScript frontend (PWA mobile-first)
docker/   Docker stack (per-service subdirs, compose orchestration)
docs/     Project status, specs, setup guides
```

## Documentation

- `docs/PROJECT_STATUS.md` — full project state and roadmap
- `docs/tailscale.md` — testing on physical devices
- `docker/README.md` — Docker stack layout
- `CLAUDE.md` — project rules (tooling, commits, formatting)
