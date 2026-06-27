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
- **La branche horizontale `< sm` reprend le markup existant à l'identique** : on **déplace/copie fidèlement** le JSX de `PublicCircleCard` / `DashboardCircleCard` (mêmes classes responsive, mêmes tailles de cover, mêmes conditions d'affichage), on ne le réécrit pas de mémoire. Le rendu mobile doit être **pixel-identique** à l'actuel.

### On change l'aspect, pas le contenu — #597 reste iso #596

On reprend **fidèlement** les champs déjà affichés par chaque carte ; le seul déplacement est l'encart « prochain événement », qui passe de la colonne droite (desktop) au corps de la carte.

- **Explorer (`PublicCircleCard`)** : cover (+ badge Démo) → catégorie → nom → description → ville → compteur d'événements à venir → avatars + membres → badge rôle → prochain événement.
- **Mon Espace (`DashboardCircleCard`)** : cover → catégorie → nom → ville → avatars + membres → badge « En attente » (si pending) → prochain événement. Pas de description, de compteur, de CTA ni de badge de rôle.

**Aucun élément lié à #596** n'est introduit : pas de CTA Organisateur, pas de badge de rôle sur le dashboard. Le sélecteur Participant/Organisateur (#596) et les CTA orga viendront **après**.

### Surfaces et colonnes (provisoires, à valider au rendu)

| Surface | Conteneur | Grille | Variante |
|---|---|---|---|
| Explorer · Communautés | `max-w-5xl` (1024px) | 3 colonnes (`lg`) | publique |
| Mon Espace · Mes Communautés | `max-w-2xl` (672px) | 2 colonnes | dashboard |
| Page Réseau | (selon conteneur réseau) | grille verticale, encart « prochain événement » masqué | publique |

Mon Espace passe à **2 colonnes** (pas 3) pour éviter des cartes trop étroites à 672px.

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

### « À la une » supprimée

La section « À la une » d'Explorer (`ExplorerFeatured`) est **retirée** : elle n'apporte rien aujourd'hui. On ne l'harmonise pas en vertical, on la supprime.

### Chargement progressif

Le bouton **« Load More »** de l'onglet Communautés d'Explorer est remplacé par un **chargement progressif au défilement** (infinite scroll, IntersectionObserver). L'onglet Événements n'est **pas** concerné cette itération.

### Effet hover unifié (toutes les cartes)

Le highlight rose actuel (`hover:border-primary/30` + `transition-colors`) est remplacé par une **élévation neutre** (`translateY(-2px)` + ombre renforcée), sur **toutes** les cartes (événement + Communauté) : `public-circle-card`, `dashboard-circle-card`, `public-moment-card`, `dashboard-moment-card`, `moment-card`.

## Alternatives écartées

- **Garder l'horizontal** : rejeté, la confusion avec les cartes événement persiste.
- **Vertical aussi sur mobile** : reporté en Phase 2. C'est exactement ce qui avait tué le 1er vertical (cartes trop hautes/étroites) ; on ne le réintroduit pas sans nouveaux insights.
- **Harmoniser « À la une » en vertical** : abandonné, on supprime la section.
- **Introduire les CTA Organisateur / le mode dans #597** : reporté à #596 (sinon les CTA n'ont pas de mode auquel se rattacher).
- **Nommer le nouveau composant `CircleCard`** : impossible, le nom est déjà pris par le picker.

## Conséquences

- **Différenciation visuelle nette** Communauté (verticale) vs événement (horizontale) sur desktop/tablette.
- **Deux branches de présentation** dans le composant (markup dupliqué masqué par breakpoint) : coût de maintenance assumé, à garder propre (donnée single-source).
- **Différenciation faible sur mobile** (les deux restent horizontaux) : assumé, secondaire dans un scroll de liste, sujet de la Phase 2.
- **Revirement tracé** : ne pas re-basculer une 3e fois sans nouveaux insights.
- Le **hover** touche aussi les cartes événement (au-delà du strict périmètre #597) : embarqué dans la même PR.
- Tests E2E circles (`circle-tabs`, `join-circle-directly`, …) ciblent texte/liens, pas le layout → risque de casse faible, à re-vérifier après refonte.
