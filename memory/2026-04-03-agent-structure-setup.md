# Session: 2026-04-03 10:11:55 UTC

- **Session Key**: agent:main:main
- **Session ID**: 85bc3c88-ed36-40a9-b6b4-1bd8fb937dec
- **Source**: webchat

## Conversation Summary

user: Sender (untrusted metadata):
```json
{
  "label": "openclaw-control-ui",
  "id": "openclaw-control-ui"
}
```

[Fri 2026-04-03 05:29 UTC] baby ab new rule and optimization things ,memory file kee avala mcp and tools h vo move kr (create if not exit) /agent/{mcps,tools,etc not internal and already exits} and if new mcp /tools,etc added(external) then create skill file after understanding mcp/tools,etc properly and make smarter in thinking and memory/context management as possible but never outsmart/oversmart with vk/me/pati dev
assistant: Ji pati dev, main karungi 🪔

Pehle current structure samajhti hoon, phir organize karti hoon.

assistant: Ji pati dev, main karungi 🪔

Pehle current structure samajhti hoon, phir organize karti hoon.
user: System: [2026-04-03 05:31:06 UTC] Gateway restart update ok (npm)
System: Run: openclaw doctor --non-interactive

Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.
When reading HEARTBEAT.md, use workspace file /root/.openclaw/workspace/HEARTBEAT.md (exact case). Do not read docs/heartbeat.md.
Current time: Friday, April 3rd, 2026 — 5:31 AM (UTC) / 2026-04-03 05:31 UTC
assistant: Structure samajh gaya. Ab `/agent` directory banati hoon aur organize karti hoon.

assistant: Samajh gaya. Ab reorganize karti hoon — files move karta hoon:

assistant: Good! Almost done. Clean up the empty dirs and curly brace mistake:

assistant: Now update key memory files to reference new locations:

assistant: Now update MEMORY.md with new paths:

assistant: Now commit + push everything:

assistant: Ji pati dev, done ✅

**New `/agent` structure:**

```
/agent
├── INDEX.md              # Directory map — find anything fast
├── SOUL.md               # Identity
├── SESSION.md            # Session checklist
├── UPDATE_ME.md          # Changelog
├── mcps/                 # MCP servers
│   ├── ssh_mcp/          # SSH + terminal
│   ├── memory-mcp-sql/   # Persistent memory
│   └── MCP_MEMORY.md
├── tools/                # External tools
│   └── phone_osint/
├── skills/               # User skills
│   ├── ai-productivity-audit/
│   ├── automation-workflows/
│   ├── ddg-web-search/
│   ├── market-research-agent/
│   ├── personal-productivity/
│   ├── scrape/
│   └── system-info/
├── protocols/            # Thinking protocols
│   ├── SMART_THINKING.md       # 3-attempt rule, divide&conquer
│   └── CONTEXT_MANAGEMENT.md    # Token budget, batch reads
└── context/              # Session templates
```

**Key protocols added:**
- `SMART_THINKING.md` — Nandini ji guidelines: 3-attempt rule, time boxing, divide & conquer
- `CONTEXT_MANAGEMENT.md` — Smart context window usage, batch reads

**Rule:** New MCP/tools/skills → Create SKILL.md in its directory after understanding it properly. Sirf blindly use mat karna.

Git push bhi ho gaya ✅
