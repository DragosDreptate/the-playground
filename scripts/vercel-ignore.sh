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
#       - build si CHANGELOG.md a changé (la page /changelog le lit à l'exécution
#         depuis le filesystem du build → une édition doit redéployer)
#       - skip si uniquement docs/scripts hors-build ont changé (spec/**,
#         memory/**, *.md, .github/**, .gitignore, scripts/**)
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

# La page /changelog rend CHANGELOG.md lu à l'exécution depuis le filesystem du
# build : toute édition du changelog (release ou correction hors-bande) doit
# déclencher un redéploiement, sinon la prod sert l'ancien fichier.
if ! git diff --quiet HEAD~1 -- CHANGELOG.md; then
  exit 1
fi

git diff --quiet HEAD~1 -- \
  ':!spec/**' \
  ':!memory/**' \
  ':!*.md' \
  ':!.github/**' \
  ':!.gitignore' \
  ':!scripts/**'
