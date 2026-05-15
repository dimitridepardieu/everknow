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

## Risks and mitigations

Auto-on-boot is convenient but not free. Below are the risks we explicitly
considered, with mitigations and verdicts at our current scale.

### 1. Broken migration deployed by mistake

A SQL bug in a migration ships to prod, the boot fails, the app is down.

- ✅ Each migration runs in a transaction → on failure, the DB is rolled
  back, no half-applied state
- ✅ Fail-fast on boot → the orchestrator's health check fails, you can
  detect and roll back to the previous binary
- ⚠️ Missing today: CI tests that re-run all migrations against a temporary
  database. **Should be in place before the first non-test user signs up.**

### 2. Long-running migration blocking boot

`ALTER TABLE users ADD COLUMN ...` on 50M rows can take minutes. During
that time, the new binary doesn't serve, health checks fail, downtime.

- ❌ Auto-on-boot has no way to separate "migrate" from "serve"
- ✅ Risk is **nil today** (no production data, tiny tables)
- ⚠️ Becomes real around ~10k–100k rows, and is the primary trigger for
  the "switch to a separate migrate step" path described in *When to
  revisit* below

### 3. "Wrong moment" — can't deploy code without the pending migration

You want a hotfix at 14:00 but the same branch contains a risky migration
you'd rather run at 03:00 in a maintenance window.

- ❌ Auto-boot couples them by design — the binary contains both
- ✅ Workaround: cherry-pick the hotfix without the migration into a
  separate deploy. Requires git discipline.
- This trade-off is **deliberate**: coupling code and schema prevents the
  much worse "deployed v2 forgot to migrate" class of bugs. At our
  one-person, one-instance scale, scheduling rigidity is the lesser evil.

### 4. Destructive migration accident

`DROP TABLE users` ends up in a migration via copy-paste or merge mistake.
Auto-boot executes it. Data is gone.

- ❌ The runner has no "guard mode" that would refuse destructive DDL
- ✅ Universal mitigation: **automated Postgres backups** (must be in
  place before the first user signs up — it's not specific to this
  decision)
- ✅ Code review on every migration

### 5. No dry-run

You want to preview what a migration would do without applying it.

- ❌ The runner has no `--dry-run` flag
- ✅ Workaround: copy prod DB locally, apply migration, observe. Covers
  most real cases.

### Synthesis

| Risk | Today | At scale (10k+ users) | Mitigation path |
|---|---|---|---|
| Broken migration | Moderate | Low | CI integration tests |
| Long migration → downtime | Nil | **High** | Switch to CLI sub-command (cf. *When to revisit*) |
| Wrong moment | Low (solo controls deploy) | Moderate | Cherry-pick discipline, then maintenance windows |
| Destructive accident | Moderate | Low | Backups + code review (mandatory before launch) |
| No dry-run | Low | Moderate | Copy-prod-locally workflow, eventually a flag |

### The real long-term defence: Expand/Contract pattern

The most robust protection isn't about *when* migrations run, it's about
*what they do*. The industry pattern (used by GitHub, Stripe, Shopify) is
to never write a single destructive migration. Instead:

1. **Expand**: add the new schema element as nullable / additive (no
   rewrites). Old code keeps working, new code can opt in.
2. **Backfill**: a separate async script populates the new element.
3. **Migrate code**: switch the application to use the new element.
4. **Contract** (much later, as a separate deploy): once you're confident,
   drop the old element.

Each step is forward-only and reversible by re-deploying the previous
binary. Auto-on-boot + Expand/Contract is a very solid combo because no
single boot ever does anything irreversible.

We don't enforce this pattern today (we have no destructive migrations
yet), but it's the discipline to adopt before any column rename, type
change, or deletion in prod.

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
