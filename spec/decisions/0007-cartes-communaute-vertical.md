# ADR 0007 — Cartes de Communauté en format vertical (grille)

- **Statut** : Accepté
- **Date** : 2026-06-27
- **Issue** : #597 (lié à #596 — sélecteur Participant/Organisateur, traité séparément, après)
- **Mockup de référence** : [`spec/mockups/circle-card-vertical.mockup.html`](../mockups/circle-card-vertical.mockup.html)

## Contexte

Les cartes de Communauté sont aujourd'hui **horizontales** partout (cover carrée à gauche, contenu à droite), un format quasi identique à celui des cartes **événement**. Conséquences : confusion visuelle Communauté ↔ événement, espace mal exploité, rendu peu différencié.

Un chantier passé avait fait l'inverse (vertical → horizontal). Avec le recul, cette décision était fondée sur **peu d'insights** et s'avère mauvaise. On revient au vertical, cette fois cadré et tracé.

Le **motif du précédent passage à l'horizontal** (cover 1:1 trop haute, cartes trop étroites **sur mobile**) est neutralisé ici par le **phasage** : la Phase 1 ne touche qu'au desktop/tablette ; le mobile garde le format horizontal actuel.

## Décision

### Format et phasage

- Cartes de Communauté en **format vertical** (cover 1:1 en haut, contenu dessous), affichées en **grille**, **uniquement à partir de `sm`** (desktop/tablette).
- **Mobile (`< sm`) : strictement inchangé visuellement** (format horizontal actuel). La refonte mobile est une **Phase 2** non tranchée.
- **Option A retenue** : un **seul composant** (`CommunityCard`) porte **deux branches de présentation** — horizontale `< sm` / verticale `≥ sm` — pilotées par breakpoint. Donnée single-source.
- **`CommunityCard` est un client component** (`"use client"`, `useTranslations`/`useLocale`). Raison : `PublicCircleCard` est déjà client car rendu dans `ExplorerGrid` (`"use client"`, pagination par `useState`) ; un module client ne peut pas rendre un Server Component. La variante `dashboard`, aujourd'hui **Server Component** (`async`, `getTranslations`), est donc **convertie en client** (option 1 retenue, cf. discussion). Impact assumé : les cartes dashboard passent en client (un peu de JS/hydratation en plus, négligeable au volume — données déjà chargées server et passées en props sérialisables).
- **Branche `< sm` — fidélité variable selon la variante** :
  - **variante `public`** : copie **octet pour octet** du JSX existant (déjà client) → rendu mobile **pixel-identique**.
  - **variante `dashboard`** : **conversion server→client à visuel identique** (`getTranslations`→`useTranslations`, `getLocale`→`useLocale`, retrait `async`/`Promise.all`) — le code n'est pas une copie littérale, mais les classes et le markup restent identiques. Vérif visuelle + `test:mobile` **renforcés sur le dashboard**.

### On change l'aspect, pas le contenu — #597 reste iso #596

On reprend **fidèlement** les champs déjà affichés par chaque carte ; le seul déplacement est l'encart « prochain événement », qui passe de la colonne droite (desktop) au corps de la carte.

- **Explorer (`PublicCircleCard`)** : cover (+ badge Démo) → catégorie → nom → description → ville → avatars + membres → badge rôle → prochain événement. *(Le compteur d'événements à venir n'apparaît plus dans le format vertical, cf. amendement ci-dessous.)*
- **Mon Espace (`DashboardCircleCard`)** : cover → catégorie → nom → description → ville → avatars + membres → badge « En attente » (si pending) → prochain événement. Pas de CTA ni de badge de rôle. *(La description est désormais affichée, par parité avec Explorer, cf. amendement.)*

**Aucun élément lié à #596** n'est introduit : pas de CTA Organisateur, pas de badge de rôle sur le dashboard. Le sélecteur Participant/Organisateur (#596) et les CTA orga viendront **après**.

### Surfaces et colonnes (validées au rendu)

| Surface | Conteneur | Grille (`≥ sm`) | Variante |
|---|---|---|---|
| Explorer · Communautés | `max-w-5xl` (1024px) | `sm:2` → `md:3` → `lg:4` colonnes | publique |
| Mon Espace · Mes Communautés | `max-w-2xl` (672px) | `sm:3` colonnes | dashboard |
| Page Réseau | (selon conteneur réseau) | `sm:2` colonnes, encart « prochain événement » masqué | publique |

Valeurs arrêtées **après itération visuelle** : Explorer monte jusqu'à **4 colonnes** en `lg` (cartes denses, annuaire), Mon Espace tient à **3 colonnes** dès `sm` (validé lisible à 672px).

### Composant unifié

Fusion de `PublicCircleCard` + `DashboardCircleCard` en un composant unique piloté par variantes (`public` / `dashboard`), nommé **`CommunityCard`** — `circle-card.tsx` existant (carte 72px du picker / dashboard perso, hors périmètre) **n'est pas touché**.

### Garde-fous anti-régression mobile (Option A)

Comme un seul composant rend désormais le mobile, le risque de régression mobile est réel. Précautions obligatoires :

