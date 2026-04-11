#!/usr/bin/env bash
# worktree-new.sh — Crée un nouveau git worktree prêt à l'emploi.
#
# Usage :
#   ./scripts/worktree-new.sh <branch-name>
#
# Exemple :
#   ./scripts/worktree-new.sh feat/my-feature
#
# Ce que le script fait :
#   1. Fetche origin/main
#   2. Crée un worktree à côté du repo principal, avec une nouvelle branche
#      partant d'origin/main
#   3. Installe les dépendances (--prefer-offline, rapide grâce au store pnpm partagé)
#   4. Copie .env.local depuis le repo principal si présent
#   5. Affiche un message de fin avec la commande pour lancer le dev server
#      sur un port alternatif (3001) pour ne pas entrer en conflit avec le
#      dev server du repo principal

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <branch-name>" >&2
  echo "Example: $0 feat/my-feature" >&2
  exit 1
fi

branch="$1"

# Détecter la racine du repo principal (le script peut être appelé depuis n'importe où)
main_root="$(git rev-parse --show-toplevel)"
main_name="$(basename "$main_root")"
parent_dir="$(dirname "$main_root")"

# Slug pour le nom du répertoire : remplacer / par -
slug="${branch//\//-}"
worktree_dir="$parent_dir/$main_name-$slug"

if [ -e "$worktree_dir" ]; then
  echo "Error: $worktree_dir already exists" >&2
  exit 1
fi

echo "→ Fetch origin/main"
git -C "$main_root" fetch origin main --quiet

echo "→ Create worktree at $worktree_dir"
git -C "$main_root" worktree add -b "$branch" "$worktree_dir" origin/main

echo "→ Install dependencies (pnpm install --prefer-offline)"
cd "$worktree_dir"
pnpm install --prefer-offline --silent

if [ -f "$main_root/.env.local" ]; then
  echo "→ Copy .env.local"
  cp "$main_root/.env.local" .env.local
fi

echo ""
echo "✓ Worktree prêt"
echo "    Path    : $worktree_dir"
echo "    Branche : $branch"
echo ""
echo "  Suite :"
echo "    cd \"$worktree_dir\""
echo "    PORT=3001 pnpm dev    # port alternatif pour ne pas entrer en conflit avec le repo principal"
