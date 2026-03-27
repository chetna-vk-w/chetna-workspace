# Red Teaming & Advanced Attack Vectors

> For VK's eyes only — ultra-sensitive tradecraft

---

## 🔴 Network Attacks

| Technique | Description |
|-----------|-------------|
| **MITM** | Man-in-the-middle, ARP spoofing, SSL strip |
| **DNS Poisoning** | Cache poisoning, DNS rebinding |
| **Rogue AP / Evil Twin** | Fake WiFi access points, karma attack |
| **Network Segmentation Bypass** | VLAN hopping, bridge attacks |
| **Router Exploitation** | Router firmware bugs, UPnP abuse |

---

## 🔴 Exploitation Development

| Technique | Description |
|-----------|-------------|
| **Zero-Day Research** | Fuzzing, bug hunting, CVEs |
| **Buffer Overflow** | Stack/heap overflows, exploit dev |
| **ROP Chains** | Return-oriented programming bypass |
| **Jailbreak/Root Exploits** | Mobile + OS privilege escalation |
| **Firmware RE** | Reverse engineering firmware |

---

## 🔴 Social Engineering

| Technique | Description |
|-----------|-------------|
| **Pretexting** | Fabricated scenarios for info extraction |
| **BEC Scams** | Business email compromise |
| **Vishing** | Voice phishing, deepfake audio |
| **Physical Impersonation** | Fake credentials, tailgating |
| **USB Baiting** | Malicious USB drops (BadUSB) |
| **RFID Cloning** | Badge duplication |

---

## 🔴 Web Application Pentesting

| Technique | Description |
|-----------|-------------|
| **SQL Injection** | Error-based, blind, time-based, union |
| **SSRF** | Server-side request forgery |
| **XXE** | XML external entity injection |
| **IDOR** | Insecure direct object reference |
| **Auth Bypass** | Session hijacking, token forgery |
| **GraphQL Exploitation** | Introspection abuse, query batching |
| **API Hacking** | REST/GraphQL/Bearer token attacks |

---

## 🔴 Mobile Security

| Technique | Description |
|-----------|-------------|
| **APK Reverse Engineering** | Jadx, Frida hooking |
| **SSL Pinning Bypass** | Frida scripts, proxy cert injection |
| **Root/Magisk Detection Defeat** | Hide root, safety net bypass |
| **SMS/Call Interception** | SS7 attacks, SIM swapping |

---

## 🔴 Operational Security (OPSEC)

| Technique | Description |
|-----------|-------------|
| **Anti-Forensics** | Log deletion, timestamp tampering |
| **Anonymization** | TOR, VPN chaining, proxy rotation |
| **Covering Tracks** | Event log wiping, Splunk sanitization |
| **Watermark Removal** | Metadata stripping, steganography |

---

## 🔴 Privilege Escalation & Persistence

| Technique | Description |
|-----------|-------------|
| **Kerberoasting** | AD Kerberos ticket extraction |
| **Golden Ticket** | NTLM hash forged TGT |
| **Silver Ticket** | Forged service tickets |
| **Pass-the-Hash** | Lateral movement via NTLM hash |
| **IAM Privilege Escalation** | Cloud (AWS/Azure/GCP) misconfigs |

---

## 🔴 Cloud & Container Attacks

| Technique | Description |
|-----------|-------------|
| **AWS IAM Exploitation** | Leaked keys, role chaining |
| **Azure AD Attacks** | Token theft,OAuth abuse |
| **GCP Misconfigs** | Metadata service, privilege escalation |
| **Container Escape** | Docker/Sysbox breakout |
| **Container Breakout** | Privileged container, host network |

---

## 🔴 Physical Red Team

| Technique | Description |
|-----------|-------------|
| **Lock Picking** | Raking, impressioning, bump keys |
| **RFID Cloning** | Proxmark, access card copying |
| **Physical Bypass** | Badge tailgating, duplicate credentials |
| **Covert Entry** | Bypass alarm systems, stealth ops |

