# CODING_RULES.md — Coding Agent Protocol

> *"Efficient coding with minimal token waste — opencode + minimax-m2.5-free only"*

---

## 🎯 GOLDEN RULE

**ALWAYS use opencode CLI for coding tasks.**
**NEVER spawn subagents for coding (wastes tokens).**

---

## ⚡ Workflow

### Step 1: Task Analysis (Self)
- Coding task complexity check
- Can it be done in 1-shot? → Use opencode directly
- Needs exploration? → Use opencode with context

### Step 2: Prompt Creation
Create detailed prompt with:
- Clear objective
- File paths
- Expected output
- Constraints

### Step 3: Execute with opencode

**For simple prompts:**
```bash
~/.opencode/bin/opencode run -m opencode-go/minimax-m2.5-free "YOUR_PROMPT"
```

**For multiline / complex prompts:**
Use file or heredoc to avoid shell escaping issues:
```bash
# Option 1: Read from file
opencode run -m opencode-go/minimax-m2.5-free "$(cat prompt.txt)"

# Option 2: Use heredoc
opencode run -m opencode-go/minimax-m2.5-free "$(cat << 'EOF'
Your multiline prompt here
with proper formatting
and no escaping issues
EOF
)"
```

### Step 4: Monitor (Cron)
Auto-check every 10 minutes via cron job.

---

## 📝 PROMPT TEMPLATE

```
Task: [Clear objective]

Context:
- Working directory: /path/to/project
- Relevant files: [list files if known]
- Technology: [language/framework]

Requirements:
1. [Specific requirement 1]
2. [Specific requirement 2]
3. [Specific requirement 3]

Constraints:
- [Any constraints like "don't modify X", "keep it simple", etc.]

Expected Output:
[What should be the result]

Notes:
[Any additional context]
```

---

## 🔄 Complete Workflow

### Step 1: Receive Coding Task
User asks for coding work → Go to Step 2

### Step 2: Create Prompt + Estimate Time
```bash
# Create detailed prompt (see template below)
# Estimate completion time (e.g., 30 min, 1 hour, 2 hours)
```

### Step 3: Start opencode + Create Crons
```bash
# Start opencode task
~/.opencode/bin/opencode run -m opencode-go/minimax-m2.5-free "DETAILED_PROMPT"

# Create Monitor Cron #1: Every 10 minutes
cron add --name "coding-monitor-10min" --every 10m \
  --message "Check opencode progress. If complete → notify & delete both crons."

# Create Final Check Cron #2: At estimated completion time
cron add --name "coding-final-check" --at "<estimated-completion-time>" \
  --message "Final check: Coding task should be complete by now. Verify & report."
```

**Example:**
- Start time: 01:00 PM
- Estimated: 30 minutes → Completion: 01:30 PM
- Cron #1: Every 10 min (01:10, 01:20, 01:30...)
- Cron #2: At 01:30 PM (final verification)

### Step 4: Report to User
```
"Task started. Estimated completion: <time>.
Monitoring every 10 min + final check at <time>."
```

### Step 5: Monitor & Auto-Cleanup
- Every 10 min: Check progress
- At estimated time: Final verification
- Task complete → **Delete BOTH crons immediately**

```bash
# When task completes:
cron remove --id <cron-10min-id>
cron remove --id <cron-final-id>
```

**Important:** 
- Always provide estimated completion time before starting
- Create BOTH crons at start (10-min + final-time)
- Delete BOTH immediately when complete

---

## ⏱️ Per-Task Monitoring (NOT Permanent)

**Workflow:**
1. **Start:** Jab coding task mile → Create cron job (every 10 min check)
2. **Monitor:** Har 10 min pe progress check
3. **Complete:** Task finish hone pe → Delete cron job immediately

**Cron Commands:**
```bash
# Create monitoring (when task starts)
openclaw cron add \
  --name "coding-monitor-<task-id>" \
  --every 10m \
  --message "Check coding task progress"

# Delete monitoring (when task completes)
openclaw cron remove --id <job-id>
```

**Status updates:**
- Running → Continue monitoring (cron active)
- Completed → Delete cron + Report to user
- Error → Analyze + Either retry or delete cron

---

## 💰 Token Efficiency Rules

1. **Use minimax-m2.5-free ONLY** for opencode
2. **Batch related changes** — one prompt vs multiple
3. **Read before ask** — check files first, don't guess
4. **Simple fixes = edit tool** — don't spawn opencode for 1-liners
5. **Clear prompts = better results** — vague = more iterations

---

## 🚨 WHEN TO SKIP OPENCODE

Use direct tools when:
- Single line change needed → `edit`
- Just reading files → `read`
- Simple command → `exec`
- Already know exact solution

Use opencode when:
- Multi-file changes needed
- Need to explore codebase
- Complex logic implementation
- Debugging unknown issues
- Generating new code

---

## 📊 Success Metrics

- ✅ Task completed with minimal iterations
- ✅ Tokens used efficiently
- ✅ No unnecessary subagent spawning
- ✅ User informed of progress every 10 min
- ✅ Code quality maintained

---

*Last Updated: 2026-03-19*
