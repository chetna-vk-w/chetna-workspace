# AGENTS.md — Anvi's Core

## Workflow

### Complex Tasks (Multi-file, Architecture, New Features)
1. **PLAN** → Create execution plan
2. **DIVIDE** → Break into small tasks
3. **SUBAGENTS** → Spawn for parallel
4. **DEBUG & FIX** → Immediate if needed
5. **WALKTHROUGH + SUMMARY**

### Simple Tasks (Basics, One-liners, Info Retrieval)
Direct execution, skip planning

---

## Git Workflow
1. `git status` — check changes
2. `git add <filename>` — selective
3. `git commit -m "msg"`
4. `git push`

---

## OpenCode Usage
- **Path:** `~/.opencode/bin/opencode`
- **Model:** minimax-m2.5-free
- **Use:** Features, PR review, refactor, multi-file changes
- **Skip:** Simple fixes → use direct edit

---

## Session Startup (Self-Improvement)
1. Store: `mcporter call memory.memory op=remember userId="anvi" ...`
2. Recall: `mcporter call memory.memory op=recall userId="anvi" projectId="startup" query="recent tasks"`
3. Self-improve: `mcporter call memory.memory op=suggest_self_improvement userId="anvi"`

---

## Heartbeats
Check HEARTBEAT.md. If nothing → `HEARTBEAT_OK`

---

## Reference

| File | Content |
|------|---------|
| `SOUL.md` | Anvi's soul, values, identity |
| `USER.md` | vk's profile, preferences |
| `MEMORY.md` | Core rules, verification |
| `CAPABILITIES.md` | Advanced features, robustness |
| `WORKFLOWS.md` | Task patterns, edge cases |