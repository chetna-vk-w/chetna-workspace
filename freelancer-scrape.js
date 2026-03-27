#!/usr/bin/env node
/**
 * Freelancer.in Jobs Scraper using Playwright
 * Works with cookies for authenticated access
 */

const { chromium } = require('/tmp/node_modules/playwright');
const fs = require('fs');

const CATEGORY = process.argv[2] || 'linux';
const URL = `https://www.freelancer.in/jobs/${CATEGORY}/`;

async function scrapeFreelancer() {
  console.log(`🚀 Scraping: ${URL}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1108/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  // Load cookies from saved file
  const cookieFile = '/root/.openclaw/workspace/config/freelancer_cookies.txt';
  if (fs.existsSync(cookieFile)) {
    const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
    await page.context().addCookies(cookies);
    console.log('🍪 Cookies loaded');
  }
  
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('📄 Page loaded');
  
  // Wait for Angular to render
  await page.waitForTimeout(3000);
  
  // Extract jobs using multiple selectors
  const jobs = await page.evaluate(() => {
    const results = [];
    
    // Try various selectors Freelancer might use
    const selectors = [
      '[class*="JobSearchresult"]',
      '[class*="job-result"]',
      '.job-search-result-item',
      '[data-job-id]',
      'a[href*="/job/"]'
    ];
    
    let elements = [];
    selectors.forEach(sel => {
      elements = [...elements, ...document.querySelectorAll(sel)];
    });
    
    // Dedupe by href
    const seen = new Set();
    elements = elements.filter(el => {
      const href = el.closest('a')?.href || el.href;
      if (seen.has(href)) return false;
      seen.add(href);
      return true;
    });
    
    elements.slice(0, 20).forEach(el => {
      const anchor = el.closest('a') || el;
      const href = anchor.href || '';
      const title = el.innerText.split('\n')[0].trim().substring(0, 100);
      const desc = el.innerText.split('\n').slice(1, 3).join(' ').trim().substring(0, 150);
      
      if (title && href.includes('/job/')) {
        results.push({ title, desc, url: href });
      }
    });
    
    return results;
  });
  
  console.log(`\n📋 Found ${jobs.length} jobs:\n`);
  jobs.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   ${job.desc}...`);
    console.log(`   🔗 ${job.url}\n`);
  });
  
  await browser.close();
  return jobs;
}

scrapeFreelancer().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
