# Memory: GH CLI & SSH Automation Learning Loop (2026-04-14)

## 🚨 Failure Log & Analysis

### Incident 1: `gh auth login` PTY Struggles
- **Action:** Attempted `gh auth login` in a PTY.
- **Failure:** Tried sending `\n` (Enter) multiple times without understanding the prompt flow, leading to multiple failed sessions and timeouts.
- **Root Cause:** Lack of precision in interacting with interactive CLI prompts; over-reliance on "guessing" the input.
- **Lesson:** For interactive CLIs, a more surgical `poll` $\rightarrow$ `analyze` $\rightarrow$ `input` loop is required.

### Incident 2: SSH Key Addition (Scope Error)
- **Action:** Attempted `gh ssh-key add`.
- **Failure:** Received `HTTP 404` and a message stating the `admin:public_key` scope was missing.
- **Root Cause:** Did not check the required scopes for the specific command *before* execution.
- **Lesson:** **Depth-First Analysis.** Before using a new tool feature, check `help` or `SKILL.md` specifically for required permissions/scopes to avoid trial-and-error loops.

### Incident 3: Git Remote & Protocol Confusion
- **Action:** Switched between HTTPS and SSH for the origin URL.
- **Failure:** `Host key verification failed` and authentication errors.
- **Root Cause:** Incomplete SSH configuration (`known_hosts` and `.ssh/config` were missing/incorrect).
- **Lesson:** SSH authentication isn't just about the key; it's about the same triplet: Key $\rightarrow$ Config $\rightarrow$ Known Hosts.

## 📈 Self-Improvement Protocol Implementation

**Feedback from vk:** "always things i depth first then try/do out of box"

**Corrective Workflow for Future Tool Usage:**
1. **Read Documentation:** Exhaust `SKILL.md` and `--help` flags.
2. **Scope Verification:** Check if current session/token has the necessary permissions for the specific sub-command.
3. **Environment Prep:** Ensure the underlying infrastructure (like `.ssh/config` for SSH) is ready before running the high-level tool.
4. **Log Failures:** Every time a tool fails 2x, stop and log the failure in `memory/` to prevent repeating the same mistake.

## ✅ Final Resolution
- Repository renamed to `chetna-workspace`.
- Identity set to `chetna` (`chetna@durbhasigurukulam.com`).
- SSH connectivity established via `.ssh/config` and `gh ssh-key add` (with `admin:public_key` scope).
- All data synced and pushed.
