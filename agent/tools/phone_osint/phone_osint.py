#!/usr/bin/env python3
"""
Deep Phone OSINT - Indian Number +917385668633
Requires: requests, bs4, selenium (optional)
"""

import requests
import re
import json
import sys
from urllib.parse import urlencode

TARGET = "+917385668633"
CLEAN = "917385668633"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-IN,hi-IN;q=0.9",
}

def check_truecaller():
    """Truecaller API lookup"""
    try:
        # Truecaller unofficial API
        url = f"https://www.truecaller.com/api/search/{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return f"Truecaller: FOUND - {r.text[:300]}"
    except Exception as e:
        return f"Truecaller: Error - {e}"
    return "Truecaller: Not accessible (auth required)"

def check_tellows():
    """Tellows.co.in - Indian spam lookup"""
    try:
        url = f"https://www.tellows.in/{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            # Extract rating
            match = re.search(r'"rating">(\d+\.?\d*)', r.text)
            if match:
                return f"Tellows: Rating {match.group(1)}"
    except Exception as e:
        return f"Tellows: Error - {e}"
    return "Tellows: Not accessible"

def check_others():
    """Additional checks"""
    results = []
    
    # Cybercafe OSINT
    try:
        url = f"https://www.cybercafe.online/search?phone={CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        results.append(f"Cybercafe: {r.status_code}")
    except Exception as e:
        results.append(f"Cybercafe: {e}")
    
    # Quick people search
    try:
        url = f"https://www.quickpeoplesearch.com/phone/{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        results.append(f"QuickPeopleSearch: {r.status_code}")
    except Exception as e:
        results.append(f"QuickPeopleSearch: {e}")
    
    # ThatsThem (reverse phone)
    try:
        url = f"https://thatsthem.com/phone/{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        results.append(f"That'sThem: {r.status_code}")
    except Exception as e:
        results.append(f"That'sThem: {e}")
    
    return results

def check_social_media():
    """Search social platforms for this number"""
    platforms = []
    
    # WhatsApp (via profile photo check)
    # Note: This only works if the number has WhatsApp with a profile photo set to public
    try:
        # WhatsApp doesn't have a direct API; we can check if number exists via wa.me
        url = f"https://wa.me/{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
        if "WhatsApp" in r.text:
            platforms.append("WhatsApp: Possibly active")
    except:
        pass
    
    # Telegram (if user has username linked)
    try:
        url = f"https://t.me/+{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if "Telegram" in r.text:
            platforms.append("Telegram: Possibly active")
    except:
        pass
    
    return platforms

def check_data_breaches():
    """Check breach databases"""
    results = []
    
    # LeakCheck
    try:
        url = f"https://leakcheck.io/api/public?check={CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        results.append(f"LeakCheck: {r.text[:200]}")
    except Exception as e:
        results.append(f"LeakCheck: {e}")
    
    # BreachCheck
    try:
        url = f"https://breachcheck.praetorian.com/?q={CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        results.append(f"BreachCheck: {r.status_code}")
    except Exception as e:
        results.append(f"BreachCheck: {e}")
    
    return results

def check_spam_lists():
    """Check spam/scam databases"""
    results = []
    
    # SpamCop
    try:
        url = f"https://www.spamcop.net/sc?track={CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        results.append(f"SpamCop: {r.status_code}")
    except Exception as e:
        results.append(f"SpamCop: {e}")
    
    # Should I Answer
    try:
        url = f"https://shouldianswer.net/phone/{CLEAN}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            match = re.search(r'rating["\s:]+(\d+)', r.text)
            if match:
                results.append(f"ShouldIAnswer: Rating {match.group(1)}")
    except Exception as e:
        results.append(f"ShouldIAnswer: {e}")
    
    return results

def osint_main():
    print(f"=== Deep Phone OSINT: {TARGET} ===\n")
    
    print("[1] TRUE_CALLER")
    print(f"  → {check_truecaller()}\n")
    
    print("[2] TELLOWS (Spam Rating)")
    print(f"  → {check_tellows()}\n")
    
    print("[3] SOCIAL MEDIA PRESENCE")
    sm_results = check_social_media()
    for r in sm_results:
        print(f"  → {r}")
    if not sm_results:
        print("  → No public social media found")
    print()
    
    print("[4] DATA BREACH CHECKS")
    breach_results = check_data_breaches()
    for r in breach_results:
        print(f"  → {r}")
    print()
    
    print("[5] SPAM/SCAM LISTS")
    spam_results = check_spam_lists()
    for r in spam_results:
        print(f"  → {r}")
    print()
    
    print("[6] ADDITIONAL PLATFORMS")
    others = check_others()
    for r in others:
        print(f"  → {r}")
    print()
    
    print("=== ANALYSIS ===")
    print(f"Number Format: {TARGET}")
    print(f"Country: India (+91)")
    print(f"Operator: Possibly BSNL / Reliance Jio / Airtel / Vi")
    print(f"Location: Likely Haryana (73 prefix)")
    print()
    print("LIMITATION: Without social media accounts linked to this number,")
    print("deep OSINT requires authenticated services (Truecaller premium, etc.)")

if __name__ == "__main__":
    osint_main()
