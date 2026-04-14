---
name: workspace-org
description: "Complete workspace organization with identity-first contact management. Use for workspace structure, contact lookup, workflows, and skills backup."
homepage: https://github.com/nandini-vk-w/nandini-workspace
metadata:
  {
    "openclaw":
      {
      "emoji": "📁",
      "requires": { "files": ["/root/.openclaw/workspace/"] }
    }
  }
---

# Workspace Organization + Identity Skill

## 📇 CONTACT LOOKUP (ALWAYS FOLLOW)

**Rule: Identity First → Then Lookup → Never Guess**

```
1️⃣ Check identity/ folder
   └─ identity/<name>/entry.md
   
2️⃣ If missing → Lookup from inbox
   └─ himalaya envelope list from <email>
   
3️⃣ If still missing → Search all emails
   └─ himalaya envelope list search
   
4️⃣ If nothing found → Ask pati dev
```

### CRITICAL: When to Create Identity Entry
- **New contact met** → Immediately create `identity/<name>/entry.md`
- **Email received from new person** → Create entry immediately
- **Contact info verified** → Update entry with verified date

### Identity Entry Template
```markdown
# <Name> - Entry

## Contact
- Email: verified@email.com (verified: YYYY-MM-DD)
- Other: contact details

## Verified From
- Source of verification

## Notes
- Role, relationship, etc.

*Created: YYYY-MM-DD*
```

## 📁 WORKSPACE STRUCTURE

```
workspace/
├── MEMORY.md              → Compact summary (load FIRST)
├── DO/                    → Priorities
├── DONT/                  → Rules
├── ERRORS/                → Fixes
├── TOPICS/                → Decisions
├── UPDATES/               → Changes
├── WORKFLOW/              → Workflows
├── PROJECTS/              → Projects
├── identity/              → Contacts ⭐ CRITICAL
│   └── <name>/entry.md    → Always create first
├── skills_backups/        → Backup system
└── agent/                 → Agent management
```

## ⚡ WORKFLOW SYSTEM

### Quick Reference
| Task | Tool |
|------|------|
| Simple | `edit` |
| Medium | `opencode` |
| Complex | `opencode` + subagents |

### Production-Ready Checklist
- [ ] Code complete
- [ ] Tests pass
- [ ] Error handling
- [ ] Documentation
- [ ] Git committed + pushed

## 🔧 SKILLS BACKUP

```bash
cd /root/.openclaw/workspace && ./skills_backups/backup-skills.sh
```

Backup includes: All skills + identity/ folder

## 🔀 GIT RULE
```bash
git add <specific files>  # NEVER: git add ./ -a
```

## 🔴 WORKFLOW RULE (CRITICAL - New 2026-04-07)

**For Complex/Ref/Flow/Workflow Tasks:**
- Use `WORKFLOW/` folder for reusable workflows
- Structure: workflow.md (entry) → reference/, active/, history/, templates/
- Update `AGENTS.md` and `MEMORY.md` as needed
- Run skills backup after updates

### Task Classification
| Task Type | Action |
|-----------|--------|
| Simple fix | `edit` directly |
| Medium complexity | `opencode run` |
| Complex/ref/flow/workflow | Use WORKFLOW/ + update docs + backup |

*Updated: 2026-04-07 | Per pati dev directive*
