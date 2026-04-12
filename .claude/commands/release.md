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
4. Attend que "Humanize Changelog" ait fini (s'il tourne)
5. Déclenche le CI via commit vide (branch protection l'exige — `workflow_dispatch` ne satisfait pas les PR checks)
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

### Étape 2 — Vérifier les pages statiques (OBLIGATOIRE)

Avant chaque release, vérifier et mettre à jour les pages statiques sur **une seule branche** `chore/pre-release-updates`. Deux vérifications :

#### 2a — Page Aide

Lancer l'agent `docs-coherence-guardian` :

> Vérifie que la page Aide (clé "Help" dans messages/fr.json et messages/en.json + page help/page.tsx) est à jour avec toutes les fonctionnalités implémentées depuis la dernière release. Si des features manquent, ajoute-les.

#### 2b — Stats page À propos

Mettre à jour les 4 chiffres hardcodés dans `src/app/[locale]/(routes)/(static)/about/page.tsx` (section "En chiffres") :

```bash
COMMITS=$(git rev-list --count HEAD)
PRS=$(gh pr list --state merged --limit 1000 --json number --jq length)
USECASES=$(find src/domain/usecases -name '*.ts' ! -name 'index.ts' ! -path '*__tests__*' | wc -l | tr -d ' ')
TESTS=$(pnpm test 2>&1 | grep 'Tests' | grep -o '[0-9]\+ passed' | grep -o '[0-9]\+')
```

Arrondir pour l'affichage :
- Commits : centaine inférieure + "+" (ex: 1694 → `"1 600+"`)
- PRs : dizaine inférieure + "+" (ex: 353 → `"350+"`)
- Usecases : valeur exacte
- Tests : dizaine inférieure + "+" (ex: 888 → `"880+"`)

#### Résultat

Si au moins une modification (page Aide ou stats) :
1. Créer la branche `chore/pre-release-updates`
2. Committer toutes les modifications ensemble
3. PR + merge sur main
4. Attendre que Release Please mette à jour sa PR
5. Puis continuer avec l'étape 3

Si tout est déjà à jour → continuer directement.

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

### Étape 5 — Attendre que "Humanize Changelog" ait fini

Avant de pousser le commit vide, s'assurer que le workflow "Humanize Changelog" n'est pas en cours sur la branche. S'il tourne encore, il pourrait pousser un commit après le CI, invalidant les checks.

```bash
gh run list --workflow="Humanize Changelog" --branch NOM_BRANCHE --limit 1 --json databaseId,status,conclusion
```

- Si `status == "in_progress"` ou `status == "queued"` → attendre la fin :

```bash
gh run watch RUN_ID_HUMANIZE
```

- Si `status == "completed"` ou aucun run trouvé → continuer.

Après la fin de Humanize, toujours récupérer le HEAD le plus récent :

```bash
git fetch origin NOM_BRANCHE
git checkout NOM_BRANCHE
git reset --hard origin/NOM_BRANCHE
```

### Étape 6 — Déclencher le CI via commit vide

Le `workflow_dispatch` ne satisfait pas les branch protection checks de GitHub — il faut un commit sur la branche pour déclencher le CI dans le contexte PR.

```bash
git commit --allow-empty -m "ci: trigger CI checks for release PR"
git push origin NOM_BRANCHE
```

> Le workflow "Humanize Changelog" sera re-déclenché par le push (event `synchronize`), mais il détectera que CHANGELOG.md n'a pas changé et sortira immédiatement sans pousser de commit. Aucune race condition possible.

Récupérer l'ID du run CI déclenché :

```bash
gh run list --workflow=CI --branch NOM_BRANCHE --limit 1 --json databaseId,status
```

Afficher le lien vers le run GitHub Actions.

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
6. Reprendre la procédure release à l'étape 5 (attendre Humanize + déclencher le CI)

## En cas de problème

| Symptôme | Cause | Fix |
|---|---|---|
| Aucune PR trouvée | Pas de feat/fix depuis la dernière release | Normal — pas de release à faire |
| Version calculée = 1.0.0 | Manifest key incorrecte | Vérifier `.release-please-manifest.json` → clé doit être `"."` |
| Humanize Changelog encore en cours | L'utilisateur a lancé /release juste après un merge sur main | Étape 5 attend automatiquement la fin via `gh run watch` |
| Merge échoue malgré CI vert | PR status checks non enregistrés | Utiliser `--admin` |
| `package.json` modifié localement | Stash auto à la checkout de la branche release | `git stash pop` après `git checkout main` |
| `--search "chore(main): release"` ne trouve pas la PR | Parenthèses dans la query GitHub Search | Utiliser `--head "release-please--branches--..."` |
| CI rouge sur la branche release | Test flaky ou régression non détectée sur main | **Fixer sur main d'abord**, pas sur la branche release |
