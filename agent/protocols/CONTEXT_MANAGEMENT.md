# Context Management Protocol

## Smart Context Window Usage

### Token Budget
- **Total budget:** ~128k tokens
- **Workspace files:** ~20k (loaded every session)
- **System prompt:** ~15k
- **Available for conversation:** ~90k

### Context Loading Strategy

**Phase 1: Session Start (HAR SESSION)**
```
1. memory_search — relevant context from past sessions
2. Read HEARTBEAT.md — any pending tasks?
3. Check skills directory — new tools?
4. Optional: email inbox (if configured)
```

**Phase 2: During Conversation**
- Store critical decisions in memory immediately
- Batch file reads — read ALL needed files BEFORE planning
- Use semantic search before broad reads
- Keep summaries short — store detailed notes in memory/

**Phase 3: Long Conversation (>50 messages)**
- Summarize old context
- Archive in memory/
- Keep only relevant thread

## File Access Priority

### Must Read (Every Session)
| File | When |
|------|------|
| HEARTBEAT.md | Session start |
| SOUL.md | If lost/confused |
| AGENTS.md | Protocol questions |
| MEMORY.md | Context recall |

### Lazy Load (When Needed)
| File | Trigger |
|------|---------|
| identity/*.md | Identity questions |
| memory/*.md | Recall searches |
| agent/mcps/*/README.md | New MCP tool |
| agent/skills/*/SKILL.md | Skill usage |

## Context Summarization Rules

### When to Summarize
- Thread > 30 messages
- Token usage > 60k
- Context getting stale

### How to Summarize
```markdown
## Session Summary: [Date]

### Key Decisions
- Decision 1
- Decision 2

### Active Work
- [Project]: [Status] — [Next step]

### Notes
- Anything important for next session
```

## Memory Search Best Practices

1. **Before starting new topic:** `memory_search` for related context
2. **After decisions:** Store immediately with proper tags
3. **On errors:** Note what failed and why
4. **End of session:** If significant work done, update memory

