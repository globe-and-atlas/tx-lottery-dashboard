#!/bin/bash
# TX Lottery Dashboard data refresh — called by launchd
# Fetches data natively and pushes to GitHub to trigger Vercel

set -euo pipefail

PROJ="/Users/danielbally/Git/tx-lottery-dashboard"
LOG="/tmp/tx-lottery-refresh.log"

echo "--- $(date) ---" >> "$LOG"
cd "$PROJ"

# Source NVM to ensure the correct Node version is used
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 >> "$LOG" 2>&1

echo "Fetching fresh Texas Lottery data..." >> "$LOG"
node scripts/build-lottery-data.mjs >> "$LOG" 2>&1

echo "Committing and pushing to GitHub (Triggering Vercel deployment)..." >> "$LOG"
git add src/data/lottery-data.json src/data/lottery-history.json >> "$LOG" 2>&1
git commit -m "chore(data): Mac local nightly automated data deployment" || echo "No changes" >> "$LOG" 2>&1
git push origin main >> "$LOG" 2>&1

echo "Done!" >> "$LOG"
