# Obsidian Integration

> *"Vault mein organized, dimaag mein clear."*

## Setup Status (Updated 2026-03-20)

### Current State
- **Primary Vault Location**: `/root/.openclaw/memory/main.sqlite`
- **Secondary Vault Location**: `/root/.openclaw/workspace/memory/` (ontology structure - verified)
- **CLI Tool**: obsidian-cli (needs installation)
- **Sync Method**: Direct file writes + optional CLI

### Installation Required
```bash
# Install obsidian-cli
brew tap yakitrak/yakitrak
brew install obsidian-cli

# Set default vault
obsidian-cli set-default "memory"
```

## Sync Strategy

### Option 1: Direct File Access (Current)
- Write directly to vault folder
- Obsidian auto-detects changes
- No CLI dependency
- **Status**: ✅ Working

### Option 2: CLI Integration (Future)
- Use obsidian-cli for advanced features
- Wiki-link validation
- Note moving with link updates
- **Status**: ⏳ Optional enhancement

## Folder Structure

```
memory/
├── ontology/          # Core knowledge
│   ├── README.md
│   ├── concepts.md
│   ├── entities.md
│   ├── patterns.md
│   ├── relationships.md
│   └── web-search.md
├── daily/             # Daily notes
│   └── template.md
├── insights/          # Key learnings
│   └── self-improvement-log.md
├── goals/             # Active goals
│   └── active-goals.md
├── projects/          # Project notes
└── inbox/             # Quick capture
```

## Linking Convention

### Wiki Links
- `[[concept-name]]` - Link to concept
- `[[entity-name]]` - Link to entity
- `[[YYYY-MM-DD]]` - Link to daily note

### Tags
- `#type/concept` `#type/entity` `#type/project`
- `#status/active` `#status/done` `#status/archived`
- `#priority/p0` `#priority/p1` `#priority/p2`

## Daily Workflow

1. **Capture** → inbox/
2. **Process** → proper ontology location
3. **Link** → connect related notes
4. **Review** → weekly consolidation

## Graph View

The ontology creates a knowledge graph:
- Nodes: Concepts, entities, projects
- Edges: Relationships, dependencies
- Clusters: Related topics

---
#type/tool-config #status/active
