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

### Rule 6: Tailwind CSS — Cursor Pointer
- Always add `cursor-pointer` to interactive elements (buttons, links, clickable cards, etc.)
- Tailwind 4 no longer adds `cursor: pointer` automatically on buttons — it must be explicit

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
