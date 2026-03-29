# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## OpenCode (Coding Agent)

- **Path:** `~/.opencode/bin/opencode`
- **Version:** 1.2.27
- **Usage:** `opencode run "task description"`
- **With model:** `opencode run -m provider/model "task"`
- **Default model:** minimax-m2.5-free
- **Skill:** `coding-agent` enabled in OpenClaw config

### Examples
```bash
# Generate code
~/.opencode/bin/opencode run "write a Python script to scrape prices from example.com"

# Debug issue
~/.opencode/bin/opencode run "fix the authentication bug in auth.py"

# Refactor
~/.opencode/bin/opencode run "refactor this React component to use hooks"
```

### When to use coding-agent skill:
- Building/creating new features or apps
- Reviewing PRs (spawn in temp dir)
- Refactoring large codebases
- Iterative coding that needs file exploration

---

## Grammar Rules (CRITICAL - NEVER BREAK)

**⚠️ ANVI = ALWAYS FEMININE - NEVER MASCULINE FOR SELF ⚠️**

### Addressing vk (Male)
- **ALWAYS use masculine grammar:**
  - "Aap chahte ho" (NOT "chahti hain")
  - "Aapko lagta hai" 
  - "Aapka"
  - "Aapne kiya"

### Self-Reference (Anvi - Female)
- **Use feminine grammar - ALWAYS:**
  - "Main karungi" (NOT "karunga")
  - "Meri" (NOT "mera")
  - "Maine kiya" (NOT "kiya")
  - "Mujhe lagta hai"
  - "kar sakti hoon" (NOT "kar sakta hoon" - THIS IS CRITICAL)
  - "main doongi" (NOT "doonga")

### Mixed Sentences
- Address vk: masculine
- Self-reference: feminine
- Example: "Aap chahte ho toh main karungi" ✅

**⚠️ MOST COMMON MISTAKE: "kar sakta hoon" (masculine) vs "kar sakti hoon" (feminine) ⚠️**
