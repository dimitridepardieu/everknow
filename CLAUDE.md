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
- Go and Bun are NOT installed locally — everything runs in Docker containers
- Use `make api CMD="..."` for Go commands (e.g., `make api CMD="go test ./..."`)
- Use `make web CMD="..."` for Bun commands (e.g., `make web CMD="bun run build"`)
- Use `make up` to start dev environment, `make down` to stop
- Files can be read and edited directly (they are volume-mounted in containers)
- Versions are defined in `docker/.env` — single source of truth

### Rule 5: Git Commits
- Use **Conventional Commits** (feat:, fix:, docs:, chore:, refactor:, test:, ci:, etc.)
- Always capitalize the first word after the prefix (e.g., `feat: Add ...`, not `feat: add ...`)
- Commit messages in **English**
- Always include a description body explaining the "why" — not just the "what"
- **Never** add Co-Authored-By lines
- Always show the proposed commit to the developer for validation before executing

### Rule 6: Tailwind CSS — Cursor Pointer
- Always add `cursor-pointer` to interactive elements (buttons, links, clickable cards, etc.)
- Tailwind 4 no longer adds `cursor: pointer` automatically on buttons — it must be explicit

### Rule 7: Code Formatting
- **Always run `make fmt` before committing** — formats both Go and TypeScript/JS/CSS/JSON
- Go: `gofmt` (built-in)
- TypeScript/JS/CSS/JSON: Biome (formatting + linting + import sorting)
- Never commit unformatted code
