#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:push:prod — Push Prisma schema to the
# Neon production branch (with confirmation).
#
# Usage: pnpm db:push:prod
# ─────────────────────────────────────────────

set -euo pipefail

# Load env vars
if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID)=' .env.local | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_PROD_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_PROD_BRANCH_ID in .env.local"
  exit 1
fi

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
AUTH="Authorization: Bearer ${NEON_API_KEY}"

# Fetch production branch connection string
echo "🔍 Fetching production connection string..."

RESPONSE=$(curl -s -H "$AUTH" "${API}/connection_uri?branch_id=${NEON_PROD_BRANCH_ID}&pooled=true&database_name=neondb&role_name=neondb_owner")
PROD_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uri'])")

if [ -z "$PROD_URL" ]; then
  echo "❌ Could not retrieve production connection string."
  exit 1
fi

echo ""
echo "⚠️  You are about to push the Prisma schema to PRODUCTION."
echo "   Branch: production (${NEON_PROD_BRANCH_ID})"
echo ""
read -p "   Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   Cancelled."
  exit 0
fi

echo ""
echo "🚀 Pushing schema to production..."
DATABASE_URL="${PROD_URL}" npx prisma db push --accept-data-loss
echo ""
echo "✅ Production database is now in sync with the Prisma schema."
