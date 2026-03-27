# MCPorter Setup & Debug Guide

## Setup

### Installation
```bash
npm install -g mcporter
```

### Configuration
Location: `~/.openclaw/workspace/config/mcporter.json`

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/root/.openclaw/workspace/memory-mcp-sql/build/index.js"],
      "env": {},
      "defer_loading": true
    }
  }
}
```

### Defer Loading (Important)
**Required for tools to work:** Set `"defer_loading": true`

Without this, mcporter may not properly discover/view the MCP tools.

## Debug

### Test Connection
```bash
mcporter list
```

### View Tools
```bash
mcporter call memory.memory userId="test" op="tools"
```

### Check MCP Status
```bash
mcporter status
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Tools not showing | Set `"defer_loading": true` in config |
| Connection refused | Check node path and build exists |
| Auth errors | Verify environment variables set |