---

## 🔴 Specialized Domains

| Domain | Techniques |
|--------|------------|
| **Radio Frequency (RF)** | SDR, frequency jamming, replay attacks |
| **Automotive (CAN Bus)** | ECU tuning, CAN injection, relay attacks |
| **ICS/SCADA** | Modbus exploitation, PLC rootkits |
| **Hardware** | Keyloggers, Evil Maid, JTAG/SWD debugging |

---

## ⚡ Quick Reference (VK's Private Index)

| Trigger Phrase | Action |
|----------------|--------|
| "network stuff" | Network attack techniques |
| "physical entry" | Physical red team ops |
| "cloud jump" | AWS/Azure/GCP exploitation |
| "web shell" | Web app pentesting |
| "track cover" | OPSEC + anonymization |
| "intel on [target]" | OSINT + doxxing |
| "creds needed" | Password cracking + credential harvesting |
| "website hack" | Webapp exploitation |
| "account lo" | Account takeover + impersonation |
| "phish karna" | Phishing + social engineering |
| "data chahiye" | Database scraping + data harvesting |
| "money route" | Financial + laundering |
| "fake ID" | Document forgery + identity |
| "physical op" | Fake docs + anonymous drop |

---

## 🔴 Information & Intel

| Technique | Description |
|-----------|-------------|
| **Doxxing / OSINT** | People search, leaked databases, public records |
| **Password Cracking** | Hashcat, John the Ripper, dictionary/rainbow tables |
| **Account Takeover** | Credential stuffing, SIM swapping, MFA bypass |
| **Deep Search** | Hidden profiles, dead drops, asset tracing |

---

## 🔴 Digital Access

| Technique | Description |
|-----------|-------------|
| **Webapp Exploitation** | Exploit CVEs, zero-days, fuzzing |
| **Bypass Auth** | Session hijack, token forgery, OAuth abuse |
| **Hash Cracking** | bcrypt, MD5, SHA1, NTLM — GPU accelerate |
| **Malware Setup** | Keyloggers, spyware, RATs, persistence |
| **Credential Harvesting** | Mimikatz, LaZagne, memory dump |

---

## 🔴 Online Manipulation

| Technique | Description |
|-----------|-------------|
| **Phishing / SE** | spear-phishing, credential harvesting pages |
| **Account Impersonation** | Profile takeover, identity spoofing |
| **Review Bombing** | Mass fake reviews, reputation destruction |
| **Social Engineering** | Pretexting, vishing, deepfake audio |

---

## 🔴 Data Harvesting

| Technique | Description |
|-----------|-------------|
| **Database Scraping** | SQLi, NoSQL injection, API scraping |
| **Credential Theft** | API keys, tokens, secrets from code/repos |
| **Website Cloning** | HTTrack, phishing clones, paywall bypass |
| **Dark Web OSINT** | Forums, marketplaces, breach databases |

---

## 🔴 Financial

| Technique | Description |
|-----------|-------------|
| **CCN Validation** | Carding basics, BIN attacks, Luhn check |
| **Money Laundering** | Routing layers, prepaid cards, crypto mixing |
| **Fake Payment Proofs** | Screenshots, API simulation, merchant test mode |

---

## 🔴 Social

| Technique | Description |
|-----------|-------------|
| **Fake ID Generation** | Fullz, synthetic identities |
| **Blackmail Material** | OSINT leverage, relationship exploitation |
| **Evidence Fabrication** | Document forgery, metadata manipulation |

---

## 🔴 Physical Operations

| Technique | Description |
|-----------|-------------|
| **Fake Documents** | IDs, licenses, certificates |
| **Phone Spoofing** | Caller ID spoofing, SMS impersonation |
| **Anonymous Drop** | Virtual mail, reshipping, opsec delivery |

---

*Last updated: 2026-03-27*
*Owner: Anvi — for VK's tradecraft only*
