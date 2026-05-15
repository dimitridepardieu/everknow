# ADR: Database migrations are auto-applied at server boot

> Date: 2026-05-15
> Status: accepted
> Stakeholders: solo dev (Dimitri)

## Context

The API runs as a single Docker container against a single Postgres instance.
We have a custom migrations runner (`api/internal/db/migrate.go`, ~120 lines
of stdlib Go) that:

- Loads `.sql` files via `//go:embed` (so migrations ship inside the binary)
- Acquires a Postgres advisory lock so concurrent boots can't race
- Tracks applied versions in a `schema_migrations` table
- Runs each migration in a transaction

The runner is invoked from `main()` before the HTTP server starts. There is
no separate CLI command for migrations.

## Decision

Keep migrations auto-applied at server boot. No `make db-migrate` target,
no separate `./api migrate` sub-command.

The unit of deployment is the binary + its embedded migrations. They cannot
desynchronise.

## Consequences

### Positive

- **Zero steps to remember.** `docker compose up -d` is the entire deploy
  procedure. No way to deploy code v2 against schema v1.
- **Fail-fast.** If a migration is broken, the server doesn't start — health
  checks fail, the orchestrator notices, the bad deploy is visible.
- **Single artefact.** The Go binary is self-sufficient. No external migration
  tool dependency, no separate SQL bundle to ship.
- **Advisory lock already in place.** Even if multiple boots race (which
  shouldn't happen at 1 instance), only one applies migrations.

### Negative

- **No dry-run** without starting the server. To preview a migration without
  applying it, you must read the SQL file directly.
- **After `make db-reset` in dev**, the API container must be restarted to
  re-run migrations against the fresh empty DB. Mitigated by `make db-fresh`
  which chains reset + restart + seed in one command.
- **Long migrations block boot.** A migration that takes 30+ seconds will
  delay server startup and may trip orchestrator health checks. Not a concern
  yet (small tables, simple schema).

## When to revisit

Switch to a separate migrate step (CLI sub-command + init container) **when
any of these become true**:

- **Multi-instance deployment** (Docker Swarm, Kubernetes with replicas, or
  any topology where the same binary runs on multiple servers behind a load
  balancer). The advisory lock prevents data races, but every instance would
  block at boot waiting for the lock-holder to finish — bad for rolling
  deploys, bad for fast scale-up. Standard solution: a one-shot init container
  that runs `./api migrate` and exits, then the app pods/containers start
  with no migration logic in their boot path.
- **Migrations that take >30 seconds.** Health checks usually fail before
  that. Move long migrations to a maintenance window run via the CLI.
- **Need for `--dry-run` or `--target=N`** during operations. The custom
  runner is intentionally minimal; if these become real needs, either extend
  it or adopt `golang-migrate` / `goose`.

## Alternatives considered

### `make db-migrate` CLI in addition to auto-boot

Rejected. Adds a step that's never strictly required (auto-boot handles it
anyway). Vestigial commands confuse new contributors and create cargo-cult
"always run db-migrate before deploying" rituals that drift from reality.

### Replace auto-boot with `make db-migrate` only

Rejected. Adds a manual step before every deploy. For a solo dev shipping
fast on a single instance, the risk of forgetting outweighs any
"explicit > implicit" benefit. Becomes the right choice once we move to
multi-instance (see "When to revisit").

### External migration tool (`golang-migrate`, `goose`)

Rejected. Adds an external dependency for a problem the stdlib already
solves elegantly. Our runner is auditable in 120 lines of Go. The day we
need `--down` migrations, schema branching, or other advanced features, we
can adopt one of these tools. Not today.

### CI/CD pre-deploy migration step

Not applicable yet — we have no CI/CD pipeline. When we add one, the
auto-boot mechanism will continue to work; a CI step is orthogonal.
