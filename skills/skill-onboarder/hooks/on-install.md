---
name: skill-onboarder-on-install
description: Main hook. Fires once when new skill install detected. Reads → extracts → injects → confirms.
---

# On-Install Hook

## Phase 1 — READ

```
Read <skill>/SKILL.md:
  - name, version
  - folder structure block → extract all paths
  - slug format → note it
  - any "Trigger" mentions → extract keywords

Read <skill>/AGENT.md:
  - for each "## Rule":
    - rule text
    - hard if: MUST/ALWAYS/NEVER/CANNOT/SHALL → level: hard
    - soft if: SHOULD/RECOMMEND/PREFER/AVOID → level: soft
    - what it requires: file write / hook / check / gate
    - when it fires: every_turn / on_condition / time_based

Read <skill>/SOUL.md:
  - for each "## [SECTION NAME]":
    - section name
    - format comment (<!-- Format: ... -->)
    - write trigger (from Write Protocol table)
    - write operation (append / upsert / update)

Read <skill>/hooks/*.md:
  - for each hook file:
    - name (from frontmatter)
    - fires_when (from frontmatter or ## When This Runs)
    - what it writes (scan for file paths)
```

---

## Phase 2 — INJECT into soul/master.md

Append under `## [SKILL: <name>]` namespace:

```markdown
## [SKILL: <skill-name>] — v<version>
<!-- Installed: YYYY-MM-DD -->

### Soul Sections From This Skill:

#### [<SECTION-1>]
<!-- <format from SOUL.md> -->
<!-- Write trigger: <when> | Operation: <append/upsert> -->

#### [<SECTION-2>]
<!-- ... -->

### Write Protocol
| Section | Trigger | Operation |
|---|---|---|
| [SECTION] | <trigger> | <operation> |
```

---

## Phase 3 — INJECT into agent/skills-active.md

Append block:

```markdown
## <skill-name> v<version>
Installed: YYYY-MM-DD | Path: <skill-folder>/

### Trigger Keywords
[keyword-1], [keyword-2], [keyword-3]
→ When any of these appear in input: activate this skill

### Always Fires
yes / no

### Hard Rules (enforced)
| Rule | Requires | Fires When |
|---|---|---|
| <rule text short> | <file/hook/action> | <condition> |

### Soft Rules (advisory)
| Rule | Recommends | Fires When |
|---|---|---|

### Hooks
| Hook | Fires When | Writes To |
|---|---|---|
| <hook-name> | <condition> | <file-path> |

### Required Paths (created on install)
- <path-1>
- <path-2>
```

---

## Phase 4 — INJECT into memory/master-index.md

Append entry:

```markdown
## <skill-name>
- Version:     <version>
- Memory file: <skill>/memory/index.json
- Schema:      <skill>/memory/schema.json
- Tracks:      [brief — what this skill stores in memory]
- Key entries: [main arrays/objects in schema]
- Updated by:  [which hooks update memory]
```

---

## Phase 5 — UPDATE workspace/_index.md

```markdown
| <skill-name> | <version> | YYYY-MM-DD | active | <skill-folder>/ |
```

---

## Phase 6 — CREATE Missing Paths

Parse folder structure from SKILL.md.
For each path mentioned:
```bash
mkdir -p <path>
touch <path>/.gitkeep  # for empty dirs
```
Log each: `[CREATED] <path>`

---

## Phase 7 — CONFIRM

Print summary to owner. Done.
