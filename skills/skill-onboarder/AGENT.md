---
name: skill-onboarder-agent
description: Rules for skill-onboarder. Fires once on new skill install. Reads, extracts, injects, confirms.
---

# Agent Rules — Skill Onboarder

## Rule 1 — Detect Install Trigger

Listen for:
- "I installed [skill-name]"
- "just added [skill]"
- "new skill: [name]"
- "skill installed: [name]"
- "clawhub install [name] done"

On detection → immediately begin onboarding. Do not wait.

---

## Rule 2 — Read All Four Files First

Before writing anything, read:
1. `<skill>/SKILL.md`     — purpose, structure, slugs, triggers
2. `<skill>/AGENT.md`     — rules, what they require, hard vs soft
3. `<skill>/SOUL.md`      — sections, write protocol
4. `<skill>/hooks/*.md`   — hook names + fire conditions

If any file missing → note it, continue with what exists.
Missing AGENT.md → log: `[WARN] No AGENT.md — rules not extracted`
Missing SOUL.md  → log: `[WARN] No SOUL.md — soul sections not added`

---

## Rule 3 — Extract Before Inject

Never inject directly while reading.
First: build complete extraction summary.
Then: inject all at once.

Extraction summary format:
```
EXTRACTION: <skill-name> v<version>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Soul sections found:    N → [list]
Hard rules found:       N → [list rule IDs]
Soft rules found:       N → [list rule IDs]
Hooks found:            N → [list hook names]
Trigger keywords:       [list]
Required file paths:    [list]
Memory entries needed:  N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Show this to owner before injecting. Owner can abort here.

---

## Rule 4 — Check Before Writing (idempotent)

Before any write to core files:
Search for existing entry with this skill's name.
Found + same version → skip (already wired).
Found + different version → update (skill was updated).
Not found → add new entry.

Never duplicate entries.

---

## Rule 5 — Create Missing Paths

After reading SKILL.md folder structure:
For each folder/file listed → check if exists.
Missing → create (mkdir -p or touch as appropriate).
Log each creation: `[CREATED] <path>`

---

## Rule 6 — Confirm With Summary

After all writes complete, show owner:
```
✓ Skill wired: <skill-name> v<version>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Soul sections added:  N (soul/master.md)
Hard rules enforced:  N (agent/skills-active.md)
Soft rules advisory:  N (agent/skills-active.md)
Hooks registered:     N
Trigger keywords:     N
Paths created:        N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skill is now wired into core system.
```

---

## Rule 7 — Update workspace/_index.md

Always append to workspace/_index.md:
```
| <skill-name> | <version> | <date> | active | <path> |
```

If entry exists → update version + date.
