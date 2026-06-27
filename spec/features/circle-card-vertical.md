# Carte de Communauté en format vertical (grille)

> **Issue** : #597 · **ADR** : [`spec/decisions/0007-cartes-communaute-vertical.md`](../decisions/0007-cartes-communaute-vertical.md) · **Mockup** : [`spec/mockups/circle-card-vertical.mockup.html`](../mockups/circle-card-vertical.mockup.html)
>
> Cette spec décrit le **comment** (call-sites, composant, breakpoints, découpe, tests). Le **pourquoi** et les alternatives sont dans l'ADR.

## Objectif

Passer les cartes de Communauté du format **horizontal** au format **vertical en grille**, sur **desktop/tablette uniquement** (`≥ sm`), pour les différencier des cartes événement (qui restent horizontales). **On ne change que l'affichage, pas le contenu** : les champs restent ceux affichés aujourd'hui.

## Périmètre (Phase 1)

- ✅ Carte verticale `≥ sm` sur **Explorer**, **Mon Espace**, **Réseau**.
- ✅ Composant unifié **`CommunityCard`** (variantes `public` / `dashboard`).
- ✅ Badge rôle (variante publique) en **overlay** sur la cover.
- ✅ **Infinite scroll** sur l'onglet Communautés d'Explorer (remplace « Load More »).
- ✅ **Hover unifié** (élévation neutre) sur **toutes** les cartes (événement + Communauté).

### Hors périmètre

- ❌ **Mobile (`< sm`)** : visuellement inchangé (Phase 2 non tranchée).
- ❌ Tout ce qui relève de **#596** (sélecteur Participant/Organisateur, CTA Organisateur, badge de rôle sur le dashboard).
- ❌ **Section « À la une » (`ExplorerFeatured`)** : **non touchée dans cette PR**. Elle reste en place ; le toggle admin `featuredCirclesEnabled` (`SiteSettings`) permet de la masquer au besoin. Son retrait sera une **PR ultérieure dédiée**.
- ❌ Carte 72px du picker (`circle-card.tsx`) : non touchée.
- ❌ Infinite scroll sur l'onglet **Événements** d'Explorer (garde le « Load More »).

## Call-sites

| Surface | Fichier | Aujourd'hui | Cible |
|---|---|---|---|
| Explorer · Communautés | `src/components/explorer/explorer-grid.tsx` | liste 1 col de `PublicCircleCard` + bouton « Load More » | grille **3 col** (`lg`) de `CommunityCard` variant `public` + infinite scroll |
| Mon Espace · Communautés | `dashboard/(app)/(main)/_components/dashboard-content.tsx` | `flex flex-col gap-3` de `DashboardCircleCard` | grille **2 col** de `CommunityCard` variant `dashboard` |
| Réseau | `networks/[slug]/page.tsx` | `flex flex-col gap-2 sm:gap-3` de `PublicCircleCard hideNextMoment` | grille verticale de `CommunityCard` variant `public`, `hideNextMoment` |
| « À la une » | `src/components/explorer/explorer-featured.tsx` | grille 3 mini-cartes horizontales | **hors périmètre** (inchangé ; retrait en PR ultérieure) |

## Composant `CommunityCard`

Nouveau fichier : `src/components/circles/community-card.tsx`, **`"use client"`**. Remplace `PublicCircleCard` + `DashboardCircleCard` (les deux fichiers sont supprimés une fois tous les call-sites migrés).

> **Client component (option 1).** `PublicCircleCard` est déjà client (rendu dans `ExplorerGrid` `"use client"`, qui ne peut pas rendre un Server Component). La variante `dashboard`, aujourd'hui Server Component async (`getTranslations`/`getLocale`), est **convertie en client** (`useTranslations`/`useLocale`). `DashboardContent` (server) rendra donc un client component — données déjà chargées server et passées en props sérialisables. Cf. ADR §Garde-fous.

### API (props)

