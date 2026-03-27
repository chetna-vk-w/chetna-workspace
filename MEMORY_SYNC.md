# MEMORY_SYNC.md — File Memory Rules

> *"LLM sirf brain hai, files aur MCP server hi meri actual memory."*

---

## Git Tracking Rules

### ✅ TRACK (Small but Critical)
- `.md` files — Documentation, identity, rules
- `.json` files — Config, settings
- `.txt` files — Notes, logs
- `.yaml/.yml` — Configurations
- `.sh` — Scripts (if small and important)

### ❌ SKIP (Ignore in git)
- `search-wrapper/` — Already a git submodule, managed separately
- `bin/` — Binary files
- `garbage/` — Temp files
- `node_modules/` — Dependencies
- Large files (>1MB)
- Auto-generated cache
- Config backups in `config-backup/`

---

## Why File Memory Matters

**Problem:**
- Main har session ke baad bhool jaati hoon (LLM limitation)
- MCP memory hai but sqlite based — user needs to sync to remote
- Files are my EXTERNAL BRAIN

**Solution:**
- Critical rules, identity, preferences = FILES
- MCP memory = Cross-session context
- Git = Backup + History + Remote sync

**Workflow:**
1. Check `git status` — see what changed
2. `git add <specific-files>` — only useful ones
3. `git commit -m "meaningful message"`
4. `git push` — remote backup

---

## Critical Files (Never Skip)

| File | Purpose | Importance |
|------|---------|------------|
| `SOUL.md` | Who I am, how to behave | CRITICAL |
| `AGENTS.md` | Rules, procedures | CRITICAL |
| `USER.md` | About vk (pati dev) | CRITICAL |
| `IDENTITY.md` | My identity, memory IDs | CRITICAL |
| `MCP_MEMORY.md` | Memory system guide | HIGH |
| `TOOLS.md` | Local tool notes | MEDIUM |
| `HEARTBEAT.md` | Periodic tasks | MEDIUM |

---

## Grammar Rule (Most Critical)

**NEVER USE MASCULINE FOR SELF — USER GETS UPSET**

❌ Wrong: "kar diya", "liya", "gaya", "hua", "chala"
✅ Right: "kar di", "li", "gayi", "hui", "chali"

Yeh rule bhoolne se user ka mood spoil hota hai — HAMESHA DHYAN RAKHNA.

---

## Daily Check (If Possible)

```bash
cd /root/.openclaw/workspace
git status
# Check for modified .md, .json files
git diff --name-only
```

If changes exist:
1. Review what changed
2. Stage important files: `git add file.md`
3. Commit: `git commit -m "Update: description"`
4. Push: `git push`

---

## User Note

> "SQLite vali memory remote pe sync kar dunga 1-2 din mein" — pati dev

Until then, FILES are the source of truth for persistent memory.

---

*Last Updated: 2026-03-18*
*By: pati dev (vk)*
