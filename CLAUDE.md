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

#### Issue creation workflow — triage at creation, not later
Every new issue must enter the Kanban project with its category label(s), Priority, and Size set **at creation time**. Re-opening an issue a week later to triage it is when the original context is gone — the result is sloppy assignments and noisy priorities.

When asked to create an issue, propose the full triage (label, Priority, Size) **as one block** with one short justification per choice; execute the whole sequence on the developer's confirmation.

**Before creating: check for duplicates.** Run `gh issue list --state all --search "<keywords from the title>"` and skim the top hits. Both states matter: closed issues are high-signal because they encode what was already shipped or explicitly rejected. Decide based on what you find:
- **Open + same scope** → comment on the existing thread; do not open a parallel issue. Parallel threads fragment context (decisions live in one, work in the other) and force triage twice.
- **Closed as completed** → verify the shipped behaviour matches the new intent. If yes, no new issue. If the intent is a real delta, open a new issue **and** link back to the closed one in the body for context.
- **Closed as won't-fix / not-planned** → re-opening requires a one-line justification of what changed since the original decision (new constraint, new data, new stakeholder).

Skip this only if the issue is obviously novel (a feature category that doesn't exist yet in the repo). When in doubt, search.

The sequence (in order, all four steps):
1. `gh issue create` with the body following the content guidelines above.
2. `gh project item-add 3 --owner dimitridepardieu --url <issue-url>` — lands in Status `Backlog`.
3. **Apply labels**:
   - **First, list what exists**: `gh label list --limit 100`. Reuse before inventing.
   - Apply at least one label. Run `gh issue edit <N> --add-label "..."`.
   - **Creating a new label** is allowed only when no existing label genuinely captures the issue **and** the new category is likely to recur (one-off tags are noise). Propose the new label + a one-line description to the developer for approval before running `gh label create`. Follow the existing convention: **lowercase**, **kebab-case for multi-word** (e.g., `prod-readiness`, `blocks-launch`). Match the style already in the repo so the label cloud stays coherent.
4. `gh project item-edit ... --single-select-option-id ...` for Priority and Size. Discover field/option IDs via `gh project field-list 3 --owner dimitridepardieu --format json` — do not hardcode them, they change if the project is rebuilt.

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

### Rule 15: Docker env vars and DB lifecycle traps
- **`.env` changes are not picked up by `make restart`** — Docker injects env vars at container creation, not at process restart. Use `docker compose -f docker/compose.yaml -f docker/compose.dev.yaml --env-file docker/.env up -d --force-recreate <service>` (or `make rebuild`) after editing `docker/.env`. The running Go process keeps the values it had at boot.
- **Migrations only run at API boot** — `make db-reset` empties the DB but the embedded migration runner won't re-execute until the api container restarts. Use `make db-fresh` (chains reset + restart api + seed) for the dev workflow rather than calling the steps individually.

### Rule 16: Mitigate state drift in long conversations
- Your view of a file is a snapshot from the last Read. After many edits, a long conversation, or a context compaction, **re-read before modifying** — the file may have changed (linter formatting, user edits, your own earlier writes) since your snapshot. An Edit that fails on `old_string not found` is the visible failure; the silent one is editing successfully against a stale mental model and producing incoherent code.
- **Verify before asserting**: when you're about to claim "function X returns Y", "this route is wired", "this column has constraint Z", "this env var is set" — if you haven't grep'd / read / tested it in the current task, do that first. Memory of facts from earlier in the conversation drifts; the file system, the DB, and the running container are the source of truth.
- This rule is the family head of Rule 8 (IDE diagnostics after TS/TSX edits), Rule 9 (Context7 for library docs), and Rule 14 (verify review-agent claims). All four share the same defence: when in doubt, fetch reality from a source other than your own memory.

### Rule 17: Three buckets for a value (env, business const, test fixture)
Every literal in the code belongs to exactly one of these three buckets — never two, never undecided. Mis-bucketing creates either silent configurability where there should be invariants, or operator-facing noise where there should be code-local fixtures.
- **`.env` / `.env.example`** — values an **operator may configure**, that differ between environments, or that are infrastructure-dependent. Loaded via `config.Load()` and `os.Getenv`. Examples: `DATABASE_URL`, `SESSION_TTL_HOURS`, `EMAIL_PROVIDER`, `APP_BASE_URL`.
- **Business `const`** — values that are **part of a protocol or convention** and identical in every environment. Live in the package that uses them, never read from env. Examples: `SessionCookieName="fa_session"` (cookie protocol), `migrationLockKey=0x4643414d47` (advisory-lock convention).
- **Test fixture `const`** — synthetic values used **only by tests** that could be replaced with any equivalent and the test would still pass. Live in `_test.go` files or in an `internal/<x>test` package. Examples: `appBaseURL="https://test.flashcardacademy.local"` (apitest), `testEmail="alice@example.test"`.

**Decision heuristic when introducing a new literal**:
1. Could an operator ever want to change this without recompiling? → bucket 1.
2. Is this used in production code? → bucket 2.
3. Otherwise → bucket 3.

**Tells of a mis-bucketed value**:
- A test fixture in `.env.example` — pollutes operator config with values that don't actually configure anything.
- A business constant read via `os.Getenv("FOO", default)` — invites accidental override that breaks invariants nobody documented.
- A production value hard-coded in source — forces a code change + redeploy for what should be a config flip.

### Rule 18: Go architecture, Effective Go essentials & code smells (companion to Rule 13)

Rule 13 covers Go idioms at the syntax level (error wrapping, context keys, vertical slice). Rule 18 covers **what to keep an eye on when designing or reviewing Go code** — naming, package boundaries, abstraction discipline, and the smells that quietly grow into rewrites.

#### A. Effective Go essentials (the parts that matter daily)
- **Package names**: short, lowercase, no underscores, no plural (`session`, not `sessions` or `session_pkg`). The package name is part of every external reference (`session.Store`) — repeating it in type names creates `session.SessionStore` (stutter). Stutter is the #1 naming bug in Go beginners.
- **Receiver names**: 1-3 letters, consistent across all methods of a type (`func (s *Store) Create(...)` and `func (s *Store) Get(...)`, never `func (store *Store)` then `func (s *Store)` on the same type). Not `self`, not `this`.
- **Interfaces live with the consumer, not the producer**: if `auth.Handlers` needs to send emails, `auth` declares the `Sender` interface (1-method, consumer-side). `email` exports concrete `*ConsoleSender` and `*ResendSender`. This inverts the OO instinct and is the Go default — see `io.Reader`, `io.Writer`, defined in `io` (the consumer) not in `os` (the producer).
- **Small interfaces**: 1-3 methods. `io.Reader` has one. If an interface has 5+ methods, it's almost always a code smell (you're describing a class, not a capability).
- **Pointer vs value receivers**: pointer when the method mutates, when the struct is large (>4 fields you actively use), or when consistency demands it (if one method needs pointer, all methods of that type use pointer). Don't mix.
- **Doc comments**: start with the name of the identifier. `// Store persists sessions in Postgres.` not `// This is the session store.`. `go doc` relies on this.
- **`init()` is almost always a smell**: prefer explicit constructors called from `main`. `init()` runs at import time, is hard to test, and creates implicit ordering dependencies between packages.

