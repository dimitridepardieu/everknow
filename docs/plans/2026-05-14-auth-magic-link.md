# Auth via Magic Link — Implementation Plan

> Date: 2026-05-14
> Status: agreed, in progress
> Scope: first feature on top of the boilerplate

## Goal

Ship a complete end-to-end auth flow using **passwordless magic links**:
1. User enters email → receives a magic link
2. Clicks link → session cookie set → redirected
3. First-time users are routed through onboarding (parent vs student)
4. Authenticated users land on `/learn` (placeholder home)

## Decisions (agreed)

| Topic | Decision | Rationale |
|---|---|---|
| Auth method | Magic link (email + token) | No password storage, no OAuth setup, mobile-friendly |
| Routing | Single domain (Duolingo style) | 1 cert, 0 CORS, simpler. Subdomain split is easy later if needed |
| Sessions | Cookie httpOnly + `sessions` table in Postgres | Revocable, auditable, ~30 LOC. Fits single-server scale |
| Postgres driver | `lib/pq` via `database/sql` | "Done" library — API immutable, no breaking changes ever expected |
| Migrations | Custom runner reading `.sql` files at boot | ~40 LOC of Go, no CLI tool, no extra dep |
| Email | `console` provider in dev (logs link), `resend` in prod | Defer Resend account creation until needed |
| User role | Choice at onboarding: `parent` \| `student` | Spec requirement; `users.role` nullable until completed |
| Mobile-first | Strict — DevTools iPhone viewport during dev | CLAUDE.md Rule 2 |
| Go architecture | Vertical slice (1 package = 1 capability) | Idiomatic Go, mirrors stdlib organization |
| PR scope | Single PR — backend + frontend together | Coherent end-to-end deliverable |
| PK strategy | `bigint generated always as identity` | No IDs exposed in URLs at MVP. Bigint = simpler, faster, easier to debug. Adopt `public_id text` per-table later if needed |

## DB Schema (BetterAuth-inspired, simplified)

Naming conventions:
- Tables: plural snake_case (`users`, `sessions`, `verifications`)
- Columns: snake_case (`user_id`, `expires_at`, etc.)
- PKs: `bigint generated always as identity`
- Timestamps: `created_at` + `updated_at` everywhere

```sql
-- 001_users.sql
CREATE TYPE user_role AS ENUM ('parent', 'student');

CREATE TABLE users (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            text,                                       -- nullable, optional later
  email           text NOT NULL UNIQUE,
  email_verified  boolean NOT NULL DEFAULT false,
  role            user_role,                                  -- NULL = onboarding pending
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 002_sessions.sql
CREATE TABLE sessions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,                           -- random base64url, value of cookie
  expires_at  timestamptz NOT NULL,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);

-- 003_verifications.sql
-- Generic table for any short-lived "proof" token: magic link today, password reset / 2FA later
CREATE TABLE verifications (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier  text NOT NULL,                                  -- for magic link: the email
  value       bytea NOT NULL,                                 -- sha256(token), never the raw token
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verifications_identifier_idx ON verifications(identifier);
-- Tokens are DELETEd on consumption (no `used_at` column for simplicity)
```

Notable deviations from BetterAuth:
- No `account` table (magic link only at MVP — added when Google/Apple OAuth comes)
- `name` is nullable (no friction at signup)
- `role` column added (our business need)
- No `image` column (not needed for MVP)

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/request` | public | `{email}` → generates token, sends magic link |
| `GET` | `/api/auth/verify?token=...` | public | Validates token, creates session, sets cookie, redirects |
| `POST` | `/api/auth/logout` | authenticated | Invalidates session, clears cookie |
| `GET` | `/api/me` | authenticated | Returns `{id, email, role, name}` |
| `PATCH` | `/api/me` | authenticated | `{role: 'parent' \| 'student'}` (onboarding) |

## Go file structure (vertical slice)

```
api/
├── main.go
├── go.mod                              ← + github.com/lib/pq
└── internal/
    ├── config/config.go                ← typed env vars
    ├── db/
    │   ├── db.go                       ← *sql.DB pool
    │   ├── migrate.go                  ← custom migrations runner
    │   └── migrations/
    │       ├── 001_users.sql
    │       ├── 002_sessions.sql
    │       └── 003_verifications.sql
    ├── email/
    │   ├── email.go                    ← Sender interface
    │   ├── console.go                  ← dev: logs link to stdout
    │   └── resend.go                   ← prod: HTTP POST to Resend API
    ├── httpx/
    │   ├── json.go                     ← Decode/Encode helpers
    │   ├── errors.go                   ← typed HTTP errors
    │   └── middleware/
    │       ├── recover.go
    │       ├── logger.go               ← slog + request ID
    │       └── auth.go                 ← cookie → ctx user
    ├── session/
    │   ├── session.go                  ← model + cookie I/O
    │   └── store.go                    ← SQL CRUD
    ├── user/
    │   ├── user.go                     ← model
    │   └── store.go                    ← SQL CRUD
    └── auth/
        ├── handlers.go                 ← all 5 endpoints
        ├── magic.go                    ← token gen, hash, validate
        └── store.go                    ← SQL CRUD verifications
