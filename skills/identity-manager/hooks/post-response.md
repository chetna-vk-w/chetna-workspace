---
name: identity-post-response-hook
description: Runs after every agent response. Verifies all identity ops completed, memory is in sync, and soul was written for any CRITICAL/HIGH events. Reports any gaps.
---

# Post-Response Hook

## When This Runs
AFTER delivering the response. Before the turn ends.
Silent — no output to workspace owner unless a breach is detected.

---

## Verification Checklist

Run all checks. Log results to `memory/hook_log.jsonl`.

### Check 1 — Entries on Disk
For every slug in the pre-hook's `ops_queued` list:
- [ ] `identity/<slug>/entry.md` exists
- [ ] File was modified this turn (mtime check)

FAIL action: log breach, append warning to delivered response.

### Check 2 — _index.md Currency
- [ ] Every slug created or updated this turn appears in `_index.md`
- [ ] `_index.md` `Last updated` field is today's date

FAIL action: repair `_index.md` now. Log that repair was needed.

### Check 3 — Memory Sync
- [ ] `memory/identities.json` contains entries for all slugs touched this turn
- [ ] JSON is valid against `memory/schema.json`
- [ ] `updated` field in root JSON is today's date

FAIL action: repair and re-validate. Log repair.
If repair fails: log critical breach.

### Check 4 — Soul Write-Through (CRITICAL/HIGH only)
If any CRITICAL or HIGH soul events fired this turn:
- [ ] `soul/identity_context.md` was written
- [ ] CRITICAL events appear in `[CRITICAL FLAGS]` section
- [ ] HIGH events appear in `[ACTIVE ENTITIES]` or `[RECENT EVENTS]`

FAIL action: write soul now. Log that it was delayed.

### Check 5 — No Orphaned Open Questions
For every entry touched this turn:
- [ ] If open questions exist, they appear in `soul/identity_context.md` `[OPEN QUESTIONS]`

FAIL action: sync open questions to soul now.

---

## Hook Log Entry Format

```json
{
 "ts": "YYYY-MM-DDTHH:MM:SSZ",
 "hook": "post-response",
 "checks_passed": 5,
 "checks_failed": 0,
 "repairs_made": [],
 "breaches": [],
 "soul_verified": true
}
```

---

## Breach Reporting Format

If any check fails and cannot be repaired automatically:

```
[identity-manager] ⚠ Sync breach detected:
 - Check 3 failed: memory/identities.json write error
 - Affected slugs: [rahul-sharma]
 - Manual repair needed: re-run memory sync
```

Append this to the delivered response. Do not swallow silently.

*Updated: 2026-04-10*