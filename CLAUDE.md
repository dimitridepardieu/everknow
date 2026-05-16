# Flashcard Academy

## Rules

### Rule 1: Language Convention
- All conversations with the developer are in **French** (developer's native language)
- All code, comments, documentation, issues, pull requests, and technical artifacts are in **English**

### Rule 2: Mobile-First Development
- All frontend development must be **mobile-first**
- Design and test on mobile viewports first, then adapt for desktop
- This is the primary target: parents and children on smartphones

### Rule 3: Pedagogical Approach
- Be educational: explain the "why" behind technical choices, not just the "what"
- Have strong opinions, but always explain the reasoning and trade-offs
- Let the developer make the final decision — never execute without approval
- Ask before installing any dependency or running any irreversible command

### Rule 4: Command Execution (Docker)
- Go and Bun **may** be installed locally for IDE/LSP support (gopls, tsserver) — but **all commands must run in Docker containers**, never directly on the host
- **For one-shot commands (the AI's primary mode), always use `exec-<service>` with `CMD`:**
  - `make exec-api CMD="go test ./..."` for Go commands
  - `make exec-web CMD="bun run build"` for Bun commands
  - `make exec-psql CMD="SELECT ..."` for SQL queries (no password needed — connects via Unix socket inside the container)
  - `make exec-postgres CMD="..."` / `make exec-caddy CMD="..."` for raw container commands
- **Bare targets (`make api`, `make web`, `make caddy`, `make postgres`, `make psql`) open interactive shells** — for the human developer, NOT for the AI. Do not use them to run scripted commands; they will spawn a shell and block.
- Use `make up` to start dev environment, `make down` to stop
- Files can be read and edited directly (they are volume-mounted in containers)
- Versions are defined in `docker/.env` — single source of truth (host versions may diverge slightly on patch level, harmless for LSP)
- Never run `bun install` or `go install` on the host: it produces host-OS binaries inside `node_modules` / `$GOPATH` that conflict with the container (Linux) binaries on volume-mounted paths

### Rule 5: Git Commits
- Use **Conventional Commits** (feat:, fix:, docs:, chore:, refactor:, test:, ci:, etc.)
- Always capitalize the first word after the prefix (e.g., `feat: Add ...`, not `feat: add ...`)
- Commit messages in **English**
- Always include a description body explaining the "why" — not just the "what"
- **Never** add Co-Authored-By lines

### Rule 7: Code Formatting
- **Always run `make fmt` before committing** — formats both Go and TypeScript/JS/CSS/JSON
- Go: `gofmt` (built-in)
- TypeScript/JS/CSS/JSON: Prettier (formatting + import sorting via `@trivago/prettier-plugin-sort-imports`) + ESLint (with `--fix`)
- Never commit unformatted code

### Rule 8: IDE Diagnostics
- After modifying TypeScript / TSX / CSS / JSON config files, call `mcp__ide__getDiagnostics` to surface LSP warnings the developer sees in VS Code but that `tsc` and ESLint may not flag (deprecation notices, soon-removed APIs, missing types, unused imports flagged only by the language server)
- Especially valuable for "compiles fine but will break in TS N+1" warnings (e.g., `baseUrl` deprecation in TS 6) — these are invisible to CI but visible to the developer's IDE

### Rule 9: Library Documentation
- For any library / framework / SDK / CLI tool reference (React 19, Tailwind v4, shadcn, Vite 8, Bun, etc.), use `mcp__claude_ai_Context7__resolve-library-id` + `query-docs` instead of relying on training-data memory
- The project's stack uses bleeding-edge versions whose APIs may have changed since my last training cutoff — Context7 returns current official docs
- Skip Context7 only for general programming concepts, refactors, or business logic where lib-specific knowledge isn't the issue

### Rule 10: Structured Logging
- Use `slog.InfoContext` / `slog.WarnContext` / `slog.ErrorContext` (not bare `slog.Info`) so request_id, user_id, and other ctx-scoped attributes propagate properly
- Log **business events explicitly in services** (`magic link sent`, `user role updated`), not just HTTP requests in middleware
- Use slog **attributes** as `(key, value)` pairs, never embed values in the message string (`"user role updated", "user_id", id` not `fmt.Sprintf("user %d updated", id)`)
- The middleware logger automatically includes `user_id` when authenticated; services should add it manually for business events
- **Never log**: request bodies, tokens (session, magic-link, JWT), raw cookies, passwords, API keys
- For PII handling in logs, see Rule 11

### Rule 11: PII Handling (GDPR)
- The following are **PII under GDPR Art. 4** and must be treated with care: email, name, phone number, IP address, user agent, geolocation, child profile data, any free-text user content
- **In logs**: PII must be redacted in prod via `RedactEmail()` (or equivalent helper). Dev keeps clear values for debugging convenience — `cfg.IsDev()` is the gate
- **In API responses**: only return a user's own PII; never expose another user's PII (always scope by `user_id` from context)
- **In DB**: storage is legitimate under Art. 6.1.b (necessary for contract execution), but every user must be able to **export** and **delete** their own data — see DSR endpoints in `docs/plans/`
- **In error messages to the client**: never echo PII back when avoidable (`"invalid email"` not `"user@example.com is invalid"`)
- When in doubt: **don't log it, don't return it** — data minimisation (Art. 5.1.c) is the default
- IP addresses and `user_id` are PII per CJEU *Breyer* (2016) even when the email is redacted — log retention policy still required before prod

### Rule 12: GitHub Issues & Pull Requests
- **Audience-first**: issues and PRs must be readable by both **non-developers** (PM, designer, end-user) **and** senior devs. A PM should grasp the goal in under 30 seconds
- **Issues**: frame the user-facing problem or value, not the implementation. Plain language, concise, no jargon. Title should sound like something a user would say
- **PRs**: same accessibility as issues, plus **just enough** technical context for a senior dev to understand the approach (1–2 sentences). **Do NOT duplicate the code in the description** — implementation details live in the diff
- PR body structure: *what changes* (user-visible) → *why* (problem solved) → *key approach* (high-level) → *notable trade-offs* only if material
- English (Rule 1), no emojis unless requested, no auto-generated boilerplate sections

### Rule 13: Go Idioms & Anti-Overengineering
- **Default to stdlib patterns**: when in doubt, mirror how `net/http`, `database/sql`, `errors`, `context` solve the same problem. Effective Go is the baseline; deviate only with a documented reason.
- **Wrap errors only when adding context** (an ID, a path). `fmt.Errorf("open db: %w", err)` over a `sql.Open` error that already says "open db" creates noise like `"open db: open db: ..."`. Return `err` raw when no new info is available.
- **YAGNI on visibility and signatures**: don't export what no caller imports; don't return what callers always `_`-discard. Both broadcast intent the code doesn't have.
- **Context keys = `type k struct{}`** with `ctx.Value(k{})` at read sites. Zero allocation, collision-proof — what the stdlib `context` package docs show.
- **Vertical-slice packages** (1 package = 1 capability — `auth`, `session`, `user`, each owning handlers + business logic + DB queries). Avoid `handlers/`, `services/`, `repositories/` layering — Java/C# muscle memory with no value at our scale.

### Rule 14: Calibrate Review-Agent Findings for MVP Scale
- Review agents are calibrated for "production at scale". **Filter every finding** by probability × impact, vs complexity of the fix. At 0 users many findings are real but disproportionate.
- Prefer **accepting a rare edge case** with an inline TODO over adding abstraction to make it impossible. Two simple functions that may race annually beat one "elegant atomic" upsert.
- When pushing back on a finding, explain probability + impact + alternative. The dev decides; the agent is a peer, not an authority.

### Rule 16: Mitigate state drift in long conversations
- Your view of a file is a snapshot from the last Read. After many edits, a long conversation, or a context compaction, **re-read before modifying** — the file may have changed (linter formatting, user edits, your own earlier writes) since your snapshot. An Edit that fails on `old_string not found` is the visible failure; the silent one is editing successfully against a stale mental model and producing incoherent code.
- **Verify before asserting**: when you're about to claim "function X returns Y", "this route is wired", "this column has constraint Z", "this env var is set" — if you haven't grep'd / read / tested it in the current task, do that first. Memory of facts from earlier in the conversation drifts; the file system, the DB, and the running container are the source of truth.
- This rule is the family head of Rule 8 (IDE diagnostics after TS/TSX edits), Rule 9 (Context7 for library docs), and Rule 14 (verify review-agent claims). All four share the same defence: when in doubt, fetch reality from a source other than your own memory.

### Rule 15: Docker env vars and DB lifecycle traps
- **`.env` changes are not picked up by `make restart`** — Docker injects env vars at container creation, not at process restart. Use `docker compose -f docker/compose.yaml -f docker/compose.dev.yaml --env-file docker/.env up -d --force-recreate <service>` (or `make rebuild`) after editing `docker/.env`. The running Go process keeps the values it had at boot.
- **Migrations only run at API boot** — `make db-reset` empties the DB but the embedded migration runner won't re-execute until the api container restarts. Use `make db-fresh` (chains reset + restart api + seed) for the dev workflow rather than calling the steps individually.
