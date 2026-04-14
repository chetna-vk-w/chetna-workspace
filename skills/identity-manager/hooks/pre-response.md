---
name: identity-pre-response-hook
description: Runs before every agent response. Extracts person/org names from input, queues identity operations, and ensures all ops complete before response composition begins.
---

# Pre-Response Hook

## When This Runs
BEFORE composing any response to the workspace owner.
This hook cannot be skipped, even for short replies.

---

## Step 1 — Name Extraction

Scan the full input for:
- Proper nouns likely to be a person's name (capitalised, unfamiliar, mentioned in relational context)
- Organisation names (company, firm, team, brand names)
- Nicknames or handles if context implies a real person

**Exclusion list — do NOT create entries for:**
- Fictional characters named explicitly as fictional
- Place names (cities, countries, regions)
- Product or service names (apps, tools, software)
- Generic role nouns with no specific person ("the vendor", "someone", "they")

If genuinely unsure whether a name refers to a real person → CREATE a draft entry
with an open question: `[ ] Confirm: is this a real person/org?`

---

## Step 2 — Queue Operations

For each extracted name:

```
name → slugify → check identity/<slug>/entry.md
 MISSING → queue: CREATE (partial, draft)
 EXISTS → check: does new info from this input apply?
 YES → queue: UPDATE <fields>
 NO → no-op
```

**Slugify rules:**
- lowercase, spaces → hyphens, strip special characters
- "Rahul Sharma" → `rahul-sharma`
- "TechFirm Pvt Ltd" → `techfirm-pvt-ltd`
- Collision with existing slug → add context suffix: `rahul-sharma-client`

---

## Step 3 — Execute Queue

Execute ALL queued ops in order:
1. CREATE ops first (so UPDATE ops can reference them)
2. UPDATE ops second
3. Write `_index.md` after all individual entries are written
4. Write `memory/identities.json` after `_index.md`
5. Check for CRITICAL/HIGH soul events → write `soul/identity_context.md` if triggered

**All 5 steps must complete before moving to response composition.**

---

## Step 4 — Log Hook Execution

Append to `memory/hook_log.jsonl` (one JSON object per line):

```json
{
 "ts": "YYYY-MM-DDTHH:MM:SSZ",
 "hook": "pre-response",
 "names_found": ["name1", "name2"],
 "ops_queued": [{"op": "CREATE", "slug": "name1"}, {"op": "UPDATE", "slug": "name2", "fields": ["email"]}],
 "ops_completed": 2,
 "ops_failed": 0,
 "soul_written": false,
 "duration_ms": 0
}
```

If `ops_failed > 0` → surface a warning in the response.

*Updated: 2026-04-10*