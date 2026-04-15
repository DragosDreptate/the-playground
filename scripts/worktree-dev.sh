#!/usr/bin/env bash
# worktree-dev.sh — Lance le dev server (:3000) depuis un worktree existant.
#
# Usage :
#   ./scripts/worktree-dev.sh <worktree-dir-name>
#
# Exemple :
#   ./scripts/worktree-dev.sh the-playground-feat-my-feature
#
# Ce que le script fait :
#   1. Stoppe tout processus écoutant sur le port 3000 (dev server du repo principal)
#   2. cd dans le worktree spécifié (situé à côté du repo principal)
#   3. Lance `pnpm dev` sur le port 3000 (même port, mêmes cookies, même OAuth)
#   4. À Ctrl+C, affiche la commande pour relancer le dev server principal
#
# Pourquoi :
#   Les worktrees tournent normalement sur PORT=3001 pour ne pas entrer en
#   conflit avec le principal. Mais ça casse l'auth (cookies scope port),
#   OAuth (callback URLs sur :3000), et les emails (NEXT_PUBLIC_APP_URL).
#   Ce script résout le problème en swappant temporairement le port :3000
#   vers le worktree qu'on veut tester.

set -euo pipefail

# `git worktree list --porcelain` liste toujours le repo principal en premier,
# ce qui évite le piège de `git rev-parse --show-toplevel` qui retourne le
# worktree courant quand on est dans un worktree.
main_root="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -n 1)"
parent_dir="$(dirname "$main_root")"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <worktree-dir-name>" >&2
  echo "Example: $0 the-playground-feat-my-feature" >&2
  echo "" >&2
  echo "Active worktrees:" >&2
  git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | grep -vxF "$main_root" | sed 's/^/  /' >&2
  exit 1
fi

worktree_name="$1"
worktree_dir="$parent_dir/$worktree_name"

if [ ! -d "$worktree_dir" ]; then
  echo "Error: $worktree_dir does not exist" >&2
  echo "" >&2
  echo "Active worktrees:" >&2
  git worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | grep -vxF "$main_root" | sed 's/^/  /' >&2
  exit 1
fi

# Stop any existing dev server on :3000
echo "→ Stopping any process on port 3000..."
lsof -ti :3000 | xargs kill 2>/dev/null || true
sleep 1

branch="$(git -C "$worktree_dir" branch --show-current 2>/dev/null || echo "?")"
echo "→ Starting dev server on :3000"
echo "    Worktree : $worktree_dir"
echo "    Branche  : $branch"
echo ""
echo "  Ctrl+C pour arrêter."
echo ""

cd "$worktree_dir"

# Trap SIGINT pour afficher un message de restauration après Ctrl+C
trap '
  echo ""
  echo "→ Dev server arrêté."
  echo ""
  echo "  Pour relancer ton repo principal :"
  echo "    cd \"'"$main_root"'\" && pnpm dev"
' INT

pnpm dev || true
