#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# transfer-circle-host:prod — Transfère le rôle d'Organisateur en production.
#
# Usage: pnpm transfer-circle-host:prod
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Load env vars
if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID|AUTH_RESEND_KEY|NEXT_PUBLIC_APP_URL)=' .env.local | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_PROD_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_PROD_BRANCH_ID in .env.local"
  exit 1
fi

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
AUTH="Authorization: Bearer ${NEON_API_KEY}"

echo "🔍 Fetching production connection string..."

RESPONSE=$(curl -s -H "$AUTH" "${API}/connection_uri?branch_id=${NEON_PROD_BRANCH_ID}&pooled=true&database_name=neondb&role_name=neondb_owner")
PROD_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uri'])")

if [ -z "$PROD_URL" ]; then
  echo "❌ Could not retrieve production connection string."
  exit 1
fi

echo ""
echo "⚠️  Vous êtes sur le point de transférer un rôle d'Organisateur en PRODUCTION."
echo "   Vérifiez les paramètres dans scripts/transfer-circle-host.ts avant de continuer."
echo ""
read -p "   Continuer ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   Annulé."
  exit 0
fi

echo ""
echo "🔍 Dry-run d'abord..."
DATABASE_URL="${PROD_URL}" npx tsx scripts/transfer-circle-host.ts

echo ""
read -p "   Tout semble correct. Appliquer ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   Annulé."
  exit 0
fi

echo ""
echo "🚀 Application des changements en production..."
DATABASE_URL="${PROD_URL}" npx tsx scripts/transfer-circle-host.ts --execute
