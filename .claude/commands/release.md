---
packageVersion: 1.0.0
packageId: the-playground
---

# /release Command

Livre la branche courante en production, puis publie la nouvelle version via Release Please. Une seule commande, deux phases enchaînées.

| Invocation | Phase 1 (livrer la branche) | Phase 2 (publier la version) |
|---|---|---|
| `/release` depuis un worktree de chantier | ✅ | ✅ |
| `/release --sans-version` depuis un worktree de chantier | ✅ | ❌ — pour regrouper plusieurs branches dans une même version |
| `/release` depuis `main` (aucune branche de chantier) | ❌ | ✅ |

**Un seul arrêt dans tout le flux : la confirmation du merge de la branche (phase 1, étape 1.6).** C'est lui qui part en production. Tout le reste s'enchaîne sans redemander ; seuls les STOP documentés (CI rouge, gate de revue non satisfait) interrompent.

## Phase 1 — Livrer la branche courante

Modèle repris de la commande `release` de club-msl, sans sa numérotation manuelle : ici, c'est Release Please qui numérote (phase 2).

### Étape 1.1 — Situer la livraison

- Branche courante ≠ `main`, worktree propre (`git status --short` vide), sinon **STOP**.
- Diff de la branche : `git fetch origin main` puis **`git diff --stat origin/main...HEAD`**. **Toujours `origin/main`, jamais `main`** : la ref locale est presque toujours en retard et ferait remonter le travail d'autres PR comme s'il appartenait à la branche.
- Commits de la branche : `git log --oneline origin/main..HEAD`. Si aucun n'est de type `feat` ou `fix`, prévenir que la phase 2 ne produira pas de version.

### Étape 1.2 — Gate de revue (préalable, pas un arrêt du flux)

Une PR ne part jamais sans revue `/code-review` sur le bon périmètre (`origin/main...HEAD`), findings traités.

- Revue lancée et traitée **dans la session** sur cette branche → gate satisfait, continuer.
- Sinon → **STOP** avant tout push : « Aucune revue n'a tourné sur cette branche. Lance `/code-review`, puis relance `/release`. » Seul un « on saute la revue » explicite dispense.

### Étape 1.2b — Pages statiques, sur la branche du chantier

Sauf avec `--sans-version` : appliquer l'**étape 2 de la phase 2** (audit README + page Aide, chiffres de la page À propos et du README) **directement sur la branche du chantier**, et committer le résultat dessus (`docs(release): pages statiques à jour`). Pas de branche ni de PR séparée : la CI complète ne tourne ainsi qu'une fois, sur la PR du chantier, au lieu de deux PR et deux passages sur `main`.

Les chiffres se calculent sur la branche : ses commits et ses tests comptent déjà. **Exception, les PR** : `gh pr list --state merged` ne compte pas celle du chantier, pas encore mergée. Utiliser `PRS + 1`.

**Pas de revue sur ce commit, assumé** : il ne contient que du contenu (README, page Aide, chiffres de la page À propos), jamais de code, comme l'ancienne PR pré-release qui était mergée sans revue (« jamais de code-review en release »). S'il fallait toucher autre chose que ces fichiers, ce n'est plus l'étape 1.2b : STOP et le signaler.

### Étape 1.3 — Pousser et créer la PR

```bash
git push -u origin <branche>
gh pr view <branche> --json number,url 2>/dev/null || gh pr create --base main --title "<titre conventionnel>" --body "<corps>"
```

- Titre au format Conventional Commits (`feat(...)`, `fix(...)`, `chore(...)`) : Release Please s'en sert.
- Corps : résumé en langage produit, `closes #N` si la branche traite une issue du backlog, attribution Claude Code en fin.

### Étape 1.4 — Attendre la CI, entièrement

```bash
gh pr checks <n> --watch
```

