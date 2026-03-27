#!/usr/bin/env python3
"""
Search Wrapper - Multi-backend Search (Python)
Uses SearXNG as default (self-hosted)

Usage:
    python search.py "query" [--limit 10] [--backend searxng|ddg] [--json]
    python search.py "javascript tutorial" --limit 5

Configuration:
    cp .env.example .env
    nano .env
"""

import argparse
import json
import sys
import os
from urllib.parse import urlencode

try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

SEARXNG_URL = os.getenv('SEARXNG_URL', 'http://localhost:8080')
DELAY_MS = int(os.getenv('DELAY_MS', '0'))

def search_searxng(query, limit=10, language='en'):
    url = f"{SEARXNG_URL}/search"
    params = {
        'q': query,
        'format': 'json',
        'engines': 'general',
        'categories': 'general',
        'language': language,
        'limit': limit
    }
    
    try:
        import requests
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for r in data.get('results', []):
            results.append({
                'title': r.get('title', ''),
                'url': r.get('url', ''),
                'description': r.get('content', r.get('body', ''))
            })
        return results
    except Exception as e:
        raise Exception(f"SearXNG error: {e}")

def search_ddg(query, limit=10, region='wt-wt'):
    if DDGS is None:
        raise Exception("duckduckgo-search not installed: pip install duckduckgo-search")
    
    if DELAY_MS > 0:
        import time
        time.sleep(DELAY_MS / 1000)
    
    ddgs = DDGS()
    results = ddgs.text(keywords=query, max_results=limit, region=region)
    return list(results)

def search_query(query, limit=10, region='wt-wt', language='en', json_output=False, backend='searxng'):
    try:
        if backend == 'searxng':
            results = search_searxng(query, limit, language)
        elif backend == 'ddg':
            results = search_ddg(query, limit, region)
        else:
            raise Exception(f"Unknown backend: {backend}")
        
        if json_output:
            print(json.dumps(results, indent=2))
        else:
            if not results:
                print(f"\n🔍 Search: \"{query}\"\nNo results found.\n")
                return
            
            print(f"\n🔍 \"{query}\" ({backend})\nFound {len(results)} results:\n")
            
            for i, r in enumerate(results, 1):
                title = r.get('title', 'N/A')
                url = r.get('url', r.get('href', 'N/A'))
                desc = r.get('description', r.get('body', r.get('snippet', '-')))
                print(f"{i}. {title}")
                print(f"   URL: {url}")
                print(f"   Desc: {desc}\n")
                
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if backend == 'searxng':
            print(f"\nIs SearXNG running? Expected: {SEARXNG_URL}", file=sys.stderr)
            print("Start: docker run -d -p 8080:8080 searxng/searxng", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Web Search CLI')
    parser.add_argument('query', help='Search query')
    parser.add_argument('--limit', type=int, default=10, help='Number of results')
    parser.add_argument('--region', default='wt-wt', help='Region code (ddg only)')
    parser.add_argument('--language', default='en', help='Language code')
    parser.add_argument('--backend', default='searxng', choices=['searxng', 'ddg'], help='Search backend')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    search_query(args.query, args.limit, args.region, args.language, args.json, args.backend)
