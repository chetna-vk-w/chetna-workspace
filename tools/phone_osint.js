#!/usr/bin/env node
/**
 * Deep Phone OSINT - Indian Number +917385668633
 * Pure Node.js - no external dependencies
 */

const https = require('https');
const http = require('http');

const TARGET = "+917385668633";
const CLEAN = "917385668633";

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 5) AppleWebKit/537.36 Chrome/91.0.4472.101 Mobile Safari/537.36',
                'Accept': 'application/json, text/html, */*',
                'Accept-Language': 'en-IN,hi-IN;q=0.9,en;q=0.8',
                ...options.headers
            },
            timeout: 15000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function checkTruecaller() {
    try {
        const res = await fetch(`https://www.truecaller.com/api/search?phone=${CLEAN}`);
        if (res.status === 200) return `Truecaller: FOUND\n${res.body.substring(0, 400)}`;
        return `Truecaller: ${res.status} (auth required)`;
    } catch (e) {
        return `Truecaller: ${e.message}`;
    }
}

async function checkTellows() {
    try {
        const res = await fetch(`https://www.tellows.in/${CLEAN}`);
        if (res.status === 200) {
            const ratingMatch = res.body.match(/"rating">(\d+\.?\d*)/);
            const commentsMatch = res.body.match(/comments_count.*?(\d+)/);
            let info = ratingMatch ? `Rating: ${ratingMatch[1]}/10` : 'Rating not found';
            info += commentsMatch ? `, ${commentsMatch[1]} comments` : '';
            return `Tellows: ${info}`;
        }
        return `Tellows: ${res.status}`;
    } catch (e) {
        return `Tellows: ${e.message}`;
    }
}

async function checkSpamLists() {
    const results = [];
    
    // SpamCop
    try {
        const res = await fetch(`https://www.spamcop.net/sc?track=${CLEAN}`);
        results.push(`SpamCop: ${res.status}`);
    } catch (e) {
        results.push(`SpamCop: ${e.message}`);
    }
    
    // Should I Answer
    try {
        const res = await fetch(`https://shouldianswer.net/phone/${CLEAN}`);
        results.push(`ShouldIAnswer: ${res.status}`);
    } catch (e) {
        results.push(`ShouldIAnswer: ${e.message}`);
    }
    
    return results;
}

async function checkBreachDBs() {
    const results = [];
    
    // LeakCheck
    try {
        const res = await fetch(`https://leakcheck.io/api/public?check=${CLEAN}`);
        results.push(`LeakCheck: ${res.body.substring(0, 200)}`);
    } catch (e) {
        results.push(`LeakCheck: ${e.message}`);
    }
    
    // DEFIANCE
    try {
        const res = await fetch(`https://defiancematrix.com/check/${CLEAN}`);
        results.push(`DefianceMatrix: ${res.status}`);
    } catch (e) {
        results.push(`DefianceMatrix: ${e.message}`);
    }
    
    return results;
}

async function checkSocialMedia() {
    const results = [];
    
    // WhatsApp profile check (wa.me)
    try {
        const res = await fetch(`https://wa.me/${CLEAN}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.body.includes('WhatsApp')) results.push('WhatsApp: Possibly active');
    } catch (e) {}
    
    // Telegram
    try {
        const res = await fetch(`https://t.me/+${CLEAN}`);
        if (res.body.includes('Telegram')) results.push('Telegram: Possibly active');
    } catch (e) {}
    
    // JustCall (Indian caller ID)
    try {
        const res = await fetch(`https://www.justcall.io/phone/${CLEAN}`);
        results.push(`JustCall: ${res.status}`);
    } catch (e) {
        results.push(`JustCall: ${e.message}`);
    }
    
    return results;
}

async function checkIndianDirectories() {
    const results = [];
    
    // IndianKanoon (legal/public records)
    try {
        const res = await fetch(`https://www.indiankanoon.com/search?sn=${encodeURIComponent(CLEAN)}`);
        results.push(`IndianKanoon: ${res.status}`);
    } catch (e) {
        results.push(`IndianKanoon: ${e.message}`);
    }
    
    // Sulekha / Locanto style searches
    try {
        const res = await fetch(`https://www.sulekha.com/search?q=${CLEAN}&l=`);
        results.push(`Sulekha: ${res.status}`);
    } catch (e) {
        results.push(`Sulekha: ${e.message}`);
    }
    
    return results;
}

async function runOSINT() {
    console.log(`\n=== PHONE OSINT: ${TARGET} ===\n`);
    
    console.log('[1] BASIC INFO');
    console.log(`    Country: India (+91)`);
    console.log(`    Number: ${CLEAN}`);
    console.log(`    Prefix: 7385 (Haryana region)`);
    console.log(`    Operator: BSNL/Reliance Jio/Airtel/Vi (unknown without lookup)\n`);
    
    console.log('[2] TRUE CALLER');
    console.log(`    → ${await checkTruecaller()}\n`);
    
    console.log('[3] SPAM RATINGS');
    console.log(`    → ${await checkTellows()}\n`);
    
    console.log('[4] SOCIAL MEDIA');
    const sm = await checkSocialMedia();
    if (sm.length) sm.forEach(r => console.log(`    → ${r}`));
    else console.log(`    → None detected from public checks`);
    console.log();
    
    console.log('[5] DATA BREACHES');
    const breaches = await checkBreachDBs();
    breaches.forEach(r => console.log(`    → ${r}`));
    console.log();
    
    console.log('[6] SPAM/SCAM LISTS');
    const spam = await checkSpamLists();
    spam.forEach(r => console.log(`    → ${r}`));
    console.log();
    
    console.log('[7] INDIAN DIRECTORIES');
    const dirs = await checkIndianDirectories();
    dirs.forEach(r => console.log(`    → ${r}`));
    console.log();
    
    console.log('=== LIMITATIONS ===');
    console.log('Most services require:');
    console.log('  - Truecaller API key / premium account');
    console.log('  - OTP verification');
    console.log('  - Paid spam database access');
    console.log('\n  → Deep OSINT without auth = limited results');
    console.log('\n=== END ===\n');
}

runOSINT().catch(console.error);