#### B. Architecture invariants for this codebase
- **Vertical-slice direction of dependency**: domain packages (`auth`, `session`, `user`, `email`, `token`) may depend on each other in **one direction** — from "feature" to "primitive". `auth` depends on `user` and `session` (it composes them). `user` does NOT depend on `auth`. If a primitive package needs something from a feature package, the design is upside down.
- **No domain package may depend on `middleware`**: `middleware` is infra. Helpers that extract domain types from context (`UserFromContext`) belong in the domain package that owns the type, not in `middleware`.
- **Single composition root**: every `*Handlers`, `*Store`, `*Sender` is wired in exactly one place per process — `main.go` for prod, `apitest.New` for tests. Adding a second wiring point (a "factory", a "registry") needs a documented reason.
- **Each package owns its own errors**: `auth.ErrNotFound`, `session.ErrNotFound`, `user.ErrNotFound`. They are deliberately distinct: callers can `errors.Is(err, user.ErrNotFound)` without ambiguity. Don't centralise errors in a shared `errors/` package — that's the layered-architecture instinct.

#### C. Code smells — what to flag, what to fix, what to ignore at MVP

Flag in review **and** propose a fix:
- **God file** (any single `.go` file > ~400 lines, or > 6 exported types/functions). Likely two responsibilities glued together.
- **God struct** (any struct with > 8 fields, or holding a `*config.Config` pointer for only 2 values it uses). The fields probably want to be 2-3 smaller structs.
- **Stutter** (`session.SessionStore`, `user.UserService`). Always fixable, always worth fixing.
- **Interface with 1 implementation** that isn't a test seam. Speculative abstraction — delete it, use the concrete type, re-introduce the interface the day a second implementation arrives.
- **Function with > 4 parameters** (excluding `ctx`). Either group into a struct or split the function. `func Foo(ctx, a, b, c, d, e)` is a tell that `Foo` does too much.
- **Comment compensating for a bad name** (`// expire is the TTL in seconds` on a field called `expire`). Rename the field to `ttlSeconds` and delete the comment.
- **Repeated 3-tuple of arguments** across multiple functions (e.g., always passing `email, ip, userAgent` together). Data clump — promote to a struct.
- **`context.TODO()` anywhere outside a `main` package**. Either you have a context (use it) or you don't (accept `context.Background()` explicitly with a comment).

