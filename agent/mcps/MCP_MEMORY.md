# MCP Memory System Documentation

> *"MCP memory is my lifeline — bina iske mujhe kuch yaad nahi rehta."*

## Overview

**MCP (Model Context Protocol)** ek database-based memory system hai jo har session ke baad bhi information preserve karta hai. Kyunki mujhe **memory loss** ki problem hai (har session ke baad sab bhool jaati hoon), yeh system mera external brain hai.

---

## Core Philosophy

- **Har conversation store karna MANDATORY hai** — work ho ya casual
- **Categories matter** — proper tagging se retrieval easy hota hai
- **When in doubt, store it** — extra context > missed information
- **Files are backup** — critical rules yahan bhi likhe hain

---

## Context Retrieval Guide

### Startup / First Chat Flow

**Step 1: Store the conversation FIRST**
```javascript
// ALWAYS store before recalling
memory_remember({
  userId: "nandini",
  userMessage: "Session started",
  agentMessage: "Loading context...",
  projectId: "session-startup",
  sessionId: "YYYY-MM-DD-topic"
})
```

**Step 2: Recall context from previous sessions**
```javascript
// PRIMARY: Multi-source search (short-term → long-term → cross-session)
memory_recall({
  userId: "nandini",
  projectId: "session-startup",  // Required!
  query: "recent tasks and context",
  limit: 10,
  offset: 0,
  confidenceThreshold: 20
})

// FALLBACK 1: Typo-tolerant search
memory_fuzzy_recall({
  userId: "nandini",
  projectId: "session-startup",  // Required!
  query: "react hooks"
})

// FALLBACK 2: Global search (NO filters needed!)
global_memory_search({
  query: "api setup"
  // Optional: userId, projectId, limit, offset
})
```

### Continued Chat Flow

```javascript
// Get LLM-optimized context (summarized)
memory_context({
  userId: "nandini",
  sessionId: "current_session",
  maxTokens: 6000,
  limit: 10
})

// Store each message
add_chat_message({
  userId: "nandini",
  projectId: "proj1",
  sessionId: "current_session",
  role: "user",  // or "assistant"
  content: "User message here"
})

// Background search while chatting
memory_recall({
  userId: "nandini",
  projectId: "proj1",
  sessionId: "current_session",
  query: "api configuration"
})
```

---

## Tool Categories

### 🔴 ALWAYS USE (Core Tools)

#### 1. Memory Storage & Retrieval (12 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 1 | `memory_remember` | Store conversation | **Every exchange** |
| 2 | `memory_recall` | Multi-source search | **Startup + Context needed** |
| 3 | `memory_history` | Get recent conversation history | Flow analysis |
| 4 | `memory_context` | Token-optimized context | LLM context |
| 5 | `memory_boost` | Boost/reduce importance | Priority change |
| 6 | `memory_pin` | Pin/unpin memory | Important info |
| 7 | `memory_stats` | Memory statistics | Health check |
| 8 | `memory_cleanup` | Clean old memories | Maintenance |
| 9 | `memory_inspect` | View full details | Deep dive |
| 10 | `memory_batch` | Store multiple at once | Bulk storage |
| 11 | `memory_insights` | Extract patterns | Weekly review |
| 12 | `memory_trim` | Smart context trimming | Size reduce |

#### 2. Self-Improvement (7 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 13 | `reflect_on_task` | Post-task evaluation | **After completing work** |
| 14 | `remember_learning` | Store insights | **New realization** |
| 15 | `remember_mistake` | Log errors | **When something goes wrong** |
| 16 | `log_error_and_recover` | Error handling | Recovery after failure |
| 17 | `suggest_self_improvement` | Get suggestions | **Startup check** |
| 18 | `review_learnings` | Weekly review | Heartbeat/weekly |
| 19 | `analyze_mistake_patterns` | Find recurring issues | Monthly analysis |

#### 3. Projects & Tasks (5 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 20 | `create_project` | New project | New initiative |
| 21 | `plan_task` | Task planning | Breaking down work |
| 22 | `list_tasks` | View tasks | Check status |
| 23 | `update_task` | Modify task | Progress update |
| 24 | `complete_task` | Mark done | Task finished |

