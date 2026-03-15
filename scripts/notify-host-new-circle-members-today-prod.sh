#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Backfill one-shot : notifie les Organisateurs des nouvelles adhésions du 15/03/2026.
#
# Mode dry-run (défaut) : affiche la liste, n'envoie rien.
# Mode execute          : envoie réellement les emails.
#
# Usage dry-run : pnpm notify:host-new-circle-members-today:prod
# Usage execute : pnpm notify:host-new-circle-members-today:prod --execute
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

if [ -f .env.local ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID|AUTH_RESEND_KEY|NEXT_PUBLIC_APP_URL)=' .env.local | xargs)
  # EMAIL_FROM peut contenir des espaces/chevrons — chargement séparé, guillemets supprimés
  EMAIL_FROM=$(grep -E '^EMAIL_FROM=' .env.local | head -1 | cut -d= -f2- | sed 's/^["'"'"']//;s/["'"'"']$//')
  export EMAIL_FROM
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

echo "🔍 Récupération de la connexion production..."
RESPONSE=$(curl -s -H "$AUTH" "${API}/connection_uri?branch_id=${NEON_PROD_BRANCH_ID}&pooled=true&database_name=neondb&role_name=neondb_owner")
PROD_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uri'])")

if [ -z "$PROD_URL" ]; then
  echo "❌ Impossible de récupérer la connexion production."
  exit 1
fi

EXECUTE_FLAG="${1:-}"

if [ "$EXECUTE_FLAG" = "--execute" ]; then
  echo ""
  echo "⚠️  PRODUCTION — envoi réel des emails de notification"
  echo "   Organisateurs notifiés : nouveaux membres du 15/03/2026"
  echo ""
  read -p "   Confirmer l'envoi ? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   Annulé."
    exit 0
  fi
fi

echo ""
DATABASE_URL="${PROD_URL}" \
  AUTH_RESEND_KEY="${AUTH_RESEND_KEY}" \
  EMAIL_FROM="${EMAIL_FROM:-}" \
  NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://the-playground.fr}" \
  npx tsx scripts/notify-host-new-circle-members-today.ts $EXECUTE_FLAG
