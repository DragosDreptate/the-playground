#!/usr/bin/env bash
# ─────────────────────────────────────────────
# db:dev:reset — Recreate the Neon dev branch
# from a fresh snapshot of production data.
#
# Usage: pnpm db:dev:reset
# ─────────────────────────────────────────────

set -euo pipefail

# Source de vérité unique : le .env.local du repo principal. Les worktrees
# pointent dessus via symlink (cf. scripts/worktree-new.sh), donc un reset
# depuis n'importe quel worktree met à jour les credentials pour tous.
MAIN_ROOT="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -n 1)"
ENV_FILE="${MAIN_ROOT}/.env.local"

# Load env vars
if [ -f "$ENV_FILE" ]; then
  export $(grep -E '^(NEON_API_KEY|NEON_PROJECT_ID|NEON_PROD_BRANCH_ID)=' "$ENV_FILE" | xargs)
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ] || [ -z "${NEON_PROD_BRANCH_ID:-}" ]; then
  echo "❌ Missing NEON_API_KEY, NEON_PROJECT_ID, or NEON_PROD_BRANCH_ID in $ENV_FILE"
  exit 1
fi

API="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
AUTH="Authorization: Bearer ${NEON_API_KEY}"

echo "🔍 Looking for existing dev branch..."

DEV_BRANCH_ID=$(curl -s -H "$AUTH" "${API}/branches" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for b in data.get('branches', []):
    if b['name'] == 'dev':
        print(b['id'])
        break
" 2>/dev/null || true)

if [ -n "$DEV_BRANCH_ID" ]; then
  echo "🗑️  Deleting existing dev branch ($DEV_BRANCH_ID)..."
  curl -s -X DELETE -H "$AUTH" "${API}/branches/${DEV_BRANCH_ID}" > /dev/null
  echo "   Deleted."
  sleep 2
fi

echo "🌱 Creating new dev branch from production..."

RESPONSE=$(curl -s -X POST \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"branch\": {
      \"name\": \"dev\",
      \"parent_id\": \"${NEON_PROD_BRANCH_ID}\"
    },
    \"endpoints\": [
      {
        \"type\": \"read_write\"
      }
    ]
  }" \
  "${API}/branches")

NEW_BRANCH_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['branch']['id'])")
POOLER_HOST=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['endpoints'][0]['hosts']['read_write_pooled_host'])")
PASSWORD=$(echo "$RESPONSE" | python3 -c "import sys,json; uri=json.load(sys.stdin)['connection_uris'][0]['connection_parameters']; print(uri['password'])")
ROLE=$(echo "$RESPONSE" | python3 -c "import sys,json; uri=json.load(sys.stdin)['connection_uris'][0]['connection_parameters']; print(uri['role'])")
DB=$(echo "$RESPONSE" | python3 -c "import sys,json; uri=json.load(sys.stdin)['connection_uris'][0]['connection_parameters']; print(uri['database'])")

NEW_URL="postgresql://${ROLE}:${PASSWORD}@${POOLER_HOST}/${DB}?sslmode=require"

echo ""
echo "✅ Dev branch created: $NEW_BRANCH_ID"
echo ""

# Auto-update le .env.local du repo principal (les worktrees pointent dessus via symlink)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_URL}\"|" "$ENV_FILE"
else
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_URL}\"|" "$ENV_FILE"
fi

echo "✅ ${ENV_FILE} updated automatically."
echo ""
echo "🔄 Regenerating Prisma client..."
npx prisma generate --no-hints 2>/dev/null
echo ""
echo "🎉 Done! Dev branch is a fresh snapshot of production."