```

## Frontend file structure

```
web/src/
├── routes/
│   ├── __root.tsx                     ← (existing) layout + devtools
│   ├── index.tsx                      ← landing (with redirect /learn if logged in)
│   ├── login.tsx                      ← magic link form
│   ├── register.tsx                   ← same UI as /login (different copy)
│   ├── auth.verify.tsx                ← consume ?token=, call API, redirect
│   ├── _app.tsx                       ← layout group: beforeLoad guard
│   ├── _app.onboarding.tsx            ← parent/student choice
│   └── _app.learn.tsx                 ← placeholder home
├── lib/
│   ├── api.ts                         ← fetch wrapper (credentials: include)
│   ├── auth.ts                        ← TanStack queries: useMe, useLogout, useRequestMagic
│   └── schemas.ts                     ← Zod: emailSchema, roleSchema
└── components/
    └── ui/
        ├── button.tsx                 ← (existing)
        ├── input.tsx                  ← + shadcn
        └── label.tsx                  ← + shadcn
```

## Environment variables to add

```bash
# docker/.env
APP_BASE_URL=https://flashcardacademy.localhost     # for building magic link URLs
EMAIL_PROVIDER=console                               # dev: console | prod: resend
RESEND_API_KEY=                                      # prod only
EMAIL_FROM=hello@flashcardacademy.io                # prod only
SESSION_COOKIE_NAME=fa_session
SESSION_TTL_HOURS=720                               # 30 days
MAGIC_LINK_TTL_MINUTES=15
```

## Implementation order

1. `internal/config` + `internal/db` (pool + migrations runner)
2. SQL migrations (users, sessions, verifications)
3. `internal/email` (interface + console + resend stub)
4. `internal/httpx` + middleware (recover, logger, auth)
5. `internal/session` + `internal/user` (stores)
6. `internal/auth` (magic logic + handlers)
7. Wire all routes in `main.go`
8. Add `lib/pq` to `go.mod` (`make exec-api CMD="go get github.com/lib/pq"`)
9. Frontend `lib/` (api wrapper, schemas, auth queries)
10. Frontend public routes (`login`, `register`, `auth.verify`)
11. Frontend `_app` layout group + `onboarding` + `learn`
12. Adapt landing `/` with redirect-if-logged-in
13. `make fmt` + IDE diagnostics check
14. Manual end-to-end mobile test in Chrome DevTools

## Out of scope (for follow-up PRs)

- Resend integration (interface present, console impl only)
- Rate limiting on `POST /auth/request` (TODO inline)
- `accounts` table for OAuth providers
- `child_profiles` table (next phase)
- Go tests (will get its own PR with proper test harness)
- Caddy security headers (already TODO in repo)

## Future: `verifications.type` column

The current `verifications` table has no `type` column because magic-link is the
only verification flow today. When a 2nd flow is added (email-verify, password
reset, 2FA, etc.), introduce a `verification_type` ENUM and migrate:

```sql
CREATE TYPE verification_type AS ENUM ('magic_link', 'email_verify', 'password_reset', 'two_factor');
ALTER TABLE verifications ADD COLUMN type verification_type NOT NULL DEFAULT 'magic_link';
ALTER TABLE verifications ALTER COLUMN type DROP DEFAULT;
CREATE INDEX verifications_type_identifier_idx ON verifications(type, identifier);
```

The `identifier` column stays flexible (email for magic-link, user_id for 2FA, etc.).

## Future session hardening — post-MVP, before public launch

Sessions are currently rotated on role change (the only privilege-altering
operation today). With a 1-year TTL and re-authentication only via magic
link, additional rotation triggers should ship before going public.
Listed by impact for our usage pattern:

- [ ] **Time-based ("sliding") rotation** — biggest single win. At every
      authenticated request, if the session is older than N days (suggest
      30), call `issueSession` transparently to swap the cookie. Caps the
      effective lifetime of any single token to N days rather than 1 year,
      independently of user behaviour. Requires:
      - `sessions.last_rotated_at timestamptz` column
      - check in the auth middleware (or a small helper called from there)
      - careful concurrency: a parallel request mid-rotation should still
        accept either the old or new token until the swap settles
- [ ] **Multi-device "kill all other sessions"** — extend rotation on
      role change (and other sensitive ops) to delete all other devices'
      sessions, not just the current one. Becomes relevant when we
      support more than one device per account.
- [ ] **Future sensitive-operation triggers** — when email change,
      payment-method add, or 2FA enrolment land, route them through
      `issueSession` the same way `UpdateMe` does today.
- [ ] **"Sign out from all devices" UI** — surface session revocation in
      settings. Adjacent to DSR self-service.
- [ ] **Suspicious-activity rotation** — geographic IP jumps, user-agent
      changes, repeated 401s. Requires monitoring infrastructure (geo-IP
      DB, signal aggregation). Long-term.

## GDPR Data Subject Rights (DSR) — post-MVP, before public launch

Solo dev → automation is required to not become a personal bottleneck for
compliance requests. Manual handling doesn't scale beyond a handful of users.

- [ ] `GET /api/me/export` — returns the user's full data (profile, sessions, decks, cards, ...) as a downloadable JSON
- [ ] `DELETE /api/me` — deletes the user record; sessions cascade via FK; orphan verifications by email need a sweep
- [ ] `DELETE /api/auth/sessions/:id` — revoke a specific session (for an "active devices" view)
- [ ] Settings UI: one-click "Télécharger mes données" + "Supprimer mon compte" with confirm modal
- [ ] Document log retention policy (recommended 30-90 days). Even with email redaction, IP and `user_id` are PII per CJEU *Breyer* (2016) — a written policy is required for compliance
- [ ] Privacy policy page covering: what's collected, why, how long, who has access, how to exercise DSR rights
