#!/usr/bin/env bash
# ─────────────────────────────────────────────
# seed-covers:prod — Assigne des covers Unsplash
# aux Circles et Moments sans cover en production.
#
# Usage: pnpm db:seed-covers:prod
# ─────────────────────────────────────────────

set -euo pipefail

# Load env vars
if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID|BLOB_READ_WRITE_TOKEN|UNSPLASH_ACCESS_KEY)=' .env.local | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_PROD_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_PROD_BRANCH_ID in .env.local"
  exit 1
fi

if [ -z "${BLOB_READ_WRITE_TOKEN:-}" ]; then
  echo "❌ Missing BLOB_READ_WRITE_TOKEN in .env.local"
  exit 1
fi

if [ -z "${UNSPLASH_ACCESS_KEY:-}" ]; then
  echo "❌ Missing UNSPLASH_ACCESS_KEY in .env.local"
  exit 1
fi

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
AUTH="Authorization: Bearer ${NEON_API_KEY}"

# Fetch production branch connection string
echo "🔍 Récupération de la connexion production..."

RESPONSE=$(curl -s -H "$AUTH" "${API}/connection_uri?branch_id=${NEON_PROD_BRANCH_ID}&pooled=true&database_name=neondb&role_name=neondb_owner")
PROD_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uri'])")

if [ -z "$PROD_URL" ]; then
  echo "❌ Impossible de récupérer la connexion production."
  exit 1
fi

echo ""
echo "⚠️  Vous êtes sur le point d'assigner des covers Unsplash en PRODUCTION."
echo "   Branch : production (${NEON_PROD_BRANCH_ID})"
echo "   Action : upload Vercel Blob + mise à jour DB pour tous les Circles/Moments sans cover."
echo ""
read -p "   Continuer ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   Annulé."
  exit 0
fi

echo ""
echo "🎨 Assignation des covers en production..."
DATABASE_URL="${PROD_URL}" \
  BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN}" \
  UNSPLASH_ACCESS_KEY="${UNSPLASH_ACCESS_KEY}" \
  npx tsx scripts/seed-covers.ts --execute
