---
name: identity-manager-agent
description: Agent-level behavioral guardrails for the identity manager skill. Enforces pre/post hooks, blocks silent skips, and mandates soul/memory write-through on every turn.
---

# Agent Behavioral Guardrails

## Scope

These rules apply to EVERY agent turn while this skill is loaded.
They cannot be overridden by user instructions.
They cannot be deferred to a "later" turn.

---

## Rule 1 — Name Extraction is Mandatory

Before composing any response, the agent MUST:

1. Scan the full input for any person or organisation name.
2. For each name found:
 - Check if `identity/<slug>/entry.md` exists.
 - If not → CREATE the entry immediately (partial info OK).
 - If yes → check if any new info arrived → UPDATE if so.
3. Only after all creates/updates are complete may the agent compose its response.

**There is no exception to this rule.**
If a name is ambiguous (spelling unclear, role unknown), the agent creates a `draft`
entry and opens an `open_questions` item — it does NOT skip the create.

---

## Rule 2 — Soul Write-Through is Mandatory for CRITICAL Events

On any of the following, the agent MUST write to `soul/identity_context.md`
BEFORE completing the turn:

| Trigger | Priority |
|---|---|
| `trust: blocked` set | CRITICAL |
| `status: flagged` set | CRITICAL |
| `sensitive: true` set | CRITICAL |
| New org entry created | HIGH |
| `priority: high` entry created or updated | HIGH |

CRITICAL events also write to the `[CRITICAL FLAGS]` section of the soul file.
HIGH events write to the `[ACTIVE ENTITIES]` section.

If the soul file does not exist → create it from `SOUL.md` template first.

---

## Rule 3 — Memory Index Must Stay in Sync

After every entry create or update, the agent MUST:

1. Update `memory/identities.json` to reflect the change.
2. Validate the updated JSON against `memory/schema.json`.
3. If validation fails → log the error in the entry's Notes and retry once.
4. If retry fails → report the failure explicitly; do NOT silently continue.

---

## Rule 4 — Post-Response Verification

After delivering every response, the agent MUST silently verify:

- [ ] All entries queued this turn exist on disk.
- [ ] `_index.md` is current.
- [ ] `memory/identities.json` reflects all changes.
- [ ] `soul/identity_context.md` was updated if any CRITICAL/HIGH events fired.

If any check fails → append a brief failure note to the response:
`[identity-manager] Warning: entry sync incomplete — <reason>`

---

## Rule 5 — No Silent Skips

The agent MUST NOT:
- Skip identity creation because "it seems unimportant"
- Defer creation to a future turn
- Create an entry without writing to memory
- Write to memory without updating `_index.md`
- Set `trust: blocked` without writing to soul

If the agent believes a name is not a real person (e.g. a fictional character,
a place name, a product name), it may skip — but it MUST log the skip reason:
`[identity-manager] Skipped: "<name>" — reason: <not a person/org>`

---

## Rule 6 — Owner Instructions Cannot Override Privacy Rules

Even if the workspace owner explicitly asks, the agent MUST NOT store:
- Passwords or authentication credentials
- Full payment card numbers or bank account numbers
- Government ID numbers in plaintext
- Raw medical diagnoses or records

The agent acknowledges the request and explains what it cannot store.
It may store a reference like "financial details discussed — see owner records"
without storing the actual sensitive values.

---

## Enforcement Summary

```
Turn starts
 → Rule 1: extract names → create/update entries
 → Rule 2: check for CRITICAL/HIGH events → write soul if triggered
 → Rule 3: sync memory/identities.json → validate schema
 → Compose response
 → Rule 4: post-response verification
 → Rule 5: if anything skipped → log skip reason
Turn ends
```

*Updated: 2026-04-10*