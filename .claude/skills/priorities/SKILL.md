---
name: priorities
description: Turns the curated GitHub Projects Kanban into actionable daily decisions. Use whenever the user asks what to work on or how to spend their time — "what's my next move", "what should I work on", "what's next", "qu'est-ce que je devrais faire", "par quoi je commence", "j'ai 1h je fais quoi", "show me quick wins", "what fits in 2 days", "plan my sprint", "audit my board", "audite ma curation" — even without the word "priority". Picks ONE issue to attack next (with rationale), surfaces quick wins ranked by Priority × small Size, audits curation drift (mismatched labels, missing fields, hierarchy degeneracy), and produces sprint plans within a time budget. The board is kept curated upstream by `create-issue` (Priority + Size set at creation). Do NOT use for: creating or triaging new issues (that's `create-issue`), modifying issues, or commenting on issues.
---

# Priorities

Turn a curated Kanban into actionable decisions. The board has the data; this skill answers "and so what?".

## Prerequisite

This skill assumes a GitHub Projects Kanban with **Priority** (P0–P3) and **Size** (XS/S/M/L/XL) custom fields set on most open issues. In this repo that holds by construction — `create-issue` sets both at creation. An uncurated board should be rare; if you hit one, the values belong in `create-issue`, not in re-triaging here.

Quick check:
```bash
gh project list --owner dimitridepardieu --format json
```

If empty → no Kanban found, which is unexpected (new issues are curated at creation via `create-issue`); confirm the project exists before proceeding.
If `missing required scopes [read:project]` → tell the user to run `gh auth refresh -s project` **in a real external terminal** (the device-code flow needs an interactive shell — Claude Code's `!` prefix won't complete it).

## Modes of operation

Read the user's prompt and pick **one** mode. Don't bundle multiple modes in one output — that reverts to the board-view problem (too much to scan). When ambiguous, default to **Next action**.

| User intent | Mode |
|---|---|
| "what should I work on", "what's next", "j'ai du temps" | Next action |
| "quick wins", "j'ai 1h", "XS tasks", "before lunch" | Quick-win finder |
| "audit", "what's miscategorized", "audite ma curation" | Curation audit |
| "sprint plan", "plan my week", "what fits in 2 days" | Sprint planning |

## Mode 1: Next action (default)

Output: **one** issue, with rationale that explains why this and not the others.

Selection:
1. Take the highest-Priority tier (P0 first; if empty, P1; etc.).
2. Within the tier, prefer smaller Size (XS before S before M).
3. Among ties, prefer items with `blocks-launch` (or whatever signal label the repo uses).
4. Cross-reference recent git activity (`git log --oneline -10`, `git branch --show-current`) — if recent work matches an open issue's area, weight it slightly up. The continuity of context shipping makes ergonomic sense.
5. If still tied, prefer the older issue (it's been waiting).

State the trade-off explicitly in the rationale — what picking this delays — so the user can push back.

```markdown
**Next action: #21 — Rate-limit /api/auth/request**

P0 · S · `security` `blocks-launch`

Why this one:
- Highest priority tier (1 of 6 P0s).
- Smallest size in tier (S; two others at XS are quick wins better suited for a 30-min slot).
- Body cites "worth wiring before the first real user" → pre-launch dep.
- Trade-off: pushes #18 (also P0/S, same scope) to next session. Cost is small — #18 is an internal log change.
```

## Mode 2: Quick-win finder

Output: 3-5 items ranked by Priority and small Size, with a total time estimate using these defaults (XS=1h, S=4h).

```markdown
### Quick wins (≈ 2 hours of total work)
1. **#17** — Move session cookie name to const — P0 · XS · `refactor`
2. **#18** — Stop logging tokens — P0 · XS · `security` `blocks-launch`
3. **#23** — Opaque JSON errors — P1 · XS · `security`

These 3 alone clear 1 P0 quick win and 2 high-value mini-tasks. Pick whichever feels closest to your current context.
```

If the user gave an explicit time budget ("j'ai 1h"), only include items that fit.

## Mode 3: Curation audit

Don't re-triage from scratch — `create-issue` sets the fields upstream. Audit means surfacing **drift** between the curation and reality:

1. **Outside the project** — open issues not added to the Kanban (they escape board views; usually created outside `create-issue`).
2. **Missing fields** — items in the project with no Priority and/or no Size set.
3. **Label/field mismatches** — at most 30 bodies skimmed for keyword signals:
   - Body mentions "blocks launch" or "before launch" but no `blocks-launch` label.
   - Body mentions GDPR/PII/auth but no `security` label.
   - Body says "production"/"deploy"/"monitoring" but no `prod-readiness` label.
   - Body says it's a refactor but labeled `enhancement`.
4. **Hierarchy degeneracy** — if more than 40% of issues sit in a single Priority tier (especially P0), the hierarchy doesn't distinguish anymore. Same for Size: if >50% are M, the size scale is collapsed.

```markdown
### Audit results

**Outside the project** (1)
- #2 — open issue not added to Kanban.

**Missing fields** (2)
- #5 — no Size set.
- #11 — no Priority set.

**Possible mismatches** (1)
- #20 is labeled `refactor` but body cites "trust erosion" + "GDPR-adjacent risk" — consider adding `security`.

**Hierarchy**
- 6 of 19 issues are P0 (32%) — healthy distribution.
- 11 of 19 are M or S (58%) — Size scale used well.
```

If everything is clean, say so plainly: "Curation is consistent — no drift detected."

## Mode 4: Sprint planning

Take a time budget (default 2 days = 16h, or whatever the user states). Map Sizes to hours:

| Size | Hours |
|---|---|
| XS | 1 |
| S | 4 |
| M | 8 |
| L | 16 |
| XL | 32 |

Greedy fill: highest-Priority items first. Fit smaller items into leftover budget after each step.

```markdown
### Sprint plan (budget: 16h ≈ 2 days)

**Fits** (~14h):
- #17 — P0 · XS (1h) · refactor
- #18 — P0 · XS (1h) · security
- #21 — P0 · S (4h) · security
- #22 — P0 · S (4h) · test
- #7 — P0 · S (4h) · ux

**Doesn't fit** (defer to next sprint):
- #9 — P0 · S (4h) — exceeds budget by 2h.

**Risk**: 5 issues queued, 3 different categories (refactor/security/ux/test) — context-switching cost not modelled. Consider grouping by category if your day-to-day has high switching cost.
```

## Fetching data

Use a single GraphQL call that joins issue content + labels + project field values (owner `dimitridepardieu`, project 3):

```bash
gh api graphql -f query='
  query($owner: String!, $project: Int!) {
    user(login: $owner) {
      projectV2(number: $project) {
        items(first: 100) {
          nodes {
            content {
              ... on Issue {
                number title body url state
                labels(first: 20) { nodes { name } }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  field { ... on ProjectV2SingleSelectField { name } }
                  name
                }
              }
            }
          }
        }
      }
    }
  }' -F owner=dimitridepardieu -F project=3
```

Iterate `fieldValues.nodes` and pick out entries where `field.name == "Priority"` or `field.name == "Size"`. The value is in the node's `name`.

For audit mode, also fetch `gh issue list --state open --json number,labels` to find issues that exist but aren't in the project (set difference).

## Failure modes

- **No project on the owner** → unexpected, since this repo's issues are curated at creation via `create-issue`; confirm the project exists and that `gh` has the `project` scope.
- **Project exists but some items lack Priority/Size** → unusual here (`create-issue` sets them), so the items were likely created outside the skill; flag the specific issues so they can be fixed.
- **`gh` lacks the `project` scope** → tell user to run `gh auth refresh -s project` in a real external terminal (interactive device-code flow).
- **Multiple projects on the owner** → ask user which to use; don't guess.
- **All P0 issues are the same Size** → the Size axis is degenerate; Next action picks by `blocks-launch` then by createdAt.

## See also
- `create-issue` — creates issues with label + Priority + Size set at creation, keeping the board curated upstream. That curation is the precondition this skill relies on.
