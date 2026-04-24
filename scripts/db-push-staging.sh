#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:push:staging — Push Prisma schema to the
# Neon staging branch (with confirmation).
#
# Usage: pnpm db:push:staging
# ─────────────────────────────────────────────

set -euo pipefail

# Load env vars
if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_STAGING_BRANCH_ID)=' .env.local | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_STAGING_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_STAGING_BRANCH_ID in .env.local"
  exit 1
fi

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
AUTH="Authorization: Bearer ${NEON_API_KEY}"

echo "🔍 Fetching staging connection string..."

RESPONSE=$(curl -s -H "$AUTH" "${API}/connection_uri?branch_id=${NEON_STAGING_BRANCH_ID}&pooled=true&database_name=neondb&role_name=neondb_owner")
STAGING_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uri'])")

if [ -z "$STAGING_URL" ]; then
  echo "❌ Could not retrieve staging connection string."
  exit 1
fi

echo ""
echo "⚠️  You are about to push the Prisma schema to STAGING."
echo "   Branch: staging (${NEON_STAGING_BRANCH_ID})"
echo ""
read -p "   Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   Cancelled."
  exit 0
fi

echo ""
echo "🚀 Pushing schema to staging..."
DATABASE_URL="${STAGING_URL}" npx prisma db push --accept-data-loss
echo ""
echo "✅ Staging database is now in sync with the Prisma schema."
