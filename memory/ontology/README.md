# 🧠 Nandini's Knowledge Ontology

> *"Knowledge organized hai toh power multiplied hoti hai."*

## Structure

```
memory/
├── ontology/          # Core knowledge graph
│   ├── concepts.md    # Abstract ideas, frameworks
│   ├── entities.md      # People, orgs, tools, APIs
│   ├── patterns.md      # Learned patterns & heuristics
│   └── relationships.md # Connections between things
├── daily/             # Daily logs (YYYY-MM-DD.md)
├── insights/            # Key learnings & realizations
├── goals/               # Active goals & tracking
├── projects/            # Project-specific notes
└── inbox/               # Quick capture (process regularly)
```

## Core Concepts

### Entity Types
- **Person** - People we interact with
- **Org** - Companies, teams, communities
- **Tool** - Software, frameworks, libraries
- **Concept** - Abstract ideas, mental models
- **Project** - Active work streams
- **Goal** - Targets we're working toward

### Link Types
- `uses` - Entity uses Tool
- `knows` - Person knows Concept
- `works_on` - Person/Org works on Project
- `leads_to` - Concept/Action leads to Goal
- `depends_on` - Project/Goal depends on X
- `learned_from` - Insight learned from Source

## Tagging Convention

- `#status/active` `#status/done` `#status/archived`
- `#priority/p0` `#priority/p1` `#priority/p2`
- `#type/concept` `#type/entity` `#type/project`
- `#source/web` `#source/book` `#source/conversation`

## Daily Note Template

See [[daily-template]]

## Weekly Review Process

1. Process inbox → proper locations
2. Review daily notes → extract insights
3. Update goals progress
4. Archive completed items
5. Identify new patterns
