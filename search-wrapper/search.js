#!/usr/bin/env node

/**
 * Search Wrapper - Multi-backend Search
 * Uses SearXNG as default (self-hosted)
 * 
 * Usage:
 *   node search.js "query" [--limit 10] [--json]
 *   node search.js "query" --backend ddg  (fallback to DuckDuckGo)
 * 
 * Configuration: Edit .env file
 */

require('dotenv').config();

const { search: ddgSearch } = require('duck-duck-scrape');

const CONFIG = {
  searxngUrl: process.env.SEARXNG_URL || 'http://localhost:8080',
  delayMs: parseInt(process.env.DELAY_MS) || 0
};

const SEARCH_BACKENDS = {
  searxng: async (query, options) => {
    const url = `${CONFIG.searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&engines=general&categories=general&language=${options.language || 'en'}&limit=${options.limit || 10}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SearXNG error: ${response.status}`);
    const data = await response.json();
    return (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.content || r.body || ''
    }));
  },
  
  ddg: async (query, options) => {
    if (CONFIG.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
    }
    const results = await ddgSearch(query, {
      safeSearch: 0,
      locale: `${options.region}-${options.language}`,
      count: options.limit
    });
    return Array.isArray(results) ? results : (results?.results || []);
  }
};

const args = process.argv.slice(2);
let query = '';
let limit = 10;
let region = 'us';
let language = 'en';
let jsonOutput = false;
let backend = 'searxng';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--region' && args[i + 1]) {
    region = args[i + 1];
    i++;
  } else if (args[i] === '--language' && args[i + 1]) {
    language = args[i + 1];
    i++;
  } else if (args[i] === '--json') {
    jsonOutput = true;
  } else if (args[i] === '--backend' && args[i + 1]) {
    backend = args[i + 1];
    i++;
  } else if (!args[i].startsWith('--')) {
    query = args[i];
  }
}

if (!query) {
  console.log('Usage: node search.js "query" [--limit 10] [--backend searxng|ddg] [--json]');
  console.log('Example: node search.js "javascript tutorial" --limit 5');
  console.log('\nBackends:');
  console.log('  searxng  - Self-hosted (DEFAULT) - set SEARXNG_URL in .env');
  console.log('  ddg      - DuckDuckGo (rate limited)');
  console.log('\nConfiguration:');
  console.log(`  SEARXNG_URL: ${CONFIG.searxngUrl}`);
  console.log(`  DELAY_MS: ${CONFIG.delayMs}`);
  console.log('\nTo configure: cp .env.example .env && nano .env');
  process.exit(1);
}

async function performSearch() {
  try {
    const searchFn = SEARCH_BACKENDS[backend];
    if (!searchFn) {
      console.error(`Unknown backend: ${backend}`);
      process.exit(1);
    }
    
    const results = await searchFn(query, { limit, region, language });

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      if (results.length === 0) {
        console.log(`\n🔍 Search: "${query}"\nNo results found.\n`);
        return;
      }

      console.log(`\n🔍 "${query}" (${backend})\nFound ${results.length} results:\n`);
      
      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
        console.log(`   URL: ${r.url || r.href}`);
        console.log(`   Desc: ${r.description || r.body || r.snippet || '-'}\n`);
      });
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (backend === 'searxng') {
      console.log('\nIs SearXNG running?');
      console.log(`Expected: ${CONFIG.searxngUrl}`);
      console.log('Start: docker run -d -p 8080:8080 searxng/searxng');
    }
    process.exit(1);
  }
}

performSearch();