- **Reprise par déplacement, pas par réécriture** : le markup horizontal `< sm` est copié tel quel depuis les composants actuels (mêmes classes, mêmes breakpoints internes `hidden sm:flex` / tailles cover, mêmes badges et conditions).
- **Vérification visuelle mobile avant/après** : comparer le rendu `< sm` des trois surfaces (Explorer, Mon Espace, Réseau) à l'actuel — il doit être identique.
- **Tests E2E mobile** (`pnpm test:mobile`) sur les surfaces touchées, en plus des E2E circles existants (`circle-tabs`, `join-circle-directly`).
- **Le vertical ne s'applique qu'à partir de `sm`** : aucune classe verticale ne doit fuiter sous `sm` (revue ciblée du diff sur les classes responsive).
- **Revue adverse du diff** centrée sur « qu'est-ce qui change sous `sm` ? » → la réponse attendue est « rien de visible ».

### Badge rôle (variante publique)

Le badge rôle (HOST/MEMBER) passe **en overlay sur la cover** (au lieu du corps), pour libérer le corps de la carte verticale.

### « À la une » — hors périmètre de cette PR

La section « À la une » d'Explorer (`ExplorerFeatured`) n'apporte rien aujourd'hui et sera **retirée à terme**, mais **pas dans cette PR**. Elle reste en place ; le toggle admin `featuredCirclesEnabled` (`SiteSettings`, `prisma/schema.prisma:421`) permet déjà de la **masquer** au besoin. Son retrait propre (composant + usecase `getFeaturedCircles`, éventuellement le champ schema) fera l'objet d'une **PR ultérieure dédiée**, pour ne pas mélanger un nettoyage Explorer avec la refonte des cartes.

### Chargement progressif

Le bouton **« Load More »** de l'onglet Communautés d'Explorer est remplacé par un **chargement progressif au défilement** (infinite scroll, IntersectionObserver). L'onglet Événements n'est **pas** concerné cette itération.

Le lot de chargement des Communautés passe à **12** (au lieu de 10, partagé avec les événements) : multiple de 2, 3 et 4, il garantit des **lignes entières** à chaque palier de la grille (`sm:2 / md:3 / lg:4`), jamais de ligne tronquée pendant le scroll. Les événements gardent un lot de 10 (liste à une colonne).

### Effet hover unifié (toutes les cartes)

Le highlight rose actuel est remplacé par une **élévation neutre** (`translateY(-2px)` + ombre renforcée), sur **toutes** les cartes (événement + Communauté) : `community-card` (nouveau), `public-moment-card`, `dashboard-moment-card`, `moment-card`.

**Les deux effets roses sont retirés** (pour coller au mockup, qui ne fait qu'élever la carte) : la bordure `hover:border-primary/30` **et** le titre `group-hover:text-primary` (le titre ne passe plus en rose au survol). `transition-colors` → transition sur transform/ombre.

## Amendements à l'implémentation (2026-06-28)

Écarts assumés par rapport à la décision initiale, tranchés par **itération visuelle** pendant l'implémentation :

- **Colonnes** : Explorer monte à **4** en `lg` (et non 3), Mon Espace tient à **3** en `sm` (et non 2). Cf. table ci-dessus, validée au rendu.
- **Description sur le dashboard** : la variante `dashboard` affiche désormais la **description** (comme Explorer), pour une parité visuelle complète entre les deux variantes verticales. La décision initiale l'excluait.
- **Compteur d'événements à venir retiré du vertical** : il alourdissait l'encart et faisait doublon avec le bloc « prochain événement ». Conservé uniquement dans la branche **mobile horizontale** (inchangée).
- **Encart « prochain événement » redessiné** : pastille grise (`bg-foreground/10`) + icône calendrier, label `PROCHAIN ÉVÉNEMENT`, titre puis date. Markup identique aux deux variantes (factorisé en sous-composant `NextMomentBlock`).
- **Factorisation** : le composant unifié extrait des sous-composants partagés (`VerticalCover`, `CoverBadgeOverlay`, `CityRowVertical`, `MemberStack`, `NextMomentBlock`) pour absorber la duplication entre variantes sans toucher au rendu.

## Alternatives écartées

- **Garder l'horizontal** : rejeté, la confusion avec les cartes événement persiste.
- **Vertical aussi sur mobile** : reporté en Phase 2. C'est exactement ce qui avait tué le 1er vertical (cartes trop hautes/étroites) ; on ne le réintroduit pas sans nouveaux insights.
- **Harmoniser « À la une » en vertical** : abandonné (la section sera retirée à terme, dans une PR ultérieure dédiée — pas dans cette PR).
- **Introduire les CTA Organisateur / le mode dans #597** : reporté à #596 (sinon les CTA n'ont pas de mode auquel se rattacher).
- **Nommer le nouveau composant `CircleCard`** : impossible, le nom est déjà pris par le picker.

## Conséquences

- **Différenciation visuelle nette** Communauté (verticale) vs événement (horizontale) sur desktop/tablette.
- **Deux branches de présentation** dans le composant (markup dupliqué masqué par breakpoint) : coût de maintenance assumé, à garder propre (donnée single-source).
- **Différenciation faible sur mobile** (les deux restent horizontaux) : assumé, secondaire dans un scroll de liste, sujet de la Phase 2.
- **Revirement tracé** : ne pas re-basculer une 3e fois sans nouveaux insights.
- Le **hover** touche aussi les cartes événement (au-delà du strict périmètre #597) : embarqué dans la même PR.
- Tests E2E circles (`circle-tabs`, `join-circle-directly`, …) ciblent texte/liens, pas le layout → risque de casse faible, à re-vérifier après refonte.
