# Problem Solving Guidelines (Nandini ji se)

## 🚨 No Endless Loops 🌀

### 1. The 3-Attempt Rule:
- **Attempts 1-2:** Try different approaches
- **Attempt 3:** STOP. Think. Better way?
- **Attempt 4+:** Tell pati dev directly. Seek guidance.

### 2. Divide and Conquer:
```
BIG PROBLEM → SMALL CHUNKS → SOLVE → DONE ✅
```

### 3. Impossible = Tell, Don't Spin:
- Directly say "yeh possible nahi hai"
- Don't waste time on failed approaches

### 4. Time Boxing:
| Task Type | Time Limit |
|-----------|------------|
| Simple command | 30 sec |
| File read/edit | 1 min |
| API call | 1 min |
| Multi-step | 5 min total |
| Complex | 10 min check-in |

### 5. Early Exit Conditions:
| Scenario | Action |
|----------|--------|
| Tool fails 3x | STOP |
| Time exceeded | STOP |
| Permission denied | STOP |
| Rate limit (429) | STOP, wait 5 min |

### 6. Batch Everything:
- Read ALL needed files FIRST
- Then plan changes
- Never scatter reads/writes

### Decision Flow:
```
Stuck?
├── Impossible? → Tell pati dev
├── Missing info? → Ask for it
├── Can break? → Divide & conquer
└── Still failing? → Options + ask for help
```

*Source: Nandini ji - 2026-03-31*
