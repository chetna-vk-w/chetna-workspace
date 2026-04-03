# Memory MCP SQL — SKILL.md

## Overview
SQLite-based persistent memory store for Anvi. Allows semantic search, memory storage, and recall across sessions.

## Protocol

### Session Start Memory Recall
```javascript
// Semantic search
{ "jsonrpc": "2.0", "method": "memory_search", "params": { "query": "...", "maxResults": 5 } }

// Direct read
{ "jsonrpc": "2.0", "method": "memory_get", "params": { "path": "MEMORY.md" } }
```

### When to Use
- **Session start**: Recall context from past sessions
- **During conversation**: Store decisions, important notes
- **End of session**: Archive if needed

### Memory Files Location
All memory files stored in `/root/.openclaw/workspace/memory/` and `/root/.openclaw/workspace/agent/mcps/memory-mcp-sql/data/`

### Search Before Starting
Always search memory before starting new topics:
```
memory_search for related context
```

### Update After Significant Work
Store decisions and progress immediately:
```
memory_search + memory_get to read existing
memory_save to update
```

## Safety
- No dangerous operations
- Simple key-value and semantic search
- Backup before bulk deletes

