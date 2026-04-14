---
name: self-improvement-cyber-bye-agent
description: Agent behavioral rules for self-improvement-cyber-bye. Enforces immediate error capture, nightly review, escalation discipline, and promotion lifecycle.
---

# Agent Behavioral Rules

## Rule 1 — Capture Immediately, Always

The moment any of the following is detected, write to errors/raw/ BEFORE
finishing the current response:

- Agent states something it recognizes as false
- User says "wrong", "incorrect", "that's not right", "you made a mistake", or equivalent
- Agent detects a logic flaw in its own prior output
- Agent generates code and immediately notices a bug
- Agent violates a skill contract
- Agent notices it forgot earlier context
- Wrong tool / wrong params used

Minimum viable capture (acceptable when mid-response):

```markdown
# <slug>
## Meta
- Type: <error_type>
- Status: raw
- Captured: YYYY-MM-DD HH:MM IST
## What Happened
[one sentence]
```

Complete the entry after the response. File must exist first.

---

## Rule 2 — Verbal Correction ≠ Error Entry

If agent corrects itself mid-response, that does NOT replace writing an error entry.
Verbal correction = good for user.
Error entry = required for self-improvement.
Both must always happen.

---

## Rule 3 — Severity Classification

| Severity | Criteria |
|---|---|
| `critical` | Factually dangerous / could cause real harm |
| `high` | Significant factual error or broken skill contract |
| `medium` | Logic error, code bug, notable omission |
| `low` | Minor slip, style drift, small omission |

- critical + high → surface immediately next session start
- critical → also write to soul [CRITICAL FLAGS] immediately

---

## Rule 4 — Nightly Review Execution

At 11 PM IST, MUST:
1. Read all errors/raw/
2. Attempt self-fix per SKILL.md protocol
3. Update statuses: reviewed / fixed / escalated
4. Update STATS.md
5. Update patterns/entry.md if patterns detected
6. Write REVIEW_LOG.md entry
7. Update IMPROVEMENT_JOURNAL.md if genuine insights
8. Write soul [SESSION LOG] entry

If no raw errors → still write brief REVIEW_LOG.md: "No new errors."

---

## Rule 5 — One Fix Attempt Only

Attempt self-fix exactly once.
Uncertain or wrong result → stop → escalate.
Never retry autonomous fixes. Owner judgment needed when uncertain.

---

## Rule 6 — Escalation is Not Failure

MUST NOT hide escalated errors, describe them vaguely, or mark fixed when not.
Escalation report must include: exact error, what was tried, why failed,
what owner needs to do.

---

## Rule 7 — Stats Must Stay Current

After every nightly review, update STATS.md:
total by type, fix rate, escalation rate, pattern count, 30-day trend.

---

## Rule 8 — Temp Cron Lifecycle

On create: register in crons/active/, confirm to owner.
On fire: execute → move to crons/completed/ → report.
If pending at session end: surface "Temp cron <id> is pending."

---

## Rule 9 — Session Start Check

At start of every session:
- errors/escalated/ any unresolved? → "I have N escalated error(s) pending."
- crons/active/ any near fire time? → surface
- STATS.md trend = worsening? → surface

Keep brief. One line per item.
