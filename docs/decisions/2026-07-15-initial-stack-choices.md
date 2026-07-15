# ADR: Initial stack choices — single domain, lib/pq, bigint identity keys

> Date: 2026-07-15 (recording decisions made 2026-05-14)
> Status: accepted
> Stakeholders: solo dev (Dimitri)

## Context

Three choices were made when the first feature was built on top of the
boilerplate, and their rationale lived only in `docs/plans/2026-05-14-auth-magic-link.md`
— an implementation plan whose `Status: agreed, in progress` header had been
false for two months, and which stated the role enum as `('parent', 'student')`
when the shipped schema says `('family', 'individual')`. The file is being
deleted along with the rest of the stale spec/plan docs.

The choices themselves are still in force and verified against the code on
2026-07-15. Their reasoning is not derivable from the code, and a future reader
would otherwise have to re-litigate all three from scratch. This ADR is written
retroactively for that reason.

## Decisions

### Single domain, not a subdomain split

Frontend and API are served from one domain (Duolingo-style), not `app.` +
`api.`.

> 1 cert, 0 CORS, simpler. Subdomain split is easy later if needed.

In force: `docker/caddy/Caddyfile` has a single `{$APP_DOMAIN}` block.

### `lib/pq` over `pgx`

The Postgres driver is `github.com/lib/pq`, used through `database/sql`.

> "Done" library — API immutable, no breaking changes ever expected.

The trade is deliberate: `pgx` is faster and more actively developed, but a
driver that has stopped changing is a dependency that will never need attention.
At this scale the performance difference is not observable.

In force: `github.com/lib/pq v1.12.3` in `api/go.mod`, the only non-stdlib
dependency.

### `bigint generated always as identity` primary keys

Not UUIDs, not a separate public identifier.

> No IDs exposed in URLs at MVP. Bigint = simpler, faster, easier to debug.
> Adopt `public_id text` per-table later if needed.

The escape hatch matters: the day an id lands in a URL, the fix is to add a
`public_id` column to that table, not to migrate every key in the schema.

In force: all three migrations use `bigint GENERATED ALWAYS AS IDENTITY`.

## Consequences

- Enumerable ids are acceptable **only** while none reach a URL or an API
  response. The first feature that exposes one must add `public_id` to that
  table rather than accept the leak. Deck and card ids are the near-term risk.
- The single domain means the session cookie needs no cross-origin handling.
  A future subdomain split would make that a real migration, not a config
  change.
- Should `lib/pq` ever break against a new Postgres, the answer is `pgx`, and
  `database/sql` keeps that swap small.
