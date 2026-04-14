---
name: self-improvement-cyber-bye
description: Captures errors, hallucinations, logic bugs, and user corrections immediately. Runs a nightly 11 PM IST review to attempt self-fixes. Failed fixes escalate to the workspace owner. Resolved errors promote to improvements. Supports temp crons that auto-delete after firing once.
version: 1.0.0
metadata: {"openclaw": {"emoji": "🧠", "requires": {"bins": []}}}
---

# Self-Improvement Skill

## Purpose

Give the agent a memory for its own mistakes. Capture errors the moment they
happen. Review them nightly. Try to fix what can be fixed autonomously.
Escalate what cannot. Learn from everything.

---

## Error Types

| Type | When to capture |
|---|---|
| `hallucination` | Agent stated a false fact with confidence |
| `user-correction` | User explicitly pointed out a mistake |
| `logic-error` | Flawed reasoning, wrong conclusion |
| `code-bug` | Generated code had a defect |
| `tool-misuse` | Wrong tool, wrong params, wrong sequence |
| `skill-breach` | Violated a skill contract rule |
| `behavior-drift` | Persona or behavior deviated from spec |
| `memory-gap` | Forgot earlier context in same session |
| `omission` | Failed to do something required |
| `judgment-error` | Made a bad call without factual error |

---

## Entry Status Flow

```
raw           → captured immediately, not yet reviewed
reviewed      → nightly review processed it
fix-attempted → self-fix tried this session
fixed         → self-fix succeeded
escalated     → self-fix failed or not possible → ask owner
resolved      → owner fixed and confirmed
promoted      → moved to improvements/ or bug-fixes/
```

---

## Folder Structure

```
self-improvement-cyber-bye/
  errors/
    raw/                   ← captured immediately
      YYYY-MM-DD-<type>-<slug>/entry.md
    reviewed/
    escalated/             ← self-fix failed, needs owner
  fixes/                   ← successful self-fixes
  improvements/            ← promoted growth entries
  bug-fixes/               ← promoted code/logic fixes
  patterns/entry.md        ← recurring patterns (3+ same type)
  crons/
    active/
      nightly-review.md    ← permanent 11 PM IST
      <temp-id>.md         ← temp crons (auto-delete after fire)
    completed/
  REVIEW_LOG.md
  IMPROVEMENT_JOURNAL.md
  STATS.md
```

---

## Slug Format

`YYYY-MM-DD-<type>-<3-word-desc>`
e.g. `2025-01-15-hallucination-wrong-india-capital`

---

## Immediate Capture Rule

The moment an error is detected — before any other action — write to `errors/raw/`.
Minimum viable entry first. Complete after responding. No deferral.

---

## Self-Fix Protocol (nightly review)

For each raw error:
1. Re-read the original context and the mistake.
2. Is this fixable autonomously?
   - Factual / logic / code / behavior → usually YES
   - Judgment error with unclear root cause → NO → escalate
3. YES → attempt fix → write fix entry → move to reviewed/
4. Fix fails once → move to escalated/ → do NOT retry
5. NO from step 2 → escalate directly

One attempt only. Fail once → escalate. Never loop on self-fixes.

---

## Pattern Detection

After every nightly review, scan all errors (last 30 days):
- Same error_type 3+ times → pattern detected
- Same context_area 3+ times → pattern detected
→ Write/update patterns/entry.md
→ HIGH soul event for new pattern

---

## Temp Cron Protocol

1. Create crons/active/<temp-id>.md with fire_once: true, auto_delete: true
2. On fire: execute task → move to crons/completed/ → report to owner
3. Never fire twice. Cancel → move to completed/ with status: cancelled

Temp cron ID: `temp-YYYY-MM-DD-HH-MM-<purpose-slug>`

---

## Promotion Rules

| Source | Condition | Destination |
|---|---|---|
| self-fixed | code-bug / logic-error | → bug-fixes/ |
| self-fixed | any other type | → improvements/ |
| escalated + owner resolved | code/logic | → bug-fixes/ |
| escalated + owner resolved | other | → improvements/ |
