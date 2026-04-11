#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:send-onboarding-welcome-backfill:prod
# Envoie la lettre du fondateur aux utilisateurs
# existants en production (cutoff 12/03/2026).
#
# Usage:
#   pnpm db:send-onboarding-welcome-backfill:prod             # dry-run
#   pnpm db:send-onboarding-welcome-backfill:prod --execute   # envoi réel
# ─────────────────────────────────────────────

set -euo pipefail

# Load env vars
if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID|AUTH_RESEND_KEY|ONBOARDING_EMAIL_FROM)=' .env.local | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_PROD_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_PROD_BRANCH_ID in .env.local"
  exit 1
fi

if [ -z "${AUTH_RESEND_KEY:-}" ]; then
  echo "❌ Missing AUTH_RESEND_KEY in .env.local"
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

# Forwarder les args (--execute) au script TS
ARGS=("$@")
IS_EXECUTE=false
for arg in "${ARGS[@]}"; do
  if [ "$arg" = "--execute" ]; then
    IS_EXECUTE=true
  fi
done

echo ""
echo "⚠️  Vous êtes sur le point de lancer le backfill onboarding welcome en PRODUCTION."
echo "   Branch    : production (${NEON_PROD_BRANCH_ID})"
echo "   Cutoff    : utilisateurs inscrits après 12/03/2026 (post campagne Brevo)"
echo "   Exclusion : admins, @test.playground, @demo.playground + liste manuelle"
echo "   Mode      : $([ "$IS_EXECUTE" = true ] && echo 'EXECUTE (envoi réel)' || echo 'DRY-RUN (aucun envoi)')"
echo ""

if [ "$IS_EXECUTE" = true ]; then
  echo "   🚨 ATTENTION : cette opération va envoyer des vrais emails à des vrais utilisateurs."
  read -p "   Tapez 'SEND' pour confirmer : " -r
  echo ""
  if [[ $REPLY != "SEND" ]]; then
    echo "   Annulé."
    exit 0
  fi
else
  read -p "   Continuer ? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   Annulé."
    exit 0
  fi
fi

echo ""
echo "🌱 Backfill onboarding welcome en production..."
DATABASE_URL="${PROD_URL}" \
  AUTH_RESEND_KEY="${AUTH_RESEND_KEY}" \
  ONBOARDING_EMAIL_FROM="${ONBOARDING_EMAIL_FROM:-Dragos · The Playground <dragos@the-playground.fr>}" \
  npx tsx scripts/send-onboarding-welcome-backfill.ts "${ARGS[@]}"