**Tous** les checks doivent être verts, **e2e compris** : `typecheck` et `test-unit` sont les seuls requis par la protection de `main`, mais `test-e2e` compte autant. Un sous-ensemble vert ne suffit pas. CI rouge → **STOP** : corriger sur la branche, repousser, réattendre.

> Une branche qui ne touche que `spec/**` ou `**.md` ne déclenche pas la CI (`paths-ignore`) : aucun check à attendre.

### Étape 1.5 — Schéma Prisma, avant le merge

```bash
git diff origin/main...HEAD -- prisma/schema.prisma
```

- Non vide → `pnpm db:push` (dev) puis `pnpm db:push:prod` (prod) **avant** le merge : Vercel déploie dès le merge, et la nouvelle version interrogerait des colonnes absentes. Exception : un changement **destructif** (colonne ou table supprimée) se pousse **après** le déploiement.
- Vide → continuer.

### Étape 1.6 — Merger, sur confirmation explicite (SEUL ARRÊT DU FLUX)

Résumer en trois lignes (PR, checks verts, schéma) et demander : « Je merge la PR #N en prod ? ». Attendre un « oui » qui porte sur le merge lui-même.

```bash
gh pr merge <n> --merge
```

**Pas de `--delete-branch`** : lancé depuis un worktree, `gh` tente de basculer le dossier local sur `main`, déjà occupé par le répertoire principal. La branche se supprime au nettoyage (étape 1.7).

`--merge` (pas `--squash`) : Release Please lit les commits conventionnels de la branche pour composer la version et le changelog.

### Étape 1.7 — Vérifier que la livraison a atterri

- CI sur `main` après le merge : `gh run watch $(gh run list --branch main --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')`. Rouge → le dire, ne pas conclure au succès.
- Déploiement Vercel de production sur le SHA du merge : `READY` attendu. Si aucun build n'est parti, voir la mémoire « Merge sans build Vercel ».
- Nettoyer, une fois la phase 2 terminée (le worktree peut y servir) : `git worktree remove <chemin>`, `git branch -D <branche>`, `git push origin --delete <branche>`.

Avec `--sans-version` : rendre compte (PR mergée, déploiement prêt) et s'arrêter là.

### Transition vers la phase 2

Le merge déclenche le workflow « Release Please », qui crée ou met à jour sa PR, puis « Humanize Changelog » la réécrit. Attendre la fin de « Release Please » sur `main` (`gh run watch`) avant l'étape 1 de la phase 2 ; l'étape 5 attend déjà « Humanize Changelog ».

## Phase 2 — Publier la version (Release Please)

Procédure officielle Release Please. Elle numérote et publie tout ce qui est mergé sur `main` depuis la dernière version.

### Ce que fait cette phase

