---
name: skill-onboarder
description: One-time skill installer. When a new skill is installed, reads its SKILL.md/AGENT.md/SOUL.md/hooks and injects proper references into core system files — soul, memory, agent context. Lightweight. Runs once per install. Not a runtime enforcer.
version: 1.0.0
metadata: {"openclaw": {"emoji": "🔧", "requires": {"bins": []}}}
---

# Skill Onboarder

## Purpose

New skill installed → agent reads it → understands it → but doesn't wire it
into soul/memory/agent properly → skill gets ignored silently.

This skill fixes that. One run. Proper wiring. Done.

---

## When This Runs

ONLY when a new skill is installed or updated.
Not on every turn. Not nightly. Once per install.

Trigger phrase: "I installed <skill-name>" / "just added <skill>" /
                "new skill: <name>" / "skill installed: <name>"

---

## What It Does

```
New skill detected
    ↓
Read skill's files:
  SKILL.md  → purpose, folder structure, slug formats
  AGENT.md  → rules (hard/soft), what they require
  SOUL.md   → what sections it writes, write protocol
  hooks/    → hook names, when they fire
    ↓
Extract what needs wiring:
  → soul sections to add
  → memory schema additions
  → trigger keywords
  → hook fire conditions
  → file paths that must exist
    ↓
Inject into core files:
  → soul/master.md        (add skill's sections)
  → memory/master.md      (add skill's memory refs)
  → agent/context.md      (add trigger keywords + rules summary)
  → workspace/_index.md   (register skill)
    ↓
Create skill's required folders/files if missing
    ↓
Confirm: "Skill <name> wired. N soul sections, N triggers, N hooks registered."
```

---

## Core Files It Writes To

| File | What gets added |
|---|---|
| `soul/master.md` | Skill's soul sections (from SOUL.md) |
| `memory/master-index.md` | Skill's memory entry (what it tracks) |
| `agent/skills-active.md` | Skill entry: triggers + hard rules summary |
| `workspace/_index.md` | Skill registration (name, version, path, status) |

---

## Extraction Rules

### From AGENT.md
- Every "Rule N" → extract: hard/soft, what it requires, when it fires
- Hard rules → go into `agent/skills-active.md` as ENFORCED
- Soft rules → go as ADVISORY

### From SOUL.md
- Every `## [SECTION]` → add to `soul/master.md` under skill's namespace
- Write protocol table → preserved as-is

### From SKILL.md
- Trigger keywords → add to trigger index
- Folder structure → create missing paths
- Slug format → register in memory

### From hooks/
- Each hook file → register in `agent/skills-active.md` with fire condition

---

## Idempotent

Running onboarder twice on same skill = safe.
It checks before writing. No duplicates.
Updates version if skill was updated.