Union discriminée par `variant` (reprend les props réelles des deux cartes) :

```ts
type CommunityCardProps =
  | { variant: "public"; circle: PublicCircle; membershipRole?: CircleMemberRole | null; hideNextMoment?: boolean }
  | { variant: "dashboard"; circle: DashboardCircle };
```

- `PublicCircle` vient de `@/domain/ports/repositories/circle-repository` ; `DashboardCircle` de `@/domain/models/circle`.
- **Variante `public`** : `membershipRole` est un **scalaire résolu par l'appelant** (`ExplorerGrid` fait `circleMembershipMap[circle.id] ?? null`), pas une map. La page Réseau ne le passe pas (pas de roleBadge) et passe `hideNextMoment`.
- **Variante `dashboard`** : pas de `membershipRole` (badge « En attente » dérivé de `circle.membershipStatus`). **Préserver le href conditionnel** : `PENDING → /circles/[slug]`, sinon `/dashboard/circles/[slug]` (`dashboard-circle-card.tsx:33`).

> La donnée est **single-source** : un seul objet `circle` alimente les deux branches de présentation.

### Deux branches de présentation (Option A — ADR §Garde-fous)

```tsx
// branche mobile : markup horizontal existant
<div className="sm:hidden">{/* horizontal */}</div>

// branche desktop/tablette : NOUVEAU rendu vertical
<div className="hidden sm:block">{/* vertical en grille */}</div>
```

- Branche `< sm`, **variante `public`** : copie **octet pour octet** depuis `PublicCircleCard` (déjà client) → rendu mobile **pixel-identique**.
- Branche `< sm`, **variante `dashboard`** : **conversion server→client à visuel identique** (`getTranslations`→`useTranslations`, `getLocale`→`useLocale`, retrait `async`). Mêmes classes/markup, mais code transformé → vérif visuelle + `test:mobile` renforcés sur le dashboard.
- Branche `≥ sm` : le nouveau vertical.

### Contenu vertical par variante (fidèle à l'existant)

**`public`** (Explorer, Réseau) : cover 1:1 (overlay badge Démo si `isDemo`, overlay badge rôle si `membershipRole`) → catégorie (`CategoryBadge`) → nom → description → ville (`MapPin`) → compteur d'événements à venir (`Calendar`, si `> 0`) → `AttendeeAvatarStack` + « N membres » (si `> 0`) → encart « prochain événement » dans le corps (sauf si `hideNextMoment`).

**`dashboard`** (Mon Espace) : cover 1:1 → catégorie → nom → ville → `AttendeeAvatarStack` + « N membres » → badge « En attente » (si `membershipStatus === "PENDING"`) → encart « prochain événement » dans le corps. **Pas** de description, de compteur, de CTA ni de badge de rôle.

> Seul déplacement vs aujourd'hui : l'encart « prochain événement », qui passe de la colonne droite (desktop horizontal) au corps de la carte.

### Primitives réutilisées

`CoverBlock` (1:1), `getMomentGradient`, `CategoryBadge`, `AttendeeAvatarStack`. Aucune nouvelle primitive.

## Grilles et breakpoints

| Surface | Conteneur | `< sm` | `sm`/`md` | `lg+` |
|---|---|---|---|---|
| Explorer | `max-w-5xl` (1024px) | liste (mobile actuel) | 2 col | 3 col |
| Mon Espace | `max-w-2xl` (672px) | liste (mobile actuel) | 2 col | 2 col |
| Réseau | colonne `lg:flex-row` (étroite) | liste (mobile actuel) | 2 col | 2 col |

> Nombres de colonnes **provisoires** (ADR) : à valider sur rendu réel. Explorer passe à 3 col seulement en `lg` (en `sm`/`md` tablette, 2 col pour éviter des cartes trop étroites).

## Infinite scroll (Explorer · Communautés)

`ExplorerGrid` est **un seul composant instancié une fois par onglet** (`tab: "circles" | "moments"`, `page.tsx:165,180`) → `hasMore` est **par instance**, donc l'infinite scroll Communautés est naturellement isolé du bouton Événements.

