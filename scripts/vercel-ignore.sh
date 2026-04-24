#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Vercel ignoreCommand — décide si un build est nécessaire.
#
# Sortie :
#   exit 1 → build (déployer)
#   exit 0 → skip (pas de build)
#
# Règles :
#   - Branche `staging` : toujours build
#   - Branche `main` :
#       - build si src/content/** a changé (posts blog qui impactent les routes)
#       - skip si uniquement CHANGELOG.md, spec/**, *.md, .github/** ont changé (docs-only)
#       - build sinon
#   - Autres branches : skip (les preview builds sont désactivés sauf staging)
# ─────────────────────────────────────────────

set -euo pipefail

if [ "$VERCEL_GIT_COMMIT_REF" = "staging" ]; then
  exit 1
fi

if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
  exit 0
fi

if git diff --name-only HEAD~1 -- 'src/content/**' | grep -q .; then
  exit 1
fi

git diff --quiet HEAD~1 -- ':!CHANGELOG.md' ':!spec/**' ':!*.md' ':!.github/**'