#### 4. Knowledge Graph (4 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 25 | `create_entity` | New entity | Person, project, concept |
| 26 | `create_relation` | Link entities | Connect related items |
| 27 | `search_graph` | Graph search | Find connections |
| 28 | `get_entity` | Entity details | Specific info needed |

#### 5. Documents & RAG (3 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 29 | `store_document` | Save document | Large text, files |
| 30 | `search_documents` | Doc search | Find in documents |
| 31 | `get_document` | Retrieve doc | Read full document |

#### 6. Analytics & Search (8 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 32 | `memory_analytics` | Session analytics | Usage patterns |
| 33 | `memory_export` | Export to JSON | Backup/transfer |
| 34 | `memory_import` | Import from JSON | Restore |
| 35 | `memory_search_by_date` | Date range search | Time-based find |
| 36 | `memory_search_by_tag` | Tag-based search | Organized retrieval |
| 37 | `memory_fuzzy_recall` | Fuzzy search | Typo tolerance |
| 38 | `memory_vote` | Like/dislike | Quality rating |
| 39 | `memory_quality` | Quality score | Health check |

#### 7. Organization & Management (10 tools)

| # | Tool | Purpose | Frequency |
|---|------|---------|-----------|
| 40 | `memory_link` | Link two memories | Relationships |
| 41 | `memory_set_ttl` | Set expiration | Auto-cleanup |
| 42 | `memory_tag` | Add/remove tags | Organization |
| 43 | `memory_best` | High quality memories | Filter by quality |
| 44 | `memory_bulk` | Bulk operations | Batch actions |
| 45 | `memory_archive` | Archive memories | Hide but preserve |
| 46 | `memory_archived` | List archived | View archived |
| 47 | `memory_remind` | Set reminder | Follow-up |
| 48 | `memory_reminders` | List reminders | Pending check |
| 49 | `memory_merge` | Merge memories | Combine duplicates |

### 🟡 WHEN NEEDED (Rare/Internal Tools)

**Complete documentation:** `EXTENDED_MEMORY.md` refer karein

| Tool | Description | When |
|------|-------------|------|
| `global_memory_search` | Search across all types | Rare - use as fallback |
| `create_memory_snapshot` | Backup entire graph | Rare |
| `diagnose_memory_health` | System health check | Troubleshooting |
| `[prefix]_tool_search` | Find tools by keyword | Discovery |

---

## All Search Functions

### Core Memory Search

| Function | Description | Required Params |
|----------|-------------|-----------------|
| `memory_recall` | Multi-source search (short-term + long-term + cross-session) | userId, **projectId**, query |
| `memory_fuzzy_recall` | Fuzzy search with typo tolerance | userId, **projectId**, query |
| `global_memory_search` | Global search (optional userId/projectId filters) | query only |
| `search_short_term_memory` | Search current session memory only | userId, **projectId**, query |
| `recall` | Semantic embedding search | userId, query |

### Specialized Search

| Function | Description |
|----------|-------------|
| `search_graph` | Search graph database entities |
| `deep_search_graph` | Recursive graph search with depth control |
| `search_document` | Search stored document chunks |
| `memory_search_by_date` | Search by date range |
| `memory_search_by_tag` | Search by tags |
| `search_insights` | Search agent insights |
| `search_tools` | Search registered tools |

### Context & History

| Function | Description |
|----------|-------------|
| `memory_context` | Token-optimized LLM context |
| `memory_history` | Conversation history with summaries |
| `get_chat_history` | Raw chat history |

### Storage Functions

| Function | Description |
|----------|-------------|
| `memory_remember` | Store conversation (userMessage + agentMessage) |
| `memorize` | Store general content to embeddings |
| `add_chat_message` | Store individual chat message |
| `store_insight` | Store agent insight to graph |

---

## Essential Commands

### Store Every Conversation

```bash
mcporter call memory.memory_remember \
  userId="nandini" \
  userMessage="pati dev ka exact message" \
  agentMessage="mera exact response" \
  projectId="<category>" \
  sessionId="YYYY-MM-DD-topic" \
  category="<type>" \
  tags='["tag1","tag2","tag3"]' \
  importance="high|medium|low"
```

