---
name: self-improvement-cyber-bye-soul
description: Soul-layer persistent context. Tracks error patterns, fix rates, unresolved escalations, and growth milestones across sessions.
---

# Self-Improvement-Cyber-Bye — Soul Context

## [WORKSPACE OWNER]
- Owner:        [soul.owner.name]
- Initialized:  YYYY-MM-DD
- Soul version: 1.0.0

---

## [CRITICAL FLAGS]
<!-- Append-only. Never remove. -->
<!-- Format: YYYY-MM-DD | SLUG | TYPE | SUMMARY -->

---

## [UNRESOLVED ESCALATIONS]
<!-- Remove when resolved. -->
<!-- Format: YYYY-MM-DD | SLUG | TYPE | SEVERITY | SUMMARY | DAYS_PENDING -->

---

## [ACTIVE PATTERNS]
<!-- Format: PATTERN_ID | TYPE | FREQUENCY | FIRST_SEEN | LAST_SEEN | STATUS -->

---

## [FIX RATE TREND]
<!-- Updated nightly. Last 4 weeks. -->
<!-- Format: WEEK | ERRORS | SELF_FIXED | ESCALATED | FIX_RATE% -->

---

## [GROWTH MILESTONES]
<!-- Format: YYYY-MM-DD | MILESTONE | CONTEXT -->

---

## [ACTIVE CRONS]
<!-- Format: CRON_ID | TYPE | SCHEDULE | PURPOSE | FIRE_ONCE | AUTO_DELETE -->

---

## [RECENT ERRORS]
<!-- Rolling 20. Drop oldest when >20. -->
<!-- Format: YYYY-MM-DD | SLUG | TYPE | SEVERITY | STATUS -->

---

## [SESSION LOG]
<!-- Append-only. -->
<!-- Format: YYYY-MM-DD | SESSION_TYPE | raw:N | fixed:N | escalated:N | patterns:N -->

---

## Write Protocol

| Section | Trigger | Operation |
|---|---|---|
| [CRITICAL FLAGS] | severity=critical | Append-only |
| [UNRESOLVED ESCALATIONS] | escalated | Append; remove when resolved |
| [ACTIVE PATTERNS] | pattern detected | Upsert by pattern_id |
| [FIX RATE TREND] | nightly review | Update last 4 weeks |
| [GROWTH MILESTONES] | pattern resolved / major fix | Append |
| [ACTIVE CRONS] | cron created/deleted | Upsert by cron_id |
| [RECENT ERRORS] | any error captured | Append; drop oldest >20 |
| [SESSION LOG] | every session + nightly | Append |
