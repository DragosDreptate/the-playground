#!/usr/bin/env bash
# worktree-cleanup.sh — Retire tous les worktrees sans modifications non committées.
#
# Usage :
#   ./scripts/worktree-cleanup.sh
#
# Ce que le script fait :
#   1. Liste tous les worktrees sauf le repo principal
#   2. Pour chacun, vérifie s'il y a des changements staged ou unstaged
#   3. Si clean → `git worktree remove`
#   4. Si dirty → skip et affiche un warning
#   5. À la fin, liste les worktrees restants
#
# Note : les fichiers untracked ne bloquent PAS la suppression (les worktrees
# contiennent typiquement `.next/`, `node_modules/`, etc. qui sont untracked).
# Si on veut être strict, `git worktree remove --force` peut être ajouté
# manuellement pour les cas où on sait ce qu'on fait.

set -euo pipefail

main_root="$(git rev-parse --show-toplevel)"

# Si on est appelé depuis un worktree secondaire, remonter au repo principal
if git -C "$main_root" worktree list --porcelain | awk '/^worktree / { print $2 }' | head -1 | grep -q -v "^$main_root$"; then
  main_root="$(git -C "$main_root" worktree list --porcelain | awk '/^worktree / { print $2; exit }')"
fi

removed=0
skipped=0

git -C "$main_root" worktree list --porcelain | awk '/^worktree / { print $2 }' | while read -r wt_path; do
  # Skip le worktree principal
  if [ "$wt_path" = "$main_root" ]; then
    continue
  fi

  # Skip si le worktree n'existe plus sur disque (listé par git mais manquant)
  if [ ! -d "$wt_path" ]; then
    echo "⊘ Missing on disk: $wt_path (run 'git worktree prune')"
    continue
  fi

  # Check changements staged ou unstaged
  if ! git -C "$wt_path" diff --quiet 2>/dev/null || ! git -C "$wt_path" diff --cached --quiet 2>/dev/null; then
    echo "⊘ Skipped (dirty): $wt_path"
    continue
  fi

  echo "✓ Removing   : $wt_path"
  git -C "$main_root" worktree remove "$wt_path"
done

echo ""
echo "Worktrees restants :"
git -C "$main_root" worktree list