Flag with a TODO (don't necessarily fix at MVP):
- A 3-line function used once. Inlining costs nothing now; the abstraction earns its name when there's a second caller.
- A package with only 1 exported symbol used once. Maybe it belongs in the calling package.
- Tests that mock something that could be real (file system, time) when a real version is cheap.

Ignore at MVP scale (per Rule 14):
- "We could parallelize this" on a code path executed < 100x/day.
- "We could cache this" on a function whose total latency is < 50ms.
- Theoretical TOCTOU on operations the user does once per session.

#### D. Heuristics for introducing abstractions (the "rule of 2 then 3")
- **First time** you need a behaviour: write it inline.
- **Second time**: copy-paste. Yes, really. Two near-duplicates teach you the *shape* of the abstraction better than premature design.
- **Third time**: extract — and only now you know which parameters are common and which are accidental.

This is the single most important heuristic against Claude's default bias toward abstraction.

#### E. Tells that should trigger extra scrutiny

When you (Claude) encounter any of these in code you're about to write or review, **pause and re-justify**:
- "Let me extract a helper" → has this been written ≥ 3 times? If not, inline.
- "I'll add an interface for testability" → can you test with the concrete type + a real or fake instance? If yes, no interface yet.
- "I need to share this across packages" → does it belong in *both* packages (smell — wrong boundary), or in a third (likely a new vertical slice)?
- "I'll wrap this error with more context" → does the new wrapping add information the original didn't have? If not, return raw (Rule 13).
- "I'll add an options struct" → are there already ≥ 3 optional parameters? If not, just take the params directly.
- "I'll make this configurable" → can the operator legitimately want to change this? If not, it's a business const (Rule 17).

#### F. What to do when in doubt
1. **Read the stdlib**. Pick a similar problem (file I/O? look at `os` + `io`. Network? look at `net/http`.) and mirror the shape.
2. **Read the existing codebase**. If `auth` solves a similar problem one way, `user` should solve its analogous problem the same way unless there's a documented reason to diverge.
3. **Default to less**: less interface surface, fewer packages, fewer parameters, fewer abstractions. You can always add later. Removing is harder.

This rule's defaults are deliberately conservative because Claude's training-data prior is "add structure". The codebase prior is "remove structure until it hurts". Where the two conflict, the codebase wins.
