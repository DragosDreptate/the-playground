#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:cleanup-test-data:prod — Supprime toutes
# les données de test (@test.playground) de la
# branche Neon production.
#
# Usage: pnpm db:cleanup-test-data:prod
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
echo "🔴 ATTENTION — Suppression de données en PRODUCTION"
echo "   Branch: production (${NEON_PROD_BRANCH_ID})"
echo "   Seront supprimés : tous les utilisateurs @test.playground et leurs données."
echo "   Les vraies données utilisateurs ne sont PAS touchées."
echo ""
read -p "   Confirmer la suppression ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   Annulé."
  exit 0
fi

echo ""
echo "🧹 Nettoyage des données test en production..."
DATABASE_URL="${PROD_URL}" npx tsx scripts/db-cleanup-test-data.ts --execute