1. Vérifie que le CI sur main est vert (pré-requis)
2. Vérifie que la page Aide, la page À propos et le README sont à jour avec les features de la release
3. Trouve la PR Release Please en attente
4. Attend que "Humanize Changelog" ait fini (s'il tourne)
5. Attend la CI déclenchée automatiquement (jeton `RELEASE_PLEASE_TOKEN`) ; commit vide seulement en repli
6. Attend le CI vert
7. Vérifie le schema Prisma avant le merge
8. Merge la PR avec `--admin` (les CI checks ne s'enregistrent pas comme PR status checks sur ce repo)
9. Vérifie que le GitHub Release a été créé

### Exécution

Suis ces étapes dans l'ordre, sans jamais en sauter une. Aucun arrêt pour confirmation : l'invocation de `/release` vaut feu vert pour les merges de cette phase.

### Étape 1 — Pré-vérification : CI sur main

Avant toute chose, vérifier que le dernier CI sur main est vert :

```bash
gh run list --branch main --workflow CI --limit 1 --json conclusion --jq '.[0].conclusion'
```

Si `conclusion != "success"` → **STOP**. Le CI sur main doit être vert avant de lancer une release. Un test flaky sur main sera flaky sur la branche release aussi. Informer l'utilisateur et s'arrêter.

Vérifier aussi que **Release Please** a réussi sur le dernier commit de main :

```bash
gh run list --branch main --workflow "Release Please" --limit 1 --json headSha,conclusion
```

Si `conclusion != "success"` → **STOP**. Cause la plus probable : `RELEASE_PLEASE_TOKEN` expiré ou révoqué (un jeton vide ou expiré ne retombe pas sur `GITHUB_TOKEN`, le workflow échoue). Sans ce contrôle, l'étape 3 trouverait une PR de release périmée, sans les derniers merges, et le GitHub Release ne serait pas créé. Demander à Dragos de régénérer le jeton (GitHub → Settings → Developer settings → Fine-grained tokens, sur ce dépôt : Contents, Pull requests, Issues en lecture-écriture) et de l'enregistrer **depuis son propre terminal** : `gh secret set RELEASE_PLEASE_TOKEN --repo DragosDreptate/the-playground` (via `!` dans Claude Code, la saisie masquée ne fonctionne pas et le secret serait enregistré vide). Puis relancer le workflow Release Please.

### Étape 2 — Vérifier les pages statiques (OBLIGATOIRE)

**Déjà faite à l'étape 1.2b** quand la phase 1 vient de tourner sans `--sans-version` : passer directement à l'étape 3.

Sinon (`/release` lancé depuis `main`), vérifier et mettre à jour les pages statiques sur **une seule branche** `chore/pre-release-updates`. Deux vérifications :

#### 2a — Audit exhaustif README + page Aide

Lancer l'agent `docs-coherence-guardian` :

> Audit exhaustif du README.md à la racine et de la page Aide (clé "Help" dans messages/fr.json + messages/en.json + page help/page.tsx) contre l'état réel du codebase. Vérifie ET corrige les écarts dans les sections suivantes du README :
>
> 1. **Fonctionnalités** : doit refléter toutes les features livrées depuis la dernière release. Synchroniser avec la page Aide (même périmètre, formulation plus courte et orientée bénéfice côté README).
> 2. **Stack** : versions et outils mentionnés (Next.js, Auth.js, Tailwind, Prisma, Resend, Anthropic SDK, Stripe, etc.) doivent correspondre à `package.json`. Mettre à jour les versions majeures si elles ont évolué.
> 3. **Prérequis** : versions Node et pnpm doivent correspondre à `engines` et `packageManager` dans `package.json`.
> 4. **Architecture** : l'arbre `src/` documenté doit refléter la vraie structure (`ls src/`). Mettre à jour si des dossiers ont été ajoutés/renommés.
> 5. **Commandes courantes** : les scripts listés doivent exister dans `package.json`. Retirer les scripts supprimés, ajouter les nouveaux scripts marquants si pertinents pour un nouvel arrivant.
> 6. **Authentification en local** : la liste des providers OAuth doit correspondre à ce qui est configuré dans `src/infrastructure/auth/`.
> 7. **Tableau comparatif Meetup/Luma** : laisser tel quel sauf si un nouveau concurrent pertinent doit être ajouté.
> 8. **Liens internes** (changelog, about, explorer, etc.) : vérifier qu'ils pointent vers des routes qui existent toujours.
>
> Pour la page Aide : même périmètre fonctionnel que la section "Fonctionnalités" du README. Garder fr.json et en.json strictement synchronisés.
>
> Pour chaque écart trouvé : applique la correction directement dans le bon fichier. Si une formulation est ambiguë, signale-le mais corrige avec l'option la plus probable.

#### 2b — Stats (page À propos + README)

Calculer les chiffres une seule fois :

```bash
COMMITS=$(git rev-list --count HEAD)
PRS=$(gh pr list --state merged --limit 1000 --json number --jq length)
USECASES=$(find src/domain/usecases -name '*.ts' ! -name 'index.ts' ! -path '*__tests__*' | wc -l | tr -d ' ')
TESTS=$(pnpm test 2>&1 | grep 'Tests' | grep -o '[0-9]\+ passed' | grep -o '[0-9]\+')
```

**Mêmes chiffres, même arrondi, sur les deux surfaces** : page À propos (`src/app/[locale]/(routes)/(static)/about/page.tsx`, section "En chiffres") ET `README.md` (section "En chiffres") :
- Commits : centaine inférieure + "+" (ex: 1694 → `"1 600+"`)
- PRs : dizaine inférieure + "+" (ex: 353 → `"350+"`)
- Usecases : valeur exacte
- Tests : dizaine inférieure + "+" (ex: 888 → `"880+"`)

> Jusqu'à la 2.18.0, le README prenait des arrondis plus larges (millier, centaine) « pour rester stable entre releases ». Abandonné le 2026-10-08 : la release touche déjà le README à chaque fois, et l'écart visible entre les deux surfaces (2 000+ contre 2 600+ commits) sous-vendait le projet là où on le lit en premier.

#### Résultat

Si au moins une modification (page Aide, page À propos, README) :
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

Release Please pousse sa PR avec le jeton `RELEASE_PLEASE_TOKEN` (pas `GITHUB_TOKEN`) : ses événements déclenchent donc normalement « Humanize Changelog » puis la CI. Attendre que Humanize ait fini avant de regarder la CI : il pousse un commit qui la relance sur le head final.

> Conséquence assumée : à **chaque** merge de chantier, Release Please met sa PR à jour, ce qui relance Humanize (un appel Claude, quelques centimes) et une CI légère (typecheck + test-unit, ~1 min, e2e sauté). C'était le fonctionnement d'origine, avant le blocage du 18/09/2026.

```bash
gh run list --workflow="Humanize Changelog" --branch NOM_BRANCHE --limit 1 --json databaseId,status,conclusion
```

- Si `status == "in_progress"` ou `status == "queued"` → attendre la fin :

```bash
gh run watch RUN_ID_HUMANIZE
```

- Si `status == "completed"` ou aucun run trouvé → continuer.
- Si `conclusion == "action_required"` → le run attend une approbation et le changelog n'a **pas** été réécrit. Ne devrait plus arriver depuis le jeton dédié (cas rencontré du 18/09 au 08/10/2026, quand Release Please poussait avec `GITHUB_TOKEN` ; la politique d'approbation des contributeurs externes n'y était pour rien). Approuver le run (`gh api -X POST repos/DragosDreptate/the-playground/actions/runs/RUN_ID/approve`), attendre sa fin, et signaler l'anomalie à Dragos.
- Si `conclusion == "failure"` → lire le log : un échec au push signale un `RELEASE_PLEASE_TOKEN` expiré (voir l'étape 1).

Après la fin de Humanize, toujours récupérer le HEAD le plus récent :

```bash
git fetch origin NOM_BRANCHE
git checkout NOM_BRANCHE
git reset --hard origin/NOM_BRANCHE
```

### Étape 6 — Trouver le run CI du head de la PR

La CI tourne d'elle-même sur le head final (commit de Humanize, ou commit de Release Please si le changelog n'a pas changé). Sur la branche de release, `test-e2e` est **sauté par conception** (seuls la version et le changelog changent) : typecheck et test-unit suffisent.

```bash
HEAD_SHA=$(gh pr view NUMBER --json headRefOid --jq .headRefOid)
# Le run peut mettre quelques secondes à être enregistré : attendre jusqu'à 90 s avant de conclure qu'il manque
for i in $(seq 1 18); do
  RUN=$(gh run list --workflow=CI --commit "$HEAD_SHA" --limit 1 --json databaseId --jq '.[0].databaseId')
  [ -n "$RUN" ] && break
  sleep 5
done
echo "run CI : ${RUN:-aucun}"
```

**Repli seulement si aucun run CI n'existe pour ce head après cette attente** (jeton absent ou expiré) : le déclencher par un commit vide, le `workflow_dispatch` ne satisfaisant pas les checks de branche.

```bash
git commit --allow-empty -m "ci: trigger CI checks for release PR"
git push origin NOM_BRANCHE
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

### Étape 11 — Scrub + synchroniser le corps du GitHub Release (OBLIGATOIRE)

> ⚠️ **Le dépôt est PUBLIC. Le changelog ne doit JAMAIS divulguer l'outillage admin / modération / anti-abus.** Le détail de la règle (quoi exclure) est dans la mémoire `feedback_changelog_no_admin_disclosure.md`.

Deux surfaces, pas une :

1. **`CHANGELOG.md`** (humanisé par le workflow, rendu sur `/changelog`). Le script `scripts/humanize-changelog.ts` est censé déjà exclure l'anti-abus, mais **vérifier** la section de la nouvelle version :

```bash
sed -n "/## \[X.Y.Z\]/,/## \[/p" CHANGELOG.md | grep -iE "admin|blocage|bloqué|modération|anti-spam|audit|révoc|validation des commentaires|moins de 24" && echo "⚠️ fuite anti-abus dans CHANGELOG.md — nettoyer + commit direct sur main" || echo "✅ CHANGELOG.md propre"
```

2. **Corps du GitHub Release** : Release Please le génère en **commits BRUTS** (jamais humanisé) → il liste les commits `admin:` verbatim. **Toujours le remplacer** par la section humanisée et nettoyée du `CHANGELOG.md` :

```bash
# Extraire la section humanisée nettoyée et la pousser comme notes du release
sed -n "/## \[X.Y.Z\]/,/^## \[/p" CHANGELOG.md | sed '$d' > /tmp/release-notes.md
gh release edit the-playground-vX.Y.Z --notes-file /tmp/release-notes.md
# Vérifier qu'aucun terme sensible ne subsiste
gh release view the-playground-vX.Y.Z --json body --jq .body | grep -iqE "admin|blocage|modération|anti-spam|audit|révoc" && echo "⚠️ termes sensibles encore présents" || echo "✅ release body propre"
```

Si une fuite est détectée dans `CHANGELOG.md`, la corriger (édition manuelle de la section, commit direct sur main car `*.md`) **avant** de resynchroniser le corps du release.

## Règles absolues

- ❌ Ne jamais merger la branche du chantier (phase 1) sans le « oui » explicite de Dragos — c'est le seul arrêt du flux
- ❌ Ne jamais pousser la branche ni créer sa PR si aucune revue n'a tourné sur `origin/main...HEAD`
- ❌ Ne jamais merger la branche avec un check en cours ou rouge, e2e compris
- ❌ Ne jamais merger si le CI est rouge
- ❌ Ne jamais pousser du code (fix, refactoring) sur la branche release-please — seuls les commits vides `ci: trigger CI checks` sont autorisés
- ❌ Ne jamais sauter l'étape de vérification schema Prisma
- ❌ Ne jamais créer de tag git manuellement
- ❌ Ne jamais bumper la version dans `CHANGELOG.md` ou `package.json` manuellement (laisser Release Please) — scrubber la prose d'une section déjà publiée pour retirer une fuite anti-abus reste autorisé (étape 11)
- ❌ **Ne jamais divulguer l'outillage admin / modération / anti-abus dans le changelog public** (CHANGELOG.md ET corps du GitHub Release) — repo public, voir étape 11
- ❌ Ne jamais utiliser `gh workflow run` pour redéclencher le CI (ne génère pas de PR checks)
- ❌ Ne jamais chercher la PR par titre avec `--search` (les parenthèses cassent la recherche GitHub)
- ✅ Toujours chercher la PR par branche avec `--head "release-please--branches--main--components--the-playground"`
- ✅ Toujours vérifier que le CI sur main est vert AVANT de commencer
- ✅ Laisser la CI se déclencher seule sur la PR de release (jeton `RELEASE_PLEASE_TOKEN`) ; commit vide `git commit --allow-empty + git push` uniquement en repli si aucun run n'existe pour le head
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
