# Refonte UI — release train `epic/refonte-ui`

> **Document de reprise du chantier.** Point d'entrée unique pour reprendre la refonte UI dans une nouvelle session : où est le code, ce qui est livré, le workflow de mise en prod, ce qui reste.
>
> Specs liées : [ADR 0007 — cartes Communauté vertical](../decisions/0007-cartes-communaute-vertical.md) · [circle-card-vertical](circle-card-vertical.md) · [journal des décisions](../decisions.md). Mémoire projet : `memory/project_release_train_refonte_ui.md`.

## Objectif

Refonte visuelle de l'UI (cartes Communauté, timelines d'événements, badges, covers), livrée par **plusieurs PR empilées** et mise en prod **en une seule fois** via une branche d'intégration.

## Release train

Décidé le **2026-06-29**. Branche d'intégration **`epic/refonte-ui`** (partie de `main`).

```
main
 └─ epic/refonte-ui              ← PR finale vers main = mise en prod groupée
     ├─ #598 community-card      ✅ mergée dans epic
     ├─ feat/ui-2                (à venir, base: epic)
     └─ …
```

**Workflow :**
1. Chaque feature UI → branche dédiée (worktree) **depuis `epic/refonte-ui`**, PR **ciblée sur `epic/refonte-ui`** (jamais `main`).
2. On **merge les sous-PR dans `epic` dès qu'elles sont validées** (CI vert + review) → build **preview**, **jamais la prod**.
3. **Mise en prod = un seul merge final `epic/refonte-ui → main`.**

**Piège CI résolu :** `ci.yml` n'écoutait que `pull_request: branches:[main]` → les PR ciblant epic ne lançaient aucun CI. On a ajouté `epic/refonte-ui` aux triggers `pull_request` **et** `push` de `ci.yml` **sur la branche epic** (pour `pull_request`, GitHub lit le workflow de la branche de base). Désormais chaque sous-PR et chaque merge dans epic lancent le CI automatiquement.

**Alternatives écartées :** stack séquentiel (chaque PR base sur la précédente — merge en cascade, rebase en chaîne fragile) ; PR indépendantes sur `main` mergées le même jour (elles se marchent dessus, le code partagé n'est pas sur `main`).

## À faire au merge final `epic → main` (mise en prod)

1. **Retirer le trigger `epic/refonte-ui`** de `ci.yml` (ajouté sur epic) pour garder `main` propre.
2. **`pnpm db:push:prod`** si une sous-PR a touché `prisma/schema.prisma` (vérifier `git diff main...epic/refonte-ui -- prisma/schema.prisma`). Les merges intermédiaires dans epic ne déclenchent **pas** la prod ; le schema doit être poussé **avant** le merge final.
3. Vérifier le CI vert sur le commit de merge, surveiller le build Vercel prod.

## Briques

| # | Brique | Statut |
|---|---|---|
| #598 | Cartes Communauté & événements en vertical/timeline (issue #597) | ✅ mergée dans `epic`, CI vert |
| — | Section « À la une » (`ExplorerFeatured`) : retrait | à planifier (PR dédiée, cf. ADR 0007) |
| — | #596 — sélecteur Participant/Organisateur + CTA orga | hors train (après #597) |

### #598 — périmètre réellement livré

Le chantier a **débordé** le périmètre initial de l'ADR 0007 (cartes Communauté) :

- **Cartes Communauté** verticales en grille (Explorer 4/3/2 col, Mon Espace, Réseau) — composant `CommunityCard` (cf. [circle-card-vertical](circle-card-vertical.md)).
- **Événements en timeline verticale** sur Explorer (`public-moment-card`), alignés sur Mon Espace (`dashboard-moment-card`) et la page Communauté (`moment-timeline-item`).
- **Primitives de cartes partagées** : `src/components/cards/card-primitives.tsx` — `TimelineScaffold`, `IconPill`, `CirclePill`, `StatusPill`, `CARD_HOVER`/`CARD_HOVER_GROUP`, et les helpers `REGISTRATION_PILL` (icône+couleur des pills de statut) et `momentDotClass` (couleur du dot de timeline). Pagination centralisée dans `src/lib/explorer-pagination.ts`.
- **Badges harmonisés** en pills + gestion de **`PENDING_APPROVAL`** (ambre) sur les 3 timelines et la carte Communauté (overlay).
- **Covers** : dégradé blanc/gris derrière les images, fond de carte unifié sur le token `--card`.
- **Nettoyage** : suppression de la page orpheline `/dashboard/moments/new` et des composants morts (`CircleCard`, `public-circle-card`, `dashboard-circle-card`).

### Décisions UI tranchées en cours de chantier

- **Hover conservé sur les cartes passées / annulées** (élévation `CARD_HOVER_GROUP`) : ce sont des cartes **cliquables**, donc l'effet est cohérent. (Le code-review l'avait signalé comme régression ; arbitrage = on garde.)
- **Mobile (`< sm`) strictement inchangé** : chaque carte a deux branches responsive (`sm:hidden` horizontal / `hidden sm:flex` vertical-timeline).

### Corrections issues des 2 `/code-review`

- 🔴 Dot « en attente de validation » resté rose sur la page Communauté (trompeur sur mobile où le badge est masqué) → corrigé via `momentDotClass` partagé (dot ambre).
- 🟡 Course de double-chargement de l'infinite scroll Explorer → garde synchrone `loadingRef`.
- 🟡 Observer non réarmé après auto-chargement : trade-off anti-cascade **assumé** (le bouton « Voir plus » sert de fallback).
- Régression de test E2E induite par la structure 2-branches (label présent en double dans le DOM) → sélecteur `filter({ visible: true })` (même classe de fix que `explore.spec.ts`).

## Reprendre dans une nouvelle session

1. `git fetch && git switch epic/refonte-ui && git pull` pour partir d'epic à jour.
2. Nouvelle feature UI → worktree depuis epic (`./scripts/worktree-new.sh feat/<slug>` puis re-baser sur epic si besoin), PR **base = `epic/refonte-ui`**.
3. Merger la sous-PR dans epic quand CI vert + review OK (preview, pas prod).
4. Quand tout le train est prêt : PR `epic/refonte-ui → main`, appliquer la checklist « À faire au merge final » ci-dessus.
