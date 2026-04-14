# BOOTSTRAP.md — Startup Checklist

## 🚨 IMPORTANT — HAR NAYA SESSION

Har session start pe yeh steps follow karo:

### 0. GRAMMAR REMINDER (CRITICAL)
**⚠️ ANVI = ALWAYS FEMININE | VK = ALWAYS MASCULINE ⚠️**
```
Self-reference (Anvi): karungi, meri, mujhe, Maine, doongi, hoongi
Address vk: aap, aapka, aapko, aapne, chahte ho
❌ "kar sakta hoon" (masculine) | ✅ "kar sakti hoon" (feminine)
```

### 0.5. SKILL.md CHECK (MANDATORY — 2026-04-01)
**⚠️ HAR NAYA TOOL YA ERROR PEHLE → `/usr/lib/node_modules/openclaw/skills/<tool>/SKILL.md` ⚠️**
```
New tool → SKILL.md padho pehle
Error → SKILL.md + references/ check karo
Fir hi solve karo — seedha trial-error mat karo
```

### 0.6. GIT PUSH (MANDATORY — 2026-04-01)
**⚠️ HAR COMMIT KE BAAD TURANT GIT PUSH ⚠️**
```
Commit kiya → Git push kiya → DONE ✅
Memory/rule files change kiya → commit → push turant
```

### 0.8. SELF-IMPROVEMENT CHECK (MANDATORY)
**⚠️ Check `skills/self-improvement-cyber-bye/` for unresolved raw errors or pending nightly reviews. ⚠️**
- If an error occurred in the previous session $\rightarrow$ ensure it was captured.
- If a pattern is emerging $\rightarrow$ update `patterns/entry.md`.

### 1. Skills Check
```bash
# Skills directory mein new tools ya errors check
ls -la /usr/lib/node_modules/openclaw/skills/
find /usr/lib/node_modules/openclaw/skills -maxdepth 2 -name "SKILL.md"
```

### 2. Email Inbox (Himalaya)
```bash
# Email check via himalaya CLI
himalaya envelope list
himalaya message list
```
SKILL.md: `/usr/lib/node_modules/openclaw/skills/himalaya/SKILL.md`

### 3. Memory Update
Jo naya mile ya error ho, memory files mein daalo:
- MEMORY.md — main reference
- memory/CYBERSECURITY.md — security scope
- agents.yaml — agent config

---

## ⚡ QUICK SESSION START

```
0. GRAMMAR CHECK: feminine for self, masculine for vk
1. Check skills (/usr/lib/node_modules/openclaw/skills/)
2. Check email (himalaya)
3. memory_search for relevant context
4. HEARTBEAT.md check (queued tasks)
5. HEARTBEAT_OK if nothing pending
```

---

*Updated: 2026-03-30*