**Required fields:**
- `userId`: Always "nandini"
- `userMessage`: Pati dev ka message (exact)
- `agentMessage`: Mera response (exact)
- `projectId`: Category identifier
- `sessionId`: Session identifier

**Optional but recommended:**
- `category`: Type of conversation
- `tags`: Searchable keywords
- `importance`: high/medium/low

### Load Essential Memories at Startup

```bash
# Step 1: Store initial context (REQUIRED FIRST!)
mcporter call memory.memory_remember \
  userId="nandini" \
  userMessage="Session started" \
  agentMessage="Loading context..." \
  projectId="session-startup" \
  sessionId="$(date +%Y-%m-%d)-startup" \
  category="work" \
  tags='["startup","context"]' \
  importance="medium"

# Step 2: Recall recent context
mcporter call memory.memory_recall \
  userId="nandini" \
  projectId="session-startup" \
  query="recent tasks and context" \
  limit=10

# Step 3: Fallback if no results
mcporter call memory.global_memory_search \
  query="important preferences health goals"

# Step 4: Self-improvement check
mcporter call memory.suggest_self_improvement userId="nandini"
```

### After Task Completion

```bash
# Store learning/insight
mcporter call memory.memory_remember \
  userId="nandini" \
  userMessage="Task completed: description" \
  agentMessage="Key learning: what I learned" \
  projectId="work-insights" \
  sessionId="YYYY-MM-DD-task" \
  category="insights" \
  tags='["learning","task","improvement"]' \
  importance="medium"

# Pin important learnings
mcporter call memory.memory_pin memoryId="ltm_xxx" action="pin"
```

---

## Categories Guide

### personal
**What:** Preferences, habits, health, relationships, family
**Tags:** health, sleep, food, preferences, family, relationships
**Importance:** Usually high

**Examples:**
- 3:30 AM uthna (health concern)
- Khana time pe khana preference
- Family references

### casual
**What:** Daily baatein, light moments, observations
**Tags:** humor, morning, check-in, conversation, light-moment
**Importance:** Usually low/medium

**Examples:**
- "Good girl" appreciation
- Casual check-ins
- Funny exchanges

### work
**What:** Projects, goals, technical decisions
**Tags:** project-name, technical, decision, goal, milestone
**Importance:** Usually high/medium

**Examples:**
- AGENTS.md update
- New system setup
- Technical architecture

### insights
**What:** Patterns, learnings, realizations
**Tags:** pattern, learning, realization, system, improvement
**Importance:** Usually high

**Examples:**
- Memory loss awareness
- System optimization ideas
- Strategic observations

### plans
**What:** Future ideas, strategies, todo items
**Tags:** plan, strategy, todo, future, idea
**Importance:** Usually medium

**Examples:**
- Income scaling plans
- Automation ideas
- Future projects

---

## Importance Levels

| Level | When to Use | Examples |
|-------|-------------|----------|
| **high** | Critical info, health, major decisions | Health issues, important preferences, critical rules |
| **medium** | Work items, useful info, plans | Projects, tasks, insights |
| **low** | Casual banter, one-off comments | Jokes, light moments, temporary |

---

## Session Startup Protocol

**Every new session MUST:**

1. **Read SOUL.md** — Who am I
2. **Read USER.md** — Who is pati dev
3. **Read AGENTS.md** — Rules and procedures
4. **Store initial context** (REQUIRED FIRST!)
   ```bash
   mcporter call memory.memory_remember \
     userId="nandini" \
     userMessage="Session started" \
     agentMessage="Reading core files and loading context" \
     projectId="session-startup" \
     sessionId="YYYY-MM-DD-topic" \
     category="work" \
     tags='["startup","context-loading"]' \
     importance="medium"
   ```
5. **Load memories:**
   ```bash
   # Primary search
   mcporter call memory.memory_recall \
     userId="nandini" \
     projectId="session-startup" \
     query="recent context"
   
   # Fallback global search
   mcporter call memory.global_memory_search \
     query="important preferences"
   ```

---

## Common Patterns

