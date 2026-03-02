#!/bin/bash
set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use --lts

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Refreshing lottery data..."
npm run refresh:data

echo "==> Building for production..."
vercel build --prod --yes

echo "==> Deploying to Vercel..."
TMPDIR=$(mktemp -d)
cp -r .vercel "$TMPDIR/"
cd "$TMPDIR"
vercel deploy --prebuilt --prod --yes

echo "==> Done!"
