---
name: identity
description: "Identity management for all characters/contacts. Create identity entries immediately when new character mentioned, update as more info comes."
homepage: https://github.com/nandini-vk-w/nandini-workspace
---

# Identity Management Skill

## 📇 Golden Rule: CREATE IMMEDIATELY

**New character mentioned → Create entry RIGHT AWAY with whatever info available**

```
New character in conversation
        ↓
Create identity/<name>/entry.md IMMEDIATELY
        ↓
Add whatever info you have (partial is OK!)
        ↓
Update as more info comes
        ↓
If doubts → Ask pati dev directly
```

## 📝 Identity Entry Template

```markdown
# <Name>

## Contact
- Email: [pending/info@email.com]
- Phone: [pending/+91...]
- Other: [pending/or known]

## Role/Relationship
[pending/known info]

## Source
[Where you learned about this person]

## Notes
[Any other info]

## Timeline
- YYYY-MM-DD: Entry created (first mention)
- YYYY-MM-DD: Updated with [new info]

*Created: YYYY-MM-DD | Updated: YYYY-MM-DD*
```

## 🔄 Update Process

| Info Source | Update Action |
|-------------|---------------|
| Email received | Add email to entry |
| Phone mentioned | Add phone to entry |
| Role revealed | Update role |
| Any detail | Add to Notes or Timeline |

## ❓ When to Ask Pati Dev

- Name spelling unclear
- Role/relationship unclear
- Important detail missing
- Multiple people with similar names

## 📁 Location
`/root/.openclaw/workspace/identity/<name>/entry.md`

## ✅ Example Flow

1. Conversation: "XYZ mentioned"
   → Create: `identity/xyz/entry.md`
   
2. Email from xyz@company.com received
   → Update: Add email
   
3. Pati dev says: "XYZ is client"
   → Update: Role = Client

*Updated: 2026-04-06*
