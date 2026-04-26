#!/bin/bash
# OpenClaw Maintenance: Backup and Push
echo "Starting daily maintenance backup..."
cd /root/.openclaw/workspace
git add .
git commit -m "Sovereign Daily Backup: $(date '+%Y-%m-%d %H:%M')"
git push
echo "Backup completed."
