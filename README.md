# Flashcard Academy

AI-powered flashcard app for parents to help their children learn
autonomously.

## Prerequisites

Make sure you have these installed:

- **Git**
- **Docker** (with Compose plugin)
- **Make**

**Optional** (snappier IDE autocomplete): Go and Bun. NOT required —
everything runs in Docker. If installed, **never** run `bun install`
or `go install` on your host (it pollutes `node_modules` with host-OS
binaries that crash the Linux container). See `CLAUDE.md`.

## First-time setup

```bash
# 1. Clone the repo
git clone <repo-url> flashcardacademy
cd flashcardacademy

# 2. Copy the environment template (edit docker/.env if you want custom values)
cp docker/.env.example docker/.env

# 3. Start the dev stack — pulls images and installs deps in containers (~2 min the first time)
make up

# 4. Trust the local HTTPS cert (macOS only, one-time, prompts sudo)
make trust-caddy-ca

# 5. Open the app
open https://flashcardacademy.localhost
```

If you skip step 4, the app still works but Chrome/Safari will warn
`ERR_CERT_AUTHORITY_INVALID`. You can run it anytime to clear the
warning — restart your browser afterwards.

## Daily commands

```bash
make help                        # List all targets with colored sections
make up / make down              # Start / stop the stack
make rebuild                     # After a Dockerfile or major dep change
make logs                        # Follow logs from all containers
make fmt                         # Format + lint-fix everything (run before commit)
make test                        # Run all tests
make api CMD="go test ./..."     # Run any Go command in the api container
make web CMD="bun add <pkg>"     # Run any Bun command in the web container
```

## Project structure

```
api/      Go backend (stdlib only)
web/      React + Vite + TypeScript frontend (PWA mobile-first)
docker/   Docker stack — per-service subdirs + compose files
docs/     Project status, specs, setup guides
```

## Troubleshooting

**`make up` fails with "port already in use"**
Another process holds port 80, 443, 5173, 8080, or 5432. Find it with
`lsof -i :443` (replace port), stop it, or change `DEV_HOST` in
`docker/.env`.

**Browser keeps warning `ERR_CERT_AUTHORITY_INVALID`**
Run `make trust-caddy-ca`, then **restart your browser fully** (Chrome
caches the trust store in memory across reloads).

**Vite crashes on start with "Cannot find native binding"**
You ran `bun install` locally and Docker is now mounting macOS/Windows
binaries into the Linux container. Fix:
`rm -rf web/node_modules && make restart`.

**Stack starts but app shows 502 Bad Gateway**
The api or web container is still booting. Run `make logs` to watch.
First `make up` after `make clean` triggers `bun install` in the web
container — wait ~15s.

## Documentation

- `docs/PROJECT_STATUS.md` — full project state and roadmap
- `docs/tailscale.md` — testing on physical devices (iPhone, iPad)
- `docker/README.md` — Docker stack internals (compose, Dockerfiles)
- `CLAUDE.md` — project rules (language, tooling, commits, formatting)
