---
name: create-issue
description: Create a GitHub issue for Flashcard Academy with full triage applied at creation (label + Priority + Size). Use whenever the user asks to "create an issue", "open a ticket", "log a bug", "add to backlog", "track this", or describes a feature/bug they want captured — even without the word "issue". Always runs a duplicate check across open AND closed issues, then lands the new issue in the project Kanban with Status, Priority, and Size set. Do NOT use for: commenting on existing issues, editing labels of issues that already exist, or batch operations across multiple issues.
---

# Create a triaged GitHub issue

Issues enter the Kanban with label, Priority, and Size set at creation. Triaging later loses the context that justified the values.

## 1. Duplicate check (always first)

```bash
gh issue list --state all --search "<keywords from the title>"
```

Both states matter — **closed issues encode what was shipped or explicitly rejected**, which is high-signal.

- **Open + same scope** → comment on the existing thread. Don't open a parallel one.
- **Closed as completed** → if the shipped behaviour matches the new intent, no new issue. If it's a real delta, open one and link back to the closed one.
- **Closed as won't-fix / not-planned** → re-opening needs a one-line justification of what changed since the original decision.

## 2. Propose the full triage block (before any `gh` mutation)

Surface to the dev and **wait for confirmation**:

- **Title** — sounds like something a user would say, not implementation jargon.
- **Body** — user-facing problem → concrete scenario → acceptance. Plain language, <30s readable for a PM. 1-2 sentences of approach for a senior dev if needed. No diff.
- **Label(s)** + one-line justification.
- **Priority** (P0–P3) + one-line justification.
- **Size** (XS–XL) + one-line justification.

## 3. Execute

```bash
# Create issue
gh issue create --title "<title>" --body "<body>"

# Add to project (lands in Status: Backlog)
gh project item-add 3 --owner dimitridepardieu --url <issue-url>

# Apply label — list existing first to avoid creating duplicates
gh label list --limit 100
gh issue edit <issue-number> --add-label "<label>"

# Set Priority and Size — discover IDs dynamically, NEVER hardcode (they change on project rebuild)
gh project field-list 3 --owner dimitridepardieu --format json
gh project item-edit --id <project-item-id> --project-id <project-id> \
  --field-id <priority-field-id> --single-select-option-id <priority-option-id>
# Same call again for Size, with the Size field-id and option-id.
```

## Creating a new label

Only when no existing label captures the issue **and** the category will recur (one-off labels are noise). Propose name + description for dev approval first.

```bash
gh label create "<name>" --description "<one-liner>"
```

Convention: lowercase, kebab-case for multi-word (`prod-readiness`, not `ProdReadiness`).
