# Extended Memory Tools Reference

> *"Rare/Internal tools — complete reference for specific situations."*

Yeh file un tools ki complete documentation hai jo **rare/internal** hain — regular use nahi. Main file (MCP_MEMORY.md) mein ab 49 core tools hain.

---

## 🟡 WHEN NEEDED — Rare/Internal Tools

Yeh tools specific/rare situations mein use hote hain.

### System/Internal Tools

#### `global_memory_search`
**Purpose:** Search across ALL memory types  
**When to use:** Rare — comprehensive search needed  
**Parameters:**
- `userId`: "nandini"
- `query`: Search query
- `types`: Memory types to search (optional)

**Example:**
```bash
mcporter call memory.global_memory_search \
  userId="nandini" \
  query="income scaling" \
  types='["conversations","entities","documents"]'
```

---

#### `create_memory_snapshot`
**Purpose:** Full database backup  
**When to use:** Rare — before major changes  
**Parameters:**
- `userId`: "nandini"
- `snapshotName`: Backup name

**Example:**
```bash
mcporter call memory.create_memory_snapshot \
  userId="nandini" \
  snapshotName="pre-migration-2026-03-16"
```

---

#### `diagnose_memory_health`
**Purpose:** System health check  
**When to use:** Troubleshooting, issues  
**Parameters:**
- `userId`: "nandini"

**Example:**
```bash
mcporter call memory.diagnose_memory_health userId="nandini"
```

---

#### `[prefix]_tool_search`
**Purpose:** Available tools search karna  
**When to use:** Discovery, finding specific tool  
**Parameters:**
- `keyword`: Tool name/keyword

**Example:**
```bash
mcporter call memory.memory_tool_search keyword="export"
```

---

## Quick Reference: Tool Locations

| Tool Type | Location | Count |
|-----------|----------|-------|
| **Core Tools** | `MCP_MEMORY.md` | 49 tools |
| **Rare/Internal** | `EXTENDED_MEMORY.md` | 4 tools |

### Core Tools Categories (in MCP_MEMORY.md):
1. Memory Storage & Retrieval (12 tools)
2. Self-Improvement (7 tools)
3. Projects & Tasks (5 tools)
4. Knowledge Graph (4 tools)
5. Documents & RAG (3 tools)
6. Analytics & Search (8 tools)
7. Organization & Management (10 tools)

### Rare Tools (in this file):
- `global_memory_search`
- `create_memory_snapshot`
- `diagnose_memory_health`
- `[prefix]_tool_search`

---

## When to Use Which File

**Use MCP_MEMORY.md for:**
- Regular session startup
- Daily memory operations
- Task completion
- Self-improvement
- Project management
- Knowledge graph
- Document storage

**Use EXTENDED_MEMORY.md for:**
- System troubleshooting
- Database backup/restore
- Tool discovery
- Comprehensive cross-type search

---

*Main file: MCP_MEMORY.md (49 Core tools)*  
*Extended file: EXTENDED_MEMORY.md (4 Rare tools)*

*Last Updated: 2026-03-16*
