# Cartes en vue mobile — vertical & timeline (`< sm`)

> **ADR** : [0007 — cartes Communauté vertical](../decisions/0007-cartes-communaute-vertical.md) (cette spec en est la **Phase 2**, le volet mobile que l'ADR avait reporté) · **Mockup** : [`spec/mockups/circle-card-vertical-mobile.mockup.html`](../mockups/circle-card-vertical-mobile.mockup.html) · **Train** : [`refonte-ui-train.md`](refonte-ui-train.md)
>
> **Statut : SPEC EN COURS — non implémentée.** Directions de design figées via mockup, à valider avant code.
>
> Branche : `feat/mobile-coherence` (release train, base `epic/refonte-ui`).

## Objectif

Basculer la vue **mobile (`< sm`)** des cartes au format **vertical / timeline**, pour aligner le mobile sur le langage visuel desktop livré en #598. **Le desktop (`≥ sm`) reste strictement inchangé.**

## Contexte — le piège historique à éviter

L'ADR 0007 avait reporté le vertical mobile : c'est précisément ce qui avait tué la 1ʳᵉ tentative (**cartes trop hautes / trop étroites** : 1 carte ≈ tout l'écran, scroll interminable). L'insight de cette Phase 2 : **on ne refait pas du 1 colonne / cover 1:1 pleine largeur.** On neutralise le piège par :
- **Communautés** → grille **2 colonnes** + **body minimal** (densité : 4-6 cartes visibles).
- **Événements** → **timeline** compacte (déjà éprouvée sur Mon espace).

## Périmètre

### Inclus (cœur du chantier)
1. **Cartes Communauté** → grille **2 colonnes verticale, body minimal**, sur les 3 surfaces : Explorer · Communautés, Mon espace · Mes Communautés, page Réseau.
2. **Cartes Événement d'Explorer** → **timeline mobile** (comme Mon espace), en remplacement de la carte horizontale actuelle.

### Mineurs — retouches au cas par cas, après le cœur
À garder en tête, hors du périmètre principal (l'utilisateur les traitera ponctuellement) : badges mobiles en pills, dégradé/`--card` sur les covers mobiles, pastilles `IconPill` pour les métas, lisibilité du dot ambre `PENDING_APPROVAL`.

### Hors périmètre
- **Desktop (`≥ sm`)** : aucun changement (rendu #598 préservé au pixel).
- Cartes événement de **Mon espace** et de la **page Communauté** : pas de refonte de structure. **Seule retouche de cohérence** : le badge `todayShort` mobile (cf. Détails tranchés).
- **Section « À la une » (`ExplorerFeatured`)** : hors périmètre (mini-cartes à part), conformément à l'ADR 0007 (retrait différé à une PR dédiée). On ne l'harmonise **pas** en mobile.
- Tout ce qui relève de **#596** (sélecteur Participant/Organisateur, CTA Organisateur).

## Décisions de design (figées via le mockup)

### A. Cartes Communauté mobile — grille 2 col, body minimal
- **Grille 2 colonnes** pleine largeur.
- **Cover 1:1** + overlays sur la cover : badge **Démo**, badge **rôle** (Membre / Organisateur), badge **En attente** (dashboard, ambre).
- **Body** : catégorie → **nom** (2 lignes max) → 📍 **ville** → avatars + **N membres**.
- **Retiré sur mobile** (vs vertical desktop) : description, compteur d'événements à venir, encart « prochain événement ». *(arbitrage densité vs richesse, tranché : ville rajoutée, le reste sacrifié.)*

### B. Cartes Événement Explorer mobile — timeline
- Structure **timeline** : colonne date (jour + heure) → **dot** → ligne pointillée. Modèle de référence = `dashboard-moment-card` (structure responsive unique).
- Carte : pastille **Communauté** → **titre** → 📍 **lieu** → ligne sociale (**avatars + N inscrits + badge de statut**) → **cover ~64px** à droite.
- **Dot** : rose = à venir ; ambre = liste d'attente / en attente.
- **Badge de statut en icône seule** sur la ligne des inscrits (= `StatusPill` `hideLabelOnMobile` : ✓ inscrit, 🕓 liste d'attente), exactement comme aujourd'hui.
- **Lieu conservé** sur la timeline Explorer (utile en découverte) — **différence assumée** avec Mon espace mobile qui ne l'affiche pas.

### Détails tranchés
- **Badge « aujourd'hui » abrégé sur mobile** : « Aujourd'hui » **déborde** la colonne date ~72px et casse la vue. → **nouvelle clé i18n `Circle.detail.todayShort`** (FR « Auj. » / EN « Today »), affichée en **responsive** (`sm:hidden` court / `hidden sm:inline` « Aujourd'hui »). Le **desktop `≥ sm` garde « Aujourd'hui »** → aucune régression desktop. Appliqué sur **les 3 timelines** où le badge today apparaît en mobile : Explorer (`public-moment-card`), Mon espace (`dashboard-moment-card`), page Communauté (`moment-timeline-item`) — le débordement existe déjà sur les deux dernières, corrigé ici par cohérence.

## Call-sites — conteneurs de grille

| Surface | Fichier:ligne | Conteneur actuel | Cible |
|---|---|---|---|
| Explorer · Communautés | `explorer-grid.tsx:119` | `grid grid-cols-1 … sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` | `grid-cols-2` (mobile) puis `sm:2 / md:3 / lg:4` inchangés |
| Mon espace · Mes Communautés | `dashboard-content.tsx:194` | `grid grid-cols-1 … sm:grid-cols-3` | `grid-cols-2 … sm:grid-cols-3` |
| Page Réseau | `networks/[slug]/page.tsx:256` | `grid grid-cols-1 … sm:grid-cols-2` | `grid-cols-2 … sm:grid-cols-2` |
| Explorer · Événements | `explorer-grid.tsx:130` | `flex flex-col gap-2 sm:gap-0` | `flex flex-col` (gap-0 partout → ligne de timeline continue dès mobile) |

> Seul l'écart `gap` mobile change pour les événements : la timeline a besoin d'un `gap-0` pour que la ligne verticale soit continue (aujourd'hui `gap-2` en mobile car cartes détachées).

## Composants impactés — approche

### `community-card.tsx` (variantes public + dashboard)
Aujourd'hui **2 branches** : mobile **horizontale** (`sm:hidden`, image à gauche + texte) / desktop **verticale** (`hidden sm:flex`, body complet).

**Approche recommandée — garder 2 branches, réécrire la seule branche mobile** : la branche `sm:hidden` passe d'horizontale à **verticale 2 col body minimal** ; la branche desktop `hidden sm:flex` n'est **pas touchée** (garantit le `≥ sm` intact). Le body minimal mobile diffère trop du body complet desktop pour unifier proprement → le coût d'une structure responsive unique (et son risque desktop) n'en vaut pas la peine ici.

### `public-moment-card.tsx`
Aujourd'hui **2 branches** : mobile **horizontale** (`sm:hidden`) / desktop **timeline** (`hidden sm:flex`, `TimelineScaffold`).

**Approche retenue (validée le 2026-06-29) — unifier en structure timeline responsive unique**, sur le modèle de `dashboard-moment-card` (une seule structure, responsive interne via `sm:` sur les enfants). On **supprime la branche mobile horizontale** ; la branche desktop timeline devient responsive (colonne date 72px mobile / 100px `sm`, heure dans la colonne en mobile, cover réduite en mobile). Raison : les deux sont déjà des timelines → dupliquer deux markups timeline serait coûteux, alors que `dashboard-moment-card` prouve qu'une structure unique suffit. **Garde-fou** : le rendu `≥ sm` doit rester identique au #598 (revue adverse ciblée, vérif visuelle desktop avant/après). **Lieu mobile** : la branche mobile actuelle affiche déjà le lieu — le **conserver visible en mobile** (ne pas copier `dashboard-moment-card`, qui masque ses pastilles heure/lieu en mobile via `hidden sm:flex`).

> **Asymétrie assumée** : `community-card` reste en **2 branches** (desktop intact, on ne réécrit que le mobile — le body minimal mobile diffère trop du body complet desktop pour unifier proprement) ; `public-moment-card` **s'unifie** en 1 structure (les deux sont déjà des timelines → unifier élimine la duplication). Le coût : l'unification touche le code du desktop, d'où le garde-fou visuel desktop.

## Garde-fou — le desktop ne bouge pas

Tout le changement vit sous `< sm`. **Revue adverse obligatoire** sur chaque diff : « qu'est-ce qui change à `≥ sm` ? » → réponse attendue **« rien de visible »**. Vérif visuelle desktop avant/après sur les 4 surfaces.

## Réutilisation des primitives

Aucune nouvelle primitive globale a priori. On réutilise `card-primitives.tsx` : `TimelineScaffold`, `IconPill`, `CirclePill`, `StatusPill` (`hideLabelOnMobile`), `REGISTRATION_PILL`, `momentDotClass`, `CARD_HOVER` ; plus `AttendeeAvatarStack`, `CategoryBadge`, `DemoBadge`, `getMomentGradient`, `COVER_IMAGE_BG`.

## Tests

- **E2E mobile** (`pnpm test:mobile`) sur Explorer (Communautés + Événements), Mon espace, Réseau — le rendu mobile change, mais les parcours (clic carte → page) doivent tenir.
- **Sélecteurs E2E — deux sorts distincts** :
  - `explore.spec.ts:71` (ancres `/m/`, = `public-moment-card`) : l'unification supprime le doublon mobile/desktop → 1 seule ancre. Le test **passe toujours**, le `:visible` devient inoffensif, et **le commentaire l.69-70 « deux branches » est à corriger** (devient faux).
  - `approval-registration.spec.ts` (badge « En attente » de **`community-card`**, qui **reste en 2 branches**) : le doublon de label persiste → le `filter({ visible: true })` **reste nécessaire, ne pas le retirer**.
- **Baselines visuelles** : régénérer (le mobile change) ; le desktop doit rester **0 diff**.
- **Vérif visuelle desktop `≥ sm`** : garde-fou anti-régression (cf. ci-dessus).

## Risques / vigilance

- **Régression desktop** via l'unification de `public-moment-card` (2 branches → 1 structure) : vérif visuelle desktop avant/après, revue adverse du diff `sm:`.
- **Cartes trop hautes** (le piège historique) : neutralisé par 2 col + body minimal + timeline, **à valider au rendu réel mobile** (pas qu'au mockup).
- **Densité vs richesse** du body minimal : déjà débattu (ville rajoutée) ; rejuger sur device réel.
- **Incohérence assumée** : lieu affiché sur la timeline Explorer mais pas Mon espace.
- `pnpm test:mobile:setup` exige un login manuel (connu) → couverture mobile partielle.

## Plan de découpe (commits / ordre)

0. **i18n** : nouvelle clé `Circle.detail.todayShort` (FR « Auj. » / EN « Today ») dans `messages/fr.json` + `messages/en.json` ; badge today responsive (court mobile / long `sm`) sur les 3 timelines (`public-moment-card`, `dashboard-moment-card`, `moment-timeline-item`).
1. **Grilles 2 col** : les 3 conteneurs Communauté + le `gap` des événements Explorer.
2. **`community-card`** : réécrire la branche mobile en vertical 2 col body minimal (variante public, puis dashboard). Desktop intact.
3. **`public-moment-card`** : unifier en timeline responsive (supprimer la branche mobile horizontale). Desktop intact.
4. **Tests** : E2E mobile, baselines, garde-fou desktop.
5. **Mineurs** (badges pills, covers, pastilles, dot ambre) : retouches **cas par cas** après le cœur.