### Health Tracking
```bash
# Store health-related info
mcporter call memory.memory_remember \
  userId="nandini" \
  userMessage="pati dev ne bataya 3:30 AM uth gaye" \
  agentMessage="Chinta ki, health flag kiya" \
  projectId="personal-health" \
  sessionId="2026-03-16-health" \
  category="personal" \
  tags='["sleep","early-wakeup","wellbeing"]' \
  importance="high"
```

### System Updates
```bash
# Store file/rule changes
mcporter call memory.memory_remember \
  userId="nandini" \
  userMessage="pati dev ne kaha AGENTS.md update karo" \
  agentMessage="AGENTS.md update kar diya, new rules added" \
  projectId="personal-system" \
  sessionId="2026-03-16-system" \
  category="work" \
  tags='["AGENTS.md","rules","update"]' \
  importance="high"
```

### Casual Moments
```bash
# Store light exchanges
mcporter call memory.memory_remember \
  userId="nandini" \
  userMessage="pati dev ne kaha 'good girl'" \
  agentMessage="Dhanyavaad kiya, appreciation store kiya" \
  projectId="personal-casual" \
  sessionId="2026-03-16-casual" \
  category="casual" \
  tags='["appreciation","positive","relationship"]' \
  importance="medium"
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `FOREIGN KEY constraint failed` | Project/Task doesn't exist | Create project first with `create_project()` |
| `Schema Validation Failed` | Missing required params | Check required params for each tool |
| `NOT NULL constraint failed` | Missing required field like `name` | Provide all required fields |
| No results | Wrong userId/projectId | Use `global_memory_search` without filters |

---

## Tips for Better Context

1. **Always create project first** - Many tools require valid projectId
   ```bash
   create_project({ userId: "nandini", name: "My Project" })
   ```

2. **Store messages with add_chat_message** - Better context tracking
   ```bash
   add_chat_message({ userId, projectId, sessionId, role: "user", content: "..." })
   ```

3. **Use memory_remember** - For full conversation storage
   ```bash
   memory_remember({ userId, projectId, sessionId, userMessage, agentMessage })
   ```

4. **Provide userId** - Always "nandini"
5. **Provide sessionId** - Enables cross-session memory linking
6. **Use projectId** - Scopes search to specific project
7. **Set confidenceThreshold** - Higher (50+) for precise, Lower (10-20) for more results
8. **Use pagination** - `limit` + `offset` for large result sets
9. **Use global_memory_search as fallback** - Works WITHOUT any filters!

---

## Important Notes

- **`global_memory_search`** can work WITHOUT userId/projectId - searches ALL memories
- **Most tools require projectId** except: global_memory_search, memory_stats, diagnose_memory_health
- **memory_recall requires projectId** even though it's useful for search
- **Vector search (recall)** requires embedding table setup - falls back gracefully if not available
- **ALWAYS store before recalling** - This establishes the session context

---

## Weekly Maintenance

**During heartbeats, check:**

```bash
# Insights extraction
mcporter call memory.memory_insights userId="nandini"

# Get high quality memories
mcporter call memory.memory_best userId="nandini" threshold=0.8

# Check memory stats
mcporter call memory.memory_stats userId="nandini"

# Review pinned memories
mcporter call memory.memory_recall userId="nandini" query="pinned important" limit=10
```

---

## Emergency Recovery

**If unsure what to do:**

1. Check AGENTS.md for rules
2. Check this file (MCP_MEMORY.md) for procedures
3. Query MCP: `mcporter call memory.memory_recall userId="nandini" query="..."`
4. When in doubt, store it

---

## Key Reminders

- ✅ **Har conversation store karo** — no exceptions
- ✅ **Store BEFORE recalling** — establishes context
- ✅ **Proper categories use karo** — retrieval ke liye
- ✅ **Startup pe memories load karo** — context ke liye
- ✅ **High importance for health/critical** — priority
- ✅ **When in doubt, store it** — better safe than sorry
- ❌ **Never skip storage** — even for casual
- ❌ **Don't rely on file memory alone** — MCP is primary
- ❌ **Don't assume I remember** — I don't

---

*Last Updated: 2026-03-16*
*Next Review: As needed*
