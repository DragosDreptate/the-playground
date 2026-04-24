#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:studio:staging — Open Prisma Studio connected
# to the Neon staging branch.
#
# Usage: pnpm db:studio:staging
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
  echo "   Response: $RESPONSE"
  exit 1
fi

echo "✅ Connected to staging"
echo ""
echo "ℹ️  Prisma Studio will open at http://localhost:5555"
echo ""

DATABASE_URL="${STAGING_URL}" npx prisma studio
