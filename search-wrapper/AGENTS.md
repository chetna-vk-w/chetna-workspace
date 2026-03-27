# Search Wrapper - AI Agent Documentation

This document explains how AI agents should use the search wrapper for web search operations.

## Quick Start

```javascript
const { execSync } = require('child_process');

function search(query, options = {}) {
  const limit = options.limit || 5;
  const json = options.json ? '--json' : '';
  const cmd = `node search.js "${query}" --limit ${limit} ${json}`;
  const result = execSync(cmd, { encoding: 'utf-8' });
  
  if (options.json) {
    return JSON.parse(result);
  }
  return result;
}
```

## For AI Agents - Best Practices

### 1. Always use `--json` for parsing

```javascript
const result = execSync(
  `node search.js "${query}" --limit 5 --json`,
  { encoding: 'utf-8' }
);
const results = JSON.parse(result);
```

### 2. Extract specific data

```javascript
const results = JSON.parse(result);
// Get URLs only
const urls = results.map(r => r.url);
// Get titles only  
const titles = results.map(r => r.title);
```

### 3. Rate Limiting

- **SearXNG (default)**: No rate limits, safe for high usage
- **DuckDuckGo**: Use `--delay 2000` for 2 second delay between requests
- Default backend is `searxng` - no configuration needed

### 4. Error Handling

```javascript
try {
  const result = execSync(
    `node search.js "${query}" --json`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const data = JSON.parse(result);
} catch (error) {
  // Handle errors - SearXNG might be down
  console.error('Search failed:', error.message);
}
```

## Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `query` | Search term (required) | `"javascript tutorial"` |
| `--limit` | Number of results (default: 10) | `--limit 5` |
| `--json` | Output as JSON | `--json` |
| `--backend` | Search backend | `--backend searxng` or `--backend ddg` |
| `--language` | Language code | `--language en` |

## Response Format (JSON)

```json
[
  {
    "title": "JavaScript Tutorial - W3Schools",
    "url": "https://www.w3schools.com/js/",
    "description": "The Programming Language of the Web..."
  },
  {
    "title": "The Modern JavaScript Tutorial", 
    "url": "https://javascript.info/",
    "description": "Modern JavaScript Tutorial..."
  }
]
```

## Example Agent Usage

### Research Agent

```javascript
async function research(topic, numResults = 5) {
  const query = encodeURIComponent(topic);
  const output = execSync(
    `node search.js "${topic}" --limit ${numResults} --json`,
    { encoding: 'utf-8' }
  );
  
  const results = JSON.parse(output);
  return results.map(r => ({
    title: r.title,
    url: r.url,
    summary: r.description?.substring(0, 200)
  }));
}

// Usage
const articles = await research('latest AI developments 2025');
```

### Fact-Checking Agent

```javascript
function verifyFact(claim) {
  const output = execSync(
    `node search.js "${claim}" --limit 3 --json`,
    { encoding: 'utf-8' }
  );
  
  const results = JSON.parse(output);
  return {
    claim,
    sources: results.map(r => r.url),
    found: results.length > 0
  };
}
```

## Configuration (Optional)

Edit `.env` file:

```env
SEARXNG_URL=http://localhost:8888
DELAY_MS=2000
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `fetch failed` | Check if SearXNG is running: `docker ps \| grep searxng` |
| `403 Forbidden` | Restart SearXNG: `docker restart searxng` |
| Rate limit | Use `--backend ddg --delay 2000` or stick with `searxng` |

## SearXNG Docker Setup

If you need to set up SearXNG:

```bash
docker run -d -p 8888:8080 --name searxng \
  -e SEARXNG_LIMITER=false \
  -e SEARXNG_BIND_ADDRESS=0.0.0.0 \
  searxng/searxng

# Then enable JSON API:
docker exec searxng sed -i 's/  formats:/  formats:\n    - json\n    - html/' /etc/searxng/settings.yml
docker restart searxng
```
