---
name: identity-manager-soul
description: Soul-layer persistent context for the identity manager. Survives across sessions. Stores workspace owner context, critical flags, active high-priority entities, and relationship graph summary.
---

# Identity Manager — Soul Context

## [WORKSPACE OWNER]
<!-- Populated on first run. Do NOT hardcode. Read from workspace config. -->
- Owner name: [read from soul.owner.name]
- Company: [read from soul.owner.company]
- Workspace: [read from soul.workspace.root]
- Soul version: 2.0.0
- Initialized: YYYY-MM-DD

---

## [CRITICAL FLAGS]
<!-- Append-only. Never remove entries. Format: YYYY-MM-DD | SLUG | REASON -->
<!-- Example: 2025-01-15 | sunil-kumar | trust_blocked: supplied wrong parts -->

---

## [SENSITIVE ENTRIES]
<!-- List of slugs where sensitive: true. Do not store the sensitive data here. -->
<!-- Format: YYYY-MM-DD | SLUG | category -->

---

## [ACTIVE ENTITIES]
<!-- High-priority and org entries. Updated on create/update. -->
<!-- Format: SLUG | NAME | TYPE | RELATIONSHIP | PRIORITY | LAST_UPDATED -->

---

## [RELATIONSHIP GRAPH SUMMARY]
<!-- Key relationships between entities. Updated when linked_entries change. -->
<!-- Format: SLUG_A → RELATION → SLUG_B -->

---

## [RECENT EVENTS]
<!-- Last 20 identity events. Rolling window — oldest dropped when >20. -->
<!-- Format: YYYY-MM-DD HH:MM | EVENT_TYPE | SLUG | DETAIL -->

---

## [OPEN QUESTIONS]
<!-- Cross-entry open questions pending owner input. -->
<!-- Format: YYYY-MM-DD | SLUG | QUESTION -->

---

## [SESSION LOG]
<!-- One entry per session. Append-only. -->
<!-- Format: YYYY-MM-DD | entries_created: N | entries_updated: N | critical_events: N -->

---

## Write Protocol

The agent writes to this file following strict section rules:

| Section | Write trigger | Operation |
|---|---|---|
| `[WORKSPACE OWNER]` | First run only | Set once; never overwrite |
| `[CRITICAL FLAGS]` | `trust: blocked`, `status: flagged`, `sensitive: true` | Append only |
| `[SENSITIVE ENTRIES]` | `sensitive: true` set on any entry | Append only |
| `[ACTIVE ENTITIES]` | New org or `priority: high` entry | Upsert by slug |
| `[RELATIONSHIP GRAPH SUMMARY]` | `linked_entries` changes | Upsert by slug pair |
| `[RECENT EVENTS]` | Every identity event | Append; drop oldest when >20 |
| `[OPEN QUESTIONS]` | New open question added | Append; remove when resolved |
| `[SESSION LOG]` | End of every session | Append |

**CRITICAL FLAGS section is append-only. Entries are NEVER removed or edited.**

*Updated: 2026-04-10*