#!/bin/bash
# Phone Number OSINT Script
# Usage: ./phone_osint.sh +917385668633

NUMBER=$1
if [ -z "$NUMBER" ]; then echo "Usage: $0 <phone_number>"; exit 1; fi

echo "=== Phone OSINT for $NUMBER ==="

# Clean number
CLEAN=$(echo "$NUMBER" | tr -d ' +()-')

echo "[+] Basic Info"
echo "Country: +${CLEAN:0:2}"
echo "Area Code: ${CLEAN:2:3}"
echo "Number: ${CLEAN:5}"

echo ""
echo "[+] Checking Truecaller..."
curl -s "https://www.truecaller.com/api/search?phone=$CLEAN" -H "User-Agent: Mozilla/5.0" | head -c 500

echo ""
echo "[+] Checking SMS/Call forwarding leaks..."
curl -s "https://www.smsbox.me/Search?Phone=$CLEAN" 2>/dev/null | head -c 300

echo ""
echo "[+] Checking Have I Been Pwned..."
curl -s "https://haveibeenpwned.com/api/v3/phoneapitoken" 2>/dev/null | head -c 200

echo ""
echo "[+] Checking public records (Indian DOB/address brokers)..."
curl -s "https://www.indiankanoon.com/search?sn=$CLEAN" 2>/dev/null | head -c 300

echo ""
echo "[+] SIP/VoIP enumeration..."
curl -s "https://api.veriphone.io/v2/verify?phone=$CLEAN&key=test" 2>/dev/null | head -c 500

echo ""
echo "[+] Google cached results..."
curl -s "https://webcache.googleusercontent.com/search?q=cache:$NUMBER" 2>/dev/null | head -c 500

echo ""
echo "[+] LeakedSource..."
curl -s "https://leakedsource.com/search?q=$NUMBER" -L 2>/dev/null | head -c 500

echo ""
echo "=== Done ==="
