---
name: create-issue
description: Create a GitHub issue for Flashcard Academy with full triage applied at creation (label + milestone + Priority + Size). Use whenever the user asks to "create an issue", "open a ticket", "log a bug", "add to backlog", "track this", or describes a feature/bug they want captured — even without the word "issue". Always runs a duplicate check across open AND closed issues, reads the current milestones from GitHub rather than assuming them, then lands the new issue in the project Kanban with Status, Priority, and Size set. Do NOT use for: commenting on existing issues, editing labels of issues that already exist, or batch operations across multiple issues.
---

# Create a triaged GitHub issue

Issues enter the Kanban with label, Priority, Size, **and milestone** set at creation. Triaging later loses the context that justified the values.

## 0. Read the milestones (never hardcode them)

```bash
gh api repos/dimitridepardieu/flashcardacademy/milestones \
  --jq '.[] | "\(.number) | \(.title) — \(.description)"'
```

The set of milestones **changes over time** — new ones get created as the project moves. Never assume which ones exist, and never rely on a list written down anywhere: the description on GitHub is the only definition that counts. Read it, then pick the one whose stated goal this issue actually serves.

A milestone is a **shipping goal, not a drawer**. If the issue serves none of the existing goals, that is a signal a milestone is missing — propose one to the dev rather than forcing the issue into the least-bad fit. An issue with no milestone is invisible in the views that matter.

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
- **Body** — user-facing problem → concrete scenario → acceptance. Plain language, <30s readable for a PM. 1-2 sentences of approach for a senior dev if needed. No diff. **Keep it short**: an issue is a pillar, not a spec — the detail gets brainstormed when the issue is picked up, by an agent reading the design as it is *then*.
- **Label(s)** + one-line justification.
- **Milestone** + one-line justification (from step 0 — never from memory).
- **Priority** (read the field's actual options, see step 3) + one-line justification.
- **Size** (XS–XL) + one-line justification.

**Never reference a volatile external identifier** (Claude Design artboard IDs, screen names, paths in another repo). The design iterates constantly; an ID written today is a dangling pointer when the issue is picked up. Describe what the thing *does* — intent survives a rename. Dated snapshots (a milestone journal comment) are the one place IDs are safe, because they only ever claim to describe that day.

## 3. Execute

```bash
# Label first — list existing to avoid creating a near-duplicate
gh label list --limit 100

# Create issue, with label and milestone applied in the same call
gh issue create --title "<title>" --body "<body>" \
  --label "<label>" --milestone "<milestone title from step 0>"

# Add to project (lands in Status: Backlog), capture the item id
gh project item-add 3 --owner dimitridepardieu --url <issue-url> --format json

# Set Priority and Size — discover IDs dynamically, NEVER hardcode (they change on project rebuild).
# This also tells you which options actually exist: the Priority field may not carry every
# tier you expect, so read the options rather than assuming a P0–P3 scale.
gh project field-list 3 --owner dimitridepardieu --format json
gh project item-edit --id <project-item-id> --project-id <project-id> \
  --field-id <priority-field-id> --single-select-option-id <priority-option-id>
# Same call again for Size, with the Size field-id and option-id.
```

Verify before claiming done — an issue silently missing its milestone or Size is the failure this skill exists to prevent:

```bash
gh issue view <n> --json milestone,labels,title
```

## Creating a new label

Only when no existing label captures the issue **and** the category will recur (one-off labels are noise). Propose name + description for dev approval first.

```bash
gh label create "<name>" --description "<one-liner>"
```

Convention: lowercase, kebab-case for multi-word (`prod-readiness`, not `ProdReadiness`).
