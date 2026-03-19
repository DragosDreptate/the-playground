---
packageVersion: 1.0.0
packageId: the-playground
---

# /release Command

Gère la montée de version de The Playground de bout en bout, en suivant la procédure officielle Release Please.

## Ce que fait ce skill

1. Vérifie que le CI sur main est vert (pré-requis)
2. Vérifie que la page Aide est à jour avec les features de la release
3. Trouve la PR Release Please en attente
4. Déclenche le CI via commit vide (branch protection l'exige — `workflow_dispatch` ne satisfait pas les PR checks)
5. Attend la stabilisation du HEAD (race condition avec "Humanize Changelog")
6. Attend le CI vert
7. Vérifie le schema Prisma avant le merge
8. Merge la PR avec `--admin` (les CI checks ne s'enregistrent pas comme PR status checks sur ce repo)
9. Vérifie que le GitHub Release a été créé

## Exécution

Suis ces étapes dans l'ordre, sans jamais en sauter une.

### Étape 1 — Pré-vérification : CI sur main

Avant toute chose, vérifier que le dernier CI sur main est vert :

```bash
gh run list --branch main --workflow CI --limit 1 --json conclusion --jq '.[0].conclusion'
```

Si `conclusion != "success"` → **STOP**. Le CI sur main doit être vert avant de lancer une release. Un test flaky sur main sera flaky sur la branche release aussi. Informer l'utilisateur et s'arrêter.

### Étape 2 — Vérifier la page Aide (OBLIGATOIRE)

Avant chaque release, s'assurer que la page Aide reflète les features incluses. Lancer l'agent `docs-coherence-guardian` :

> Vérifie que la page Aide (clé "Help" dans messages/fr.json et messages/en.json + page help/page.tsx) est à jour avec toutes les fonctionnalités implémentées depuis la dernière release. Si des features manquent, ajoute-les.

Si l'agent détecte des écarts et effectue des modifications :
1. Committer les changements sur main (branche dédiée → PR → merge)
2. Attendre que Release Please mette à jour sa PR avec les nouveaux commits
3. Puis continuer avec l'étape 3

Si la page Aide est déjà à jour → continuer directement.

### Étape 3 — Trouver la PR Release Please

**Toujours chercher par nom de branche** (pas par titre — les parenthèses dans le titre cassent la recherche GitHub) :

```bash
gh pr list --head "release-please--branches--main--components--the-playground" --state open --json number,title,headRefName
```

Si aucune PR → Release Please n'a pas encore tourné ou tous les commits depuis la dernière release sont de type `chore`/`ci`/`test`/`style` (hidden). Informer l'utilisateur et s'arrêter.

Si une PR existe → noter le `number` et le `headRefName` (branche).

Afficher : "PR de release trouvée : #NUMBER — TITLE"

### Étape 4 — Afficher la version proposée

```bash
gh pr view NUMBER --json title,body
```

Extraire et afficher la version proposée depuis le titre.

### Étape 5 — Déclencher le CI via commit vide

Le `workflow_dispatch` ne satisfait pas les branch protection checks de GitHub — il faut un commit sur la branche pour déclencher le CI dans le contexte PR.

```bash
git fetch origin NOM_BRANCHE
git checkout NOM_BRANCHE
git commit --allow-empty -m "ci: trigger CI checks for release PR"
git push origin NOM_BRANCHE
```

Récupérer l'ID du run déclenché :

```bash
gh run list --workflow=CI --branch NOM_BRANCHE --limit 1 --json databaseId,status
```

Afficher le lien vers le run GitHub Actions.

### Étape 6 — Attendre la stabilisation du HEAD (race condition "Humanize Changelog")

"Humanize Changelog" peut pousser un commit après le déclenchement du CI, changeant le HEAD SHA et invalidant les checks. Son commit contient `[skip ci]` donc aucun nouveau CI n'est déclenché automatiquement — il faut détecter ça et repousser un commit vide.

**Attendre 60 secondes**, puis boucler jusqu'à stabilisation :

```bash
# Capturer le HEAD SHA actuel
CURRENT_SHA=$(gh pr view NUMBER --json headRefOid --jq '.headRefOid')

# Comparer avec le SHA du run CI en cours
RUN_SHA=$(gh run view RUN_ID --json headSha --jq '.headSha')
```

Si `CURRENT_SHA != RUN_SHA` → Humanize Changelog a poussé après le déclenchement du CI. **Il faut resynchroniser et repousser un commit vide** :

```bash
git fetch origin NOM_BRANCHE
git reset --hard origin/NOM_BRANCHE
git commit --allow-empty -m "ci: trigger CI checks for release PR"
git push origin NOM_BRANCHE
```

Récupérer le nouvel ID de run et reprendre depuis l'étape 6. Répéter jusqu'à `CURRENT_SHA == RUN_SHA` (HEAD stable).

> ⚠️ Ne jamais utiliser `gh workflow run CI --ref BRANCHE` pour redéclencher — ça ne génère pas de PR status checks.

### Étape 7 — Attendre le CI vert

```bash
gh run watch RUN_ID
```

Si le CI échoue → **voir "En cas de CI rouge sur la branche release" ci-dessous**. Ne jamais merger sur CI rouge.

### Étape 8 — Vérifier le schema Prisma (OBLIGATOIRE)

```bash
git diff main...NOM_BRANCHE -- prisma/schema.prisma
```

- Output **non vide** → `pnpm db:push:prod` AVANT le merge, sans exception
- Output **vide** → continuer directement au merge

### Étape 9 — Merger

Les CI checks passent sur la branche mais ne s'enregistrent pas comme PR status checks sur ce repo → `--admin` est toujours nécessaire.

```bash
gh pr merge NUMBER --merge --admin --delete-branch
git checkout main && git pull
```

Si un `git stash` a été fait en début de session (package.json modifié localement) → `git stash pop` après le pull.

### Étape 10 — Vérifier la création du GitHub Release

Attendre que Release Please tourne sur main :

```bash
gh run watch $(gh run list --workflow="Release Please" --limit 1 --json databaseId --jq '.[0].databaseId')
```

Puis vérifier que le GitHub Release a été créé :

```bash
gh release list --limit 3
```

Afficher la nouvelle release et son tag (`the-playground-vX.Y.Z`).

## Règles absolues

- ❌ Ne jamais merger si le CI est rouge
- ❌ Ne jamais pousser du code (fix, refactoring) sur la branche release-please — seuls les commits vides `ci: trigger CI checks` sont autorisés
- ❌ Ne jamais sauter l'étape de vérification schema Prisma
- ❌ Ne jamais créer de tag git manuellement
- ❌ Ne jamais modifier `CHANGELOG.md` ou `package.json` version manuellement
- ❌ Ne jamais utiliser `gh workflow run` pour redéclencher le CI (ne génère pas de PR checks)
- ❌ Ne jamais chercher la PR par titre avec `--search` (les parenthèses cassent la recherche GitHub)
- ✅ Toujours chercher la PR par branche avec `--head "release-please--branches--main--components--the-playground"`
- ✅ Toujours vérifier que le CI sur main est vert AVANT de commencer
- ✅ Toujours utiliser `git commit --allow-empty + git push` pour déclencher/redéclencher le CI
- ✅ Toujours utiliser `--admin` au merge (les CI checks ne s'enregistrent pas comme PR status checks)
- ✅ Toujours laisser Release Please gérer la version et le changelog

## En cas de CI rouge sur la branche release

⛔ **NE JAMAIS pousser un fix directement sur la branche release-please.**

Release Please contrôle cette branche — elle peut être force-pushée à tout moment. Un fix poussé dessus peut être écrasé, et il ne sera pas testé sur main.

**Procédure correcte :**

1. Identifier le test ou le code en échec dans les logs CI
2. Retourner sur main : `git checkout main && git pull`
3. Créer une branche de fix : `git checkout -b fix/nom-du-fix`
4. Corriger le problème + commit + push + PR + merge sur main
5. Attendre que Release Please mette à jour la PR de release automatiquement (elle incorpore les nouveaux commits de main)
6. Reprendre la procédure release à l'étape 4 (déclencher le CI)

## En cas de problème

| Symptôme | Cause | Fix |
|---|---|---|
| Aucune PR trouvée | Pas de feat/fix depuis la dernière release | Normal — pas de release à faire |
| Version calculée = 1.0.0 | Manifest key incorrecte | Vérifier `.release-please-manifest.json` → clé doit être `"."` |
| HEAD SHA instable après 60s | Humanize Changelog lent | Attendre 30s supplémentaires et revérifier |
| Merge échoue malgré CI vert | PR status checks non enregistrés | Utiliser `--admin` |
| `package.json` modifié localement | Stash auto à la checkout de la branche release | `git stash pop` après `git checkout main` |
| `--search "chore(main): release"` ne trouve pas la PR | Parenthèses dans la query GitHub Search | Utiliser `--head "release-please--branches--..."` |
| CI rouge sur la branche release | Test flaky ou régression non détectée sur main | **Fixer sur main d'abord**, pas sur la branche release |
