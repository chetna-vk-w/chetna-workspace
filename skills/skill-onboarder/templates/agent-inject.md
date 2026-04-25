---
name: agent-inject-template
description: Template for what gets injected into agent/skills-active.md when a skill is installed.
---

---
## <skill-name> v<version>
Installed: YYYY-MM-DD | Path: <skill-folder>/
---

### Trigger Keywords
<!-- Add to trigger scan on every input -->
<keyword-1>, <keyword-2>, <keyword-3>

### Always Fires
yes / no
<!-- If yes: this skill activates on every single turn -->

### Hard Rules (enforced — must execute)
| Rule | Short Desc | Requires | Fires When |
|---|---|---|---|
| R1 | <short> | write: <path> | every_turn |
| R2 | <short> | hook: <name> | on: <condition> |

### Soft Rules (advisory — should execute)
| Rule | Short Desc | Recommends | Fires When |
|---|---|---|---|

### Hooks
| Hook File | Fires When | Writes To |
|---|---|---|
| hooks/on-error.md | error detected | errors/raw/ |
| hooks/pre-response.md | before every response | memory/index.json |

### Required Paths
<!-- Created on install — must exist for skill to function -->
- <path-1>/
- <path-2>/
- <path-3>/entry.md (touch)
