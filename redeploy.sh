#!/usr/bin/env bash
# redeploy.sh — Redeploy J.A.R.V.I.S. Command Center to Vercel
# Usage: bash redeploy.sh
set -e

cd /home/ubuntu/.openclaw/workspace/jarvis-command-center
echo "► Pulling latest changes..."
git pull origin master

echo "► Rebuilding..."
npm run build

echo "► Deploying to Vercel..."
env -u VERCEL_TOKEN vercel deploy --prod --yes 2>&1

echo "► Restarting local service..."
sudo systemctl restart jarvis-dashboard || true

echo "✓ Redeploy complete!"
