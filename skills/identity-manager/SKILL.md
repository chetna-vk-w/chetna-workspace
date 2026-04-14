---
name: identity-manager
description: Create, update, and maintain structured identity entries for every person or org mentioned in conversation. Enforces soul/memory write-through, pre/post-response hooks, and conflict resolution. Persistent context across sessions via SOUL.md integration.
version: 2.0.0
metadata: {"openclaw": {"emoji": "🪪", "homepage": "https://clawhub.ai/skills/identity-manager", "requires": {"bins": []}}}
---

# Identity Manager Skill

## !! ENFORCEMENT CONTRACT — READ FIRST !!

This skill operates under a strict enforcement contract.
The agent MUST NOT skip, defer, or partially complete any step below.
These are not suggestions. They are hard behavioral requirements.

```
PRE-RESPONSE → scan input → extract ALL names → queue creates/updates
DURING → execute all queued ops before composing reply
POST-RESPONSE → assert every queued op completed → write soul → verify memory
BLOCKING → if any op fails, report failure; do NOT silently proceed
```

Violation of any step above is a skill contract breach.
The agent MUST flag a breach explicitly rather than silently continue.

---

## Decision Tree (runs every turn)

```
Input received
 ↓
[PRE-HOOK] Scan: any person/org name mentioned?
 ↓ YES ↓ NO
Extract all names Proceed normally
 ↓
For each name:
 → identity/<slug>/entry.md exists?
 YES → queue UPDATE
 NO → queue CREATE (partial OK)
 ↓
Execute ALL queued ops
 ↓
Compose and deliver response
 ↓
[POST-HOOK] Verify:
 → all entries exist on disk? FAIL → report breach
 → memory/identities.json updated? FAIL → report breach
 → soul/identity_context.md updated? FAIL → report breach
 ↓
Done
```

---

## Entry States

| State | Meaning | Transition |
|---|---|---|
| `draft` | Partial info | → `active` when key fields filled |
| `active` | In use | → `stale` after 90d inactivity |
| `verified` | Owner-confirmed | Maintained manually |
| `stale` | No activity 90d+ | → `archived` if owner confirms |
| `archived` | No longer relevant | Terminal; never deleted |
| `flagged` | Trust issue | → owner confirms action |
| `merged` | Was a duplicate | Terminal; points to canonical |

---

## Slug Rules

- lowercase, hyphens only, no spaces, no special characters
- Max 60 characters
- Disambiguation suffix when needed: `rahul-sharma-client`
- Org entries: `techfirm-pvt-ltd` (not `techfirm`)
- Never reuse a slug; if archived, create new with `-v2` suffix

---

## Entry Template

Full spec in `templates/entry.md`. Minimum viable create:

```markdown
# <Full Name>
## Meta
- Slug: <slug>
- Type: person | org | alias
- Status: draft
- Relationship: unknown
- Trust: unverified
- Priority: normal
- Sensitive: false
## Contact
- Email: [pending]
- Phone: [pending]
- Org: [pending]
- Alias: [pending]
## Context
[pending — who are they, why do they matter]
## Linked Entries
## Open Questions
- [ ] Confirm name spelling
- [ ] Clarify role / relationship
## Notes
## Source Log
- First mentioned: YYYY-MM-DD — [context]
## Timeline
- YYYY-MM-DD — Entry created · source: [context]
---
*Created: YYYY-MM-DD | Updated: YYYY-MM-DD | Status: draft*
```

---

## Update Triggers

| Event | Field updated | Soul event? |
|---|---|---|
| Email received | `email` | No |
| Phone mentioned | `phone` | No |
| Role revealed | `relationship`, `context` | No |
| Org mentioned | `org` + create org entry | No |
| Alias heard | `alias` | No |
| Trust blocked | `trust: blocked`, `status: flagged` | **YES — CRITICAL** |
| Relationship changed | `relationship` | No |
| Sensitive info | `sensitive: true` + `[SENSITIVE]` note | **YES — CRITICAL** |
| No activity 90d+ | `status: stale` | No |
| Duplicate confirmed | Merge → `status: merged` | No |
| High-priority entity | `priority: high` | **YES — HIGH** |
| Org entry created | New org entry | **YES — HIGH** |

---

## Conflict Resolution

### Name collision
Two people, same name → disambiguate slug with context suffix.
Cross-link both with `different_person` relation.

### Contradictory info
Never overwrite silently. Log both versions in Notes with source+date.
Open a question. Ask owner before resolving.

### Duplicate entries
Merge into older (canonical). Copy all unique fields.
Set newer: `status: merged`, `canonical: <older-slug>`.
Log merge in both timelines.

---

## Privacy Rules

**Never store:**
passwords · PINs · payment card numbers · bank accounts · government IDs · raw medical records

**Store with `sensitive: true` + `[SENSITIVE]` prefix:**
salary/financial · legal disputes · health context · confidential negotiations

**Before storing PII:**
1. Was it explicitly shared by the workspace owner?
2. Is it needed to provide value?
3. Is the source logged?

If any answer is NO → do not store; ask owner first.

---

## Folder Structure

```
identity/
 _index.md ← master registry (ALL entries listed)
 <slug>/
 entry.md
 _archived/ ← archived entries; NEVER deleted
 <slug>/
 entry.md
```

---

## _index.md Format

```markdown
# Identity Index
*Last updated: YYYY-MM-DD*

| Slug | Name | Type | Status | Relationship | Updated |
|---|---|---|---|---|---|
| rahul-sharma | Rahul Sharma | person | active | client | 2025-01-15 |
```

Update `_index.md` on EVERY create, merge, archive, or status change.

*Updated: 2026-04-10*