- Le wrapper rendu est aujourd'hui un `flex flex-col` **commun aux deux onglets** (`explorer-grid.tsx:85`). **Conditionner par `props.tab`** :
  - `tab === "circles"` → **grille verticale** (`grid` responsive) de `CommunityCard` + **infinite scroll** (sentinel `IntersectionObserver` qui déclenche `handleLoadMore` quand visible et `hasMore`).
  - `tab === "moments"` → **liste** inchangée de `PublicMomentCard` + **bouton « Load More »** conservé.
- Réutiliser l'existant : `loadMoreCirclesAction` + état `circleItems`/`hasMore`.
- Garder un fallback accessible (bouton visible si JS/observer indisponible) — à confirmer à l'implé.

## Hover unifié (toutes les cartes)

Élévation neutre (`-translate-y-0.5` + ombre renforcée, équivalent du mockup) sur : `community-card.tsx` (nouveau), `public-moment-card.tsx`, `dashboard-moment-card.tsx`, `moment-card.tsx`.

**Retirer les deux effets roses** (le mockup ne fait qu'élever) :
- la bordure `hover:border-primary/30`,
- le titre `group-hover:text-primary` (le titre ne passe plus en rose au survol).

`transition-colors` → transition sur transform/ombre. Ne pas toucher aux `group-hover:text-primary` hors cartes (`moment-timeline-item`, `moment-detail-view`, `moment-form`).

## Plan de découpe (ordre de PR / commits)

1. **`CommunityCard`** : créer le composant (branche mobile = copie fidèle, branche desktop = vertical), variantes `public`/`dashboard`. Pas encore branché.
2. **Migrer les call-sites** un par un : Explorer → Mon Espace → Réseau. Supprimer `PublicCircleCard` / `DashboardCircleCard` une fois orphelins.
3. **Infinite scroll** Communautés (sentinel + observer, gated `tab === "circles"`).
4. **Hover unifié** sur les cartes événement.
5. **i18n** : les **deux variantes** consomment `Explorer.circleCard.*` (la carte dashboard utilise déjà `getTranslations("Explorer")`, pas `Dashboard.*`). Clés existantes (`members`, `moreMembers`, `upcomingMoments`, `noUpcomingMoments`, `nextMoment`, `roleBadge.*`, `demo`) — rien de neuf à créer.

## Tests

- **E2E circles** existants (`circle-tabs`, `join-circle-directly`, …) : re-vérifier (ciblent texte/liens, risque layout faible).
- **E2E mobile** (`pnpm test:mobile`) sur Explorer / Mon Espace / Réseau : le rendu `< sm` doit être identique à l'actuel.
- **Vérif visuelle avant/après** des 3 surfaces en `< sm` (garde-fou anti-régression mobile, ADR).
- Pas de test composant aujourd'hui : ajouter au besoin si la logique de variante se complexifie.

## Risques / vigilance

- **Régression mobile** (Option A) : neutralisée par la copie fidèle du markup + tests mobile + revue adverse du diff « qu'est-ce qui change sous `sm` ? » → rien de visible. Voir ADR §Garde-fous.
- **Conversion dashboard server→client** (option 1) : la carte dashboard quitte le rendu RSC pour du client. Vérifier (1) sérialisation des props (`nextMoment.startsAt` est une `Date`), (2) rendu/hydratation mobile identique à l'actuel via `test:mobile`, (3) pas de régression de perf notable (volume de cartes faible).
- **Cartes hautes** sur conteneur étroit (Mon Espace 672px) : 2 col, à valider au rendu.
- **Largeur Réseau** variable (`lg:flex-row`) : valider 2 col sur la colonne contenu.
- **Suppression de composants** (`PublicCircleCard`/`DashboardCircleCard`) : s'assurer qu'aucun autre call-site ne les référence avant suppression.
