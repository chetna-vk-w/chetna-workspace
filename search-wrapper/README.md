# Search Wrapper 🌐

Web search wrapper using DuckDuckGo - **no API key required!**

> ⚠️ **Note**: DuckDuckGo has rate limits. For high usage, use alternatives below.

## Installation

### Node.js Version
```bash
npm install
```

### Python Version
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install duckduckgo-search
```

## Usage

### Node.js
```bash
# Basic search
node search.js "query"

# With options
node search.js "javascript tutorial" --limit 5 --region us --language en

# Add delay to avoid rate limiting (for high usage)
node search.js "query" --delay 2000

# JSON output
node search.js "python tips" --json
```

### Python
```bash
# Basic search
python search.py "query"

# With options
python search.py "javascript tutorial" --limit 5 --region us --language en

# JSON output
python search.py "python tips" --json
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--limit` | Number of results | 10 |
| `--region` | Region code (us, in, uk, etc.) | us |
| `--language` | Language code (en, hi, etc.) | en |
| `--delay` | Delay in ms before request (helps avoid rate limiting) | 0 |
| `--json` | Output as JSON | false |

## Rate Limiting

If you get "DDG detected an anomaly" error:
- Wait 15-30 minutes before next request
- Use `--delay 2000` (2 seconds) between requests
- For high volume usage, see alternatives below

## Alternatives for High Usage

### 1. Bing Search API (Recommended - Free Tier)
```bash
# Get free 1000 searches/month
# Sign up at: https://azure.microsoft.com/services/cognitive-services/bing-web-search-api/
npm install @azure/cognitive-services-bing-web-search
```

### 2. Google Custom Search JSON API
```bash
# Free 100 searches/day
# Get API key: https://developers.google.com/custom-search/v1/overview
```

### 3. SerpAPI (Paid - Most Reliable)
```bash
# $50/month for 3000 searches
# https://serpapi.com/
```

### 4. Self-hosted SearXNG (Completely Free)
```bash
# Run your own search engine
# https://github.com/searxng/searxng
docker run -d -p 8080:8080 --name searxng -v ./searxng:/etc/searxng --restart=always searxng/searxng
```

## Examples

```bash
# Search for tutorials
node search.js "react js tutorial" --limit 5

# Search with different region
python search.py "ai news" --region in --language en

# Get JSON output for scripting
node search.js "weather" --json > weather.json
```

## Features

- ✅ No API key required
- ✅ Free to use (subject to rate limits)
- ✅ Supports multiple regions
- ✅ Multiple languages
- ✅ JSON output for automation
- ✅ Both Node.js and Python versions
- ✅ Configurable delay for rate limiting

## License

MIT
