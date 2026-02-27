# Git Workflow — The Playground

## Les 5 concepts essentiels

| Concept | Ce que ça fait | Où ça existe |
| --- | --- | --- |
| **Branche** | Espace de travail isolé, sans toucher `main` | Local + GitHub |
| **Commit** | Prend un snapshot des modifications | Local (ton ordi uniquement) |
| **Push** | Envoie les commits de la branche courante sur GitHub | GitHub (visible par tous) |
| **PR** | Propose la fusion avec validation | GitHub + preview Vercel auto |
| **Merge** | Valide et fusionne dans `main` | `main` → déploiement prod auto |

---

## Le flux complet

```
┌─────────────────────────────────────────────────────────────────┐
│                        TON ORDINATEUR                           │
│                                                                 │
│   main ──────────────────────────────────────────────────────▶  │
│              │                                                  │
│              └── nouvelle branche  feat/ma-feature             │
│                       │                                        │
│                    [édition du code]                           │
│                       │                                        │
│                    commit  ← snapshot local                    │
│                    commit  ← snapshot local                    │
│                    commit  ← snapshot local                    │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                          push
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                          GITHUB                                 │
│                                                                 │
│   feat/ma-feature  ──────────────────────────────────────────▶  │
│                                                                 │
│   Pull Request ouverte                                          │
│     ├── CI lance les tests (typecheck + test-unit)  ~30s       │
│     ├── Vercel crée une preview  → URL de test                 │
│     └── ✅ tout est vert → prêt à merger                       │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                          merge
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN → PRODUCTION                            │
│                                                                 │
│   main  ◀──── feat/ma-feature fusionnée                        │
│     │                                                           │
│     └── Vercel déploie automatiquement en prod                 │
│              └── the-playground.fr  ✅                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Les étapes dans notre processus

```
1. Tu demandes un changement
         │
         ▼
2. Claude code + commit(s)
         │
         │   ← s'arrête ici jusqu'à "crée la PR"
         ▼
3. Push + PR créée
         │
         │   CI vert ✅  +  preview Vercel disponible
         │
         │   ← s'arrête ici jusqu'à "merge"
         ▼
4. Merge → déploiement prod automatique
```

---

## Pourquoi cette discipline ?

```
main = production = the-playground.fr

On ne touche JAMAIS main directement.
Chaque changement passe par une branche isolée
pour tester (CI + preview) avant d'aller en prod.
```

---

## La branche — concept clé

Une branche = une copie isolée du code où on peut travailler sans risque.

```
main  ●──────────────────────────────────────────▶  (production)
       \
        ●── feat/user-settings                       (branche isolée)
             commit
             commit
             commit
               │
             push + PR + CI vert
               │
main  ●────────●──────────────────────────────────▶  (merge → prod)
```

**Un push envoie uniquement les commits de la branche courante.**
Pas les autres branches, pas les autres instances Claude.

---

## Une feature = une branche

**✅ Workflow propre — une feature à la fois :**
```
feat/feature-A  →  merge  →  feat/feature-B  →  merge
```

**⚠️ À éviter — deux features sur la même branche :**
```
feat/feature-A+B  →  une PR avec tout mélangé
```

Si tu veux deux features séparées dans la même conversation :
> dis-le explicitement — Claude crée une branche par feature.

---

## Nommage des branches

| Préfixe | Usage | Exemple |
| --- | --- | --- |
| `feat/` | Nouvelle fonctionnalité | `feat/user-settings` |
| `fix/` | Correction de bug | `fix/google-maps-csp` |
| `chore/` | Tâche technique / maintenance | `chore/update-backlog` |
