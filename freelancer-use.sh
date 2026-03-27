#!/bin/bash
# Freelancer.in Cookie-based Access Script
# Usage: ./freelancer-use.sh <api-endpoint>

COOKIE_FILE="/root/.openclaw/workspace/config/freelancer_cookies.txt"

if [ ! -f "$COOKIE_FILE" ]; then
    echo "Error: Cookie file not found at $COOKIE_FILE"
    exit 1
fi

# Default: fetch dashboard
URL="${1:-https://www.freelancer.in/dashboard}"

echo "Fetching: $URL"
curl -s -b "$COOKIE_FILE" \
    -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
    -H "Accept: application/json, text/html" \
    -H "X-Requested-With: XMLHttpRequest" \
    "$URL"
