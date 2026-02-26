#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:export-brevo-contacts:prod — Exporte les
# contacts réels depuis la branche Neon production
# vers un CSV prêt à importer dans Brevo.
#
# Usage: pnpm db:export-brevo-contacts:prod
# ─────────────────────────────────────────────

set -euo pipefail

if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID)=' .env.local | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_PROD_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_PROD_BRANCH_ID in .env.local"
  exit 1
fi

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
AUTH="Authorization: Bearer ${NEON_API_KEY}"

echo "🔍 Récupération de la connexion production..."

RESPONSE=$(curl -s -H "$AUTH" "${API}/connection_uri?branch_id=${NEON_PROD_BRANCH_ID}&pooled=true&database_name=neondb&role_name=neondb_owner")
PROD_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uri'])")

if [ -z "$PROD_URL" ]; then
  echo "❌ Impossible de récupérer la connexion production."
  exit 1
fi

echo ""
DATABASE_URL="${PROD_URL}" npx tsx scripts/export-brevo-contacts.ts
