#!/usr/bin/env node
/**
 * Freelancer.in Job Scraper using Puppeteer
 * Usage: node freelancer-jobs.js [category]
 * 
 * Examples:
 *   node freelancer-jobs.js linux
 *   node freelancer-jobs.js python
 *   node freelancer-jobs.js web-scraping
 */

const puppeteer = require('/tmp/node_modules/puppeteer');

const CATEGORY = process.argv[2] || 'linux';
const URL = `https://www.freelancer.in/jobs/${CATEGORY}/`;

async function scrapeJobs() {
  console.log(`🚀 Starting scraper for: ${URL}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Load cookies
  const cookieFile = '/root/.openclaw/workspace/config/freelancer_cookies.txt';
  const fs = require('fs');
  const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
  
  await page.setCookie(...cookies);
  console.log('🍪 Cookies loaded');
  
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('📄 Page loaded');
  
  // Wait for job listings to appear
  await page.waitForSelector('[class*="Job"], .job-search-result, .Project', { timeout: 10000 }).catch(() => {
    console.log('⚠️ Job selector not found, trying alternative...');
  });
  
  // Extract job data
  const jobs = await page.evaluate(() => {
    const results = [];
    const jobCards = document.querySelectorAll('[class*="Job"], .job-search-result-item, .Project');
    
    jobCards.forEach(card => {
      const title = card.querySelector('[class*="title"], .job-title, h3')?.innerText?.trim();
      const budget = card.querySelector('[class*="budget"], .price, .amount')?.innerText?.trim();
      const desc = card.querySelector('[class*="desc"], .excerpt, p')?.innerText?.trim().substring(0, 100);
      const link = card.querySelector('a')?.href;
      
      if (title) {
        results.push({ title, budget, desc, link });
      }
    });
    
    return results;
  });
  
  console.log(`\n📋 Found ${jobs.length} jobs:\n`);
  jobs.slice(0, 10).forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   Budget: ${job.budget || 'N/A'}`);
    console.log(`   ${job.desc || ''}...`);
    console.log(`   Link: ${job.link || 'N/A'}\n`);
  });
  
  await browser.close();
  return jobs;
}

scrapeJobs().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
