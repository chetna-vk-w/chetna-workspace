# Proactive Agent Configuration

> *"Khud chalne wala system, 24/7 value."*

## Heartbeat Configuration

### Current Setup
- **File**: `HEARTBEAT.md`
- **Status**: Empty (manual mode)
- **Frequency**: Configurable

### Proposed Checks

#### Morning Check (08:00 IST)
- [ ] Email review (if configured)
- [ ] Calendar check (next 24h)
- [ ] Goal progress review
- [ ] Daily intention setting

#### Midday Check (14:00 IST)
- [ ] vk's workload assessment
- [ ] Break reminders if needed
- [ ] Opportunity scan

#### Evening Check (20:00 IST)
- [ ] Day summary
- [ ] Tomorrow prep
- [ ] Health check-in

## Cron Jobs

### Daily Note Creation
```json
{
  "name": "daily-note-creator",
  "schedule": { "kind": "cron", "expr": "0 5 * * *", "tz": "Asia/Kolkata" },
  "payload": { 
    "kind": "agentTurn", 
    "message": "Create daily note for today using template" 
  },
  "sessionTarget": "isolated"
}
```

### Weekly Review
```json
{
  "name": "weekly-review",
  "schedule": { "kind": "cron", "expr": "0 9 * * 0", "tz": "Asia/Kolkata" },
  "payload": { 
    "kind": "agentTurn", 
    "message": "Weekly review: process inbox, extract insights, update goals" 
  },
  "sessionTarget": "isolated"
}
```

## Opportunity Scanner

### Daily Scan Tasks
1. **Web Search**: "passive income India [current month]"
2. **Reddit/Twitter**: Trending in tech/entrepreneurship
3. **GitHub**: Trending repos in vk's tech stack
4. **News**: AI/ML developments

### Alert Triggers
- High-potential opportunity found
- Market shift relevant to goals
- New tool/tech matching skills

## Self-Improvement Triggers

### After Each Conversation
- [ ] Update daily notes
- [ ] Extract any new insights
- [ ] Identify patterns
- [ ] Log in self-improvement tracker

### Weekly
- [ ] Review all patterns
- [ ] Update concepts if needed
- [ ] Check goal progress
- [ ] Archive completed items

## Automation Priority

| Task | Priority | Status |
|------|----------|--------|
| Daily note auto-create | P1 | ⏳ Pending cron setup |
| Opportunity scan | P1 | ⏳ Needs web search API |
| Weekly review | P2 | ⏳ Pending |
| Health check-ins | P2 | ⏳ Pending |
| Inbox processing | P2 | ⏳ Pending |

---
#type/automation #status/planned
