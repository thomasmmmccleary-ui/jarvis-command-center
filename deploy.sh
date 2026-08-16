#!/usr/bin/env bash
# deploy.sh — J.A.R.V.I.S. Command Center deployment script
# Run from: /home/ubuntu/.openclaw/workspace/jarvis-command-center/
# Usage: bash deploy.sh

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     J.A.R.V.I.S. COMMAND CENTER — DEPLOYMENT SCRIPT     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ──────────────────────────────────────
echo "► Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "  ✗ $1 not found"
    return 1
  fi
  echo "  ✓ $1 found: $(command -v $1)"
  return 0
}

GH_OK=true
VERCEL_OK=true
NODE_OK=true

check_cmd node   || NODE_OK=false
check_cmd npm    || true
check_cmd git    || true
check_cmd gh     || GH_OK=false
check_cmd vercel || VERCEL_OK=false

echo ""

# ── 2. Check gh auth ────────────────────────────────────────────
if $GH_OK; then
  echo "► Checking gh auth..."
  if gh auth status 2>&1; then
    GH_AUTHED=true
    echo "  ✓ GitHub CLI authenticated"
  else
    GH_AUTHED=false
    echo "  ✗ GitHub CLI NOT authenticated"
    echo ""
    echo "  To authenticate:"
    echo "    gh auth login"
    echo "  Or with a token:"
    echo "    echo YOUR_TOKEN | gh auth login --with-token"
  fi
else
  GH_AUTHED=false
  echo "  ✗ gh CLI not installed. Install: https://cli.github.com/"
fi
echo ""

# ── 3. Check vercel auth ────────────────────────────────────────
if $VERCEL_OK; then
  echo "► Checking vercel auth..."
  if vercel whoami 2>&1; then
    VERCEL_AUTHED=true
    echo "  ✓ Vercel CLI authenticated"
  else
    VERCEL_AUTHED=false
    echo "  ✗ Vercel CLI NOT authenticated"
    echo ""
    echo "  To authenticate:"
    echo "    vercel login"
    echo "  Or with a token:"
    echo "    vercel login --token YOUR_TOKEN"
  fi
else
  VERCEL_AUTHED=false
  echo "  ✗ vercel CLI not installed."
  echo "  Install: npm i -g vercel"
fi
echo ""

# ── 4. Abort if auth missing ────────────────────────────────────
if ! $GH_AUTHED || ! $VERCEL_AUTHED; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  AUTH REQUIRED — fix above, then re-run deploy.sh       ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 1
fi

# ── 5. Git init + commit ────────────────────────────────────────
echo "► Initialising git repo..."
if [ ! -d .git ]; then
  git init
  echo "  ✓ git init"
else
  echo "  ✓ git repo already initialised"
fi

git add .
git commit -m "feat: J.A.R.V.I.S. Command Center v1 — 111 agents dashboard" || echo "  (nothing new to commit)"
echo ""

# ── 6. Create GitHub repo and push ─────────────────────────────
echo "► Creating GitHub repo and pushing..."
REPO_URL=$(gh repo create jarvis-command-center \
  --public \
  --source=. \
  --remote=origin \
  --push \
  2>&1 | tee /dev/stderr | grep 'https://github.com' | head -1)

echo ""
echo "  ✓ GitHub repo: $REPO_URL"
echo ""

# ── 7. Deploy to Vercel ─────────────────────────────────────────
echo "► Deploying to Vercel (production)..."
VERCEL_OUTPUT=$(vercel --prod --yes --name jarvis-command-center 2>&1)
echo "$VERCEL_OUTPUT"

VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -E 'https://.*vercel\.app' | tail -1)
echo ""

# ── 8. Summary ──────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT COMPLETE                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  GitHub:  ${REPO_URL:-'(check above output)'}"
echo "  Vercel:  ${VERCEL_URL:-'(check above output)'}"
echo ""
echo "  Share your dashboard:"
echo "  → ${VERCEL_URL:-'<vercel-url>'}"
echo ""
