# UPDATE_ME — Anvi's Agent Directory

## Recent Changes (2026-04-03)

### Reorganization Summary
- All MCPs → `/agent/mcps/`
- All external tools → `/agent/tools/`
- All user skills → `/agent/skills/`
- New protocols → `/agent/protocols/`
  - `CONTEXT_MANAGEMENT.md` — Smart context window usage
  - `SMART_THINKING.md` — Nandini ji decision framework

### New Files Created
- `/agent/INDEX.md` — Directory map
- `/agent/SESSION.md` — Session protocol
- `/agent/SOUL.md` — Identity reference
- `/agent/protocols/CONTEXT_MANAGEMENT.md`
- `/agent/protocols/SMART_THINKING.md`
- `/agent/mcps/memory-mcp-sql/SKILL.md`

### Old Locations (for reference)
| Was | Now |
|-----|-----|
| `workspace/skills/` | `workspace/agent/skills/` |
| `workspace/tools/` | `workspace/agent/tools/` |
| `workspace/ssh_mcp/` | `workspace/agent/mcps/ssh_mcp/` |
| `workspace/memory-mcp-sql/` | `workspace/agent/mcps/memory-mcp-sql/` |

### Update References When
1. New MCP added → Create `/agent/mcps/<name>/README.md`
2. New skill added → Create `/agent/skills/<name>/SKILL.md`
3. New tool added → Create `/agent/tools/<name>/README.md`
4. New protocol → Create `/agent/protocols/<name>.md`
5. File changes → Update `/agent/INDEX.md`

### Critical Rules
1. **SKILL.md FIRST** — Before using ANY new tool/MCP
2. **Git push** — Commit + push after changes
3. **3-Attempt Rule** — Try twice, then escalate
4. **Batch reads** — Read ALL files before planning

