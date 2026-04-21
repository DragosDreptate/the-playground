# Refonte UI/UX — Communauté & événement

> Chantier long-lived démarré le 2026-04-19. Branche `feat/ui-refonte-circle-moment`. Aucun merge en production avant validation complète.

## Objectif

Refondre en profondeur l'UX/UI des pages Communauté et événement (vues publique et dashboard) par itération incrémentale, en gardant une cohérence parfaite entre les surfaces partageant des éléments UI communs.

## Périmètre — 4 surfaces × 2 breakpoints

| Page | Vue publique | Vue dashboard (Organisateur) |
|---|---|---|
| Communauté | `/c/[slug]` + `/circles/[slug]` | `dashboard/circles/[slug]` |
| événement | `/m/[slug]` | `dashboard/circles/[slug]/moments/[momentSlug]` |

Chaque surface a son rendu **mobile** et **desktop**, maintenus en cohérence.

## Protocole de travail (résumé)

À chaque modification UI demandée :

1. Appliquer la modif sur la cible demandée
2. Identifier les autres surfaces concernées parmi les 8 rendus
3. Signaler et demander confirmation avant toute propagation
4. Propager uniquement ce qui est validé

**Zéro généralisation silencieuse.** Mobile + desktop traités ensemble.

Détail complet : voir `memory/project_refonte_ui_circle_moment.md` dans la mémoire Claude.

## Éléments partagés à surveiller (cross-view alert)

| Élément | Surfaces concernées |
|---|---|
| Bloc Organisateur | Communauté publique, événement publique, cards dashboard |
| Bloc Membres / avatars | Communauté publique, inscrits événement publique |
| Cover image (1:1) | Communauté publique + dashboard, événement publique + dashboard |
| Prochains événements | Communauté publique, dashboard Communauté |
| CTA principal | S'inscrire, Créer événement, Modifier (toutes surfaces) |
| Meta info (date, lieu, capacité) | événement publique + dashboard |
| Hiérarchie hero (titre, sous-titre, badge) | Toutes les surfaces |
| Fil de commentaires | événement publique + dashboard |

## Baseline — état avant refonte

### Audit code réalisé le 2026-04-19

#### Fichiers de page

| Surface | Fichier | Composant principal |
|---|---|---|
| Communauté publique | `src/app/[locale]/(routes)/circles/[slug]/page.tsx` (638 lignes) | Page elle-même (server component, rendu inline) |
| Communauté dashboard | `src/app/[locale]/(routes)/dashboard/(app)/(main)/circles/[slug]/page.tsx` (559 lignes) | Page elle-même (server component, rendu inline) |
| événement publique | `src/app/[locale]/(routes)/m/[slug]/page.tsx` (290 lignes) | `MomentDetailView` (`variant="public"`) |
| événement dashboard | `src/app/[locale]/(routes)/dashboard/(app)/(main)/circles/[slug]/moments/[momentSlug]/page.tsx` (169 lignes) | `MomentDetailView` (`variant="host"`) |

#### Layout global

Les 4 surfaces partagent le même pattern **2 colonnes sticky** desktop :

- **Colonne gauche** `lg:w-[340px]` sticky top : cover 1:1 + glow blur + bloc Organisateurs + stats / infos
- **Colonne droite** flex-1 : breadcrumb, "Organisé par", H1, description, meta, contenu principal
- **Mobile** : 1 colonne, réordonnancement via `order-1/order-2`

#### Sections par surface

**Communauté publique** (`/circles/[slug]`) :
1. LEFT : cover + attribution Unsplash, bloc Organisateurs (avatars dégradés + noms), stats (Membres / événements), badges statut (Organisateur / Membre / En attente), CTAs (S'inscrire / Se connecter / Quitter)
2. RIGHT : breadcrumb (Découvrir > Nom), "Organisé par" + CTA Gérer, H1, CollapsibleDescription, separator, meta (7 items : catégorie, ville, site web, visibilité, membres, créé le, réseaux), CircleMomentTabs (Upcoming/Past), CircleMembersList (variant `member-view`)

**Communauté dashboard** :
- Structure identique publique, avec en plus : section "Partager & Inviter" (CircleShareInviteCard), bouton "Créer un événement" dans le tab Upcoming, PendingMembershipsList si `requiresApproval`, CircleMembersList (variant `host` avec emails et actions promouvoir/retirer), bouton Quitter visible participants seulement

**événement publique** (`/m/[slug]`, rendu via `MomentDetailView`) :
1. LEFT (lg+ only) : MomentCoverBlock (cover + status overlay grisée si PAST), CircleInfoBlock (carré couleur/image + nom Communauté, cliquable)
2. RIGHT : "Organisé par", H1, status banners (DRAFT / PAST), cover mobile dupliquée (lg:hidden), CollapsibleDescription, "Quand & Où" (date, lieu/lien, Google Maps iframe), CTA inscription, MomentAttachmentsList, RegistrationsList (social proof avatars), CommentThread

**événement dashboard** (même composant `MomentDetailView` `variant="host"`) :
- Structure identique, avec en plus : breadcrumb (Dashboard > Circle > événement), actions Publier/Modifier/Supprimer, MomentShareCard (lien partageable + ajout calendrier + Inviter ma Communauté), PendingRegistrationsList + RegistrationsList avec paiements, Payment Summary si `price > 0`
- Rendu adaptatif : non-host + ACTIVE member → `variant="public"` (vue member) ; host → `variant="host"`

#### Composants partagés détectés

| Composant / pattern | Communauté pub | Communauté dash | événement pub | événement dash |
|---|---|---|---|---|
| Cover 1:1 + glow | oui (inline) | oui (inline) | via MomentCoverBlock | via MomentCoverBlock |
| Bloc Organisateurs (avatars + noms) | oui (inline) | oui (inline) | oui (inline) | oui (inline) |
| CollapsibleDescription | oui | oui | oui | oui |
| Meta rows (7 items) | oui | oui | non (structure différente) | non (structure différente) |
| CircleMomentTabs | oui | oui | — | — |
| MomentTimelineItem | oui (variant public) | oui | — | — |
| CircleMembersList | oui (member-view) | oui (host/player) | — | — |
| MomentDetailView | — | — | oui (public) | oui (host) |
| RegistrationsList | — | — | oui | oui |
| CommentThread | — | — | oui | oui |
| Share block | — | CircleShareInviteCard | — | MomentShareCard |

#### Points forts du design actuel

- **MomentDetailView** factorise correctement la vue événement avec un prop `variant` (évite 2 pages dupliquées)
- Layout 2 colonnes sticky **cohérent** sur les 4 surfaces
- Responsive fluide via `order-*` sans code dupliqué majeur
- Composants bien découpés : `CollapsibleDescription`, `AttendeeAvatarStack`, `MomentTimelineItem`
- Règle cover 1:1 appliquée partout

#### Faiblesses / dettes visuelles identifiées

1. **Cover + glow dupliqué 4 fois** (inline dans chaque page) → candidat à un composant `CoverCard` unique
2. **Bloc Organisateurs dupliqué 4 fois** (rendu "Organisé par" ou avatars + noms) → pas de composant commun, 4 implémentations légèrement divergentes
3. **Meta incohérente entre Communauté et événement** : sur Communauté = 7 items `<MetaRow>` uniformes avec icône + label + value ; sur événement = blocs spécifiques (Date, Lieu, Google Maps) sans pattern unifié
4. **CircleShareInviteCard vs MomentShareCard** : 2 composants proches (lien partageable + actions) mais non unifiés
5. **Pages Communauté très longues** (559 et 638 lignes) : beaucoup de JSX inline qui pourrait être extrait en sous-composants
6. **Styles hardcodés répétés** : breadcrumb, badges, boutons réimplémentés au lieu d'utiliser des wrappers

#### Pistes de refonte candidates (à valider)

- Extraire composants atomiques partagés : `CoverCard`, `HostsBlock`, `MetaRow`, `ShareSection`
- Factoriser les pages Communauté (publique + dashboard) comme `MomentDetailView` l'a fait pour événement : un seul composant `CircleDetailView` avec `variant="public" | "host"`
- Unifier la structure meta entre Communauté et événement (même `MetaRow` partout)
- Layout wrapper générique `DetailLayout` (2 colonnes sticky) partagé par Communauté et événement

### Captures visuelles

À produire en parallèle (Playwright ou manuel) :

- [ ] Captures `/circles/[slug]` desktop + mobile
- [ ] Captures `dashboard/circles/[slug]` desktop + mobile
- [ ] Captures `/m/[slug]` desktop + mobile
- [ ] Captures `dashboard/circles/[slug]/moments/[momentSlug]` desktop + mobile

## Journal d'itérations

> Chaque ligne : date, surface ciblée, description, décision de propagation, commit.

### 2026-04-19

- Création du worktree `feat/ui-refonte-circle-moment` et du fichier de suivi.
- Audit code des 4 surfaces : chemins, composants, sections, responsive, composants partagés, forces, dettes. Voir section **Baseline**.
- Décision approche : compromis entre petites touches et refactor préparatoire. Phase 0 légère pour les atomes stables, puis Phase 1 (petites touches), Phase 2 (refactor final).
- Setup visual regression baseline : spec Playwright `refonte-visual-baseline.spec.ts`, 20 snapshots (4 surfaces × 2-3 états auth × 2 viewports), skip CI, snapshots gitignorés.
- Phase 0 exécutée :
  - **CoverBlock extrait** (commit `82ab257`) : composant `src/components/circles/cover-block.tsx`, remplace 2 usages inline, 20/20 snapshots matchent la baseline.
  - **HostsBlock skipped** : patterns visuels différents entre Circle (bloc avatars + noms labellé) et Moment (texte inline "Organisé par X"). Unifier aurait été un changement design, violant la règle Phase 0.
  - **CircleDetailView skipped** : analyse détaillée a révélé ~900 lignes, 15+ props, 7 namespaces i18n, différences profondes de fetch / tracking / SEO / guards. Ratio risque/gain jugé défavorable pour un refactor "zéro visual change". On gardera les 2 pages Circle distinctes.
- Phase 0 terminée. Prochaine étape : Phase 1 (petites touches avec cross-view alert).

## Décisions design prises

### 2026-04-19 — Approche : petites touches, refactor à la fin

Stratégie validée :

1. **Phase 1 — itération design** : modifications par petites touches sur les 4 surfaces, sans se préoccuper de la duplication de code. On duplique volontairement si besoin, on applique le cross-view alert à chaque modif, on laisse le design se stabiliser.
2. **Phase 2 — refactor / extraction** : une fois le design stabilisé (validation utilisateur), on extrait les composants partagés (CoverCard, HostsBlock, MetaRow unifié, ShareSection, potentiellement CircleDetailView à la manière de MomentDetailView). Zéro changement visuel pendant cette phase.

Rationale : le design n'est pas encore figé. Factoriser trop tôt risque de nous enfermer dans des composants qui ne survivront pas aux itérations. On garde la liberté visuelle d'abord, la propreté de code après.

## Questions ouvertes

> À compléter au fil des itérations.

## État au 2026-04-21 — après session Phase 1 (Circle)

### Ce qui a été fait (par commit)

Sur la branche `feat/ui-refonte-circle-moment` (du plus ancien au plus récent) :

- `82ab257` Phase 0 — extraction `CoverBlock` (composant partagé Circle publique + dashboard)
- `806037f` — Refonte du bloc Organisateurs sous la cover : avatar réel (UserAvatar) + nom horizontal, inclusion des CO_HOSTs triés alpha après HOST, séparateur `border-t`
- `b73fad6` — Composants auxiliaires : `DeleteCircleDialog` gagne `triggerClassName`, `CircleShareInviteCard` cadre retiré + titre en label uppercase
- `76e4510` — Grosse refonte visuelle des pages Circle + modale membres avec infinite scroll (voir détail ci-dessous)
- `4c3302c` — Corrections hydration : `<div role="button">` au lieu de `<button>` pour DialogTrigger, tooltip CSS pur pour les avatars, `DialogDescription` sr-only pour a11y
- `8d2f70e` — Finitions modale : header icône + titre sur même ligne, badge Organisateur réduit à l'icône Crown (24px) avec tooltip CSS, liens sociaux par ligne (website, LinkedIn, Twitter/X, GitHub), avatar + nom cliquables ensemble vers profil public

### Patterns visuels stabilisés (ne devraient plus bouger)

- **Layout 2 colonnes** : left column sticky (`lg:top-20` = 80px pour passer sous SiteHeader h-14), right column flex-1
- **Pill catégorie** outline en tête de colonne droite (taille `px-3 py-1 text-sm`, icône Tag `size-4`)
- **À propos** : barre rose à gauche du texte de description (`border-l-2 border-primary pl-4`), titre `À PROPOS` normal
- **Meta section** : container icône `size-11` bg `bg-primary/10`, icône `size-5` `text-primary`, label en `text-xs font-semibold uppercase tracking-wider`
- **Ordre meta** : MEMBRES (avatars + texte) → LIEU → SITE WEB → VISIBILITÉ → CRÉÉ LE → RÉSEAUX. Plus de "Thématique" et "Membres" séparés (pill en tête + avatars dans MEMBRES)
- **Bloc ORGANISATEURS** (colonne gauche) : label uppercase "ORGANISÉ PAR", avatars UserAvatar `size-sm` + noms horizontaux, 1 par ligne, HOST puis CO_HOSTs alpha. Avatar + nom cliquables ensemble vers profil si `publicId`
- **Bloc Stats** (colonne gauche) : "X Membres · Y Événements", le chiffre membres ouvre la modale (button avec `cursor-pointer hover:underline`)
- **Bouton "Gérer cette communauté"** (publique, vu par Organisateur) : variant default, full-width, `size="sm"` dans la colonne gauche à la place du badge "Vous êtes organisateur"
- **Modifier + Supprimer** (dashboard) : même ligne dans la colonne gauche, chacun en `flex-1`. Badge rôle retiré du breadcrumb
- **Ordre colonne droite dashboard** : pill catégorie → titre → À propos → séparateur → meta → [Demandes en attente si requiresApproval] → Partager & Inviter → séparateur → timeline événements

### Architecture introduite pour la modale des membres

- **Port** `CircleRepository.findMembersPaginated(circleId, { offset, limit, priorityUserId })` → `{ members, total, hasMore }`
- **Adapter Prisma** via `$queryRaw` : `ORDER BY CASE WHEN userId = priority THEN 0 ELSE 1, CASE role WHEN 'HOST' THEN 0 WHEN 'CO_HOST' THEN 1 ELSE 2, joinedAt ASC`. Inclut les 4 liens sociaux (`website`, `linkedin_url`, `twitter_url`, `github_url`)
- **Usecase** `getCircleMembersPage` avec guard (auth + (PUBLIC ou membre ACTIF))
- **Server action** `getCircleMembersPageAction` wrap le usecase
- **Composant** `CircleMembersDialog` (client) : Dialog shadcn + IntersectionObserver (sentinel avec `rootMargin: 120px`), PAGE_SIZE=20. Inclut actions de gestion (promouvoir/rétrograder/retirer) pour Organisateur avec menu "..." toujours présent (disabled si pas d'actions)
- **Trigger** : le `DialogTrigger asChild` wrappe un `<div role="button" tabIndex={0}>` (PAS un `<button>`, voir contraintes techniques). Classes via prop `triggerClassName`
- **Type domaine** `CircleMemberWithUser.user` étendu avec les 4 liens sociaux optionnels (seule `findMembersPaginated` les renvoie aujourd'hui)
- **UserAvatar** gagne une taille `md` (40px) utilisée dans la modale
- **CircleMembersList** supprimé (remplacé par la modale)

### Contraintes techniques découvertes (à respecter pour la suite)

1. **Pas de Radix Tooltip dans un DialogTrigger** (ou tout `<button>`). Radix TooltipTrigger, même avec asChild sur un span, produit un `<Primitive.button>` dans sa chaîne Slot → nested buttons dans le DOM final → hydration mismatch avec React 19 + Turbopack. → Utiliser le pattern tooltip CSS-pur : `group/name relative` sur le parent + `<span class="absolute top-full... opacity-0 group-hover/name:opacity-100">`
2. **DialogTrigger → `<div role="button">` via asChild** si les enfants contiennent des éléments interactifs (Tooltip, etc.). Ajouter `tabIndex={0}` + `onKeyDown` pour Enter/Space
3. **Overflow-hidden du DialogContent clippe les tooltips** → positionner les tooltips `top-full` (sous) plutôt que `bottom-full` (dessus)
4. **Sticky column** : `lg:top-20` minimum (SiteHeader h-14 = 56px, plus marge)
5. **HTML valide dans `<button>`** : pas de `<div>`, pas de `<p>` → utiliser `<span class="block">` si besoin de block
6. **$queryRaw Prisma** : attention aux mappings `@map("snake_case")` → alias explicite en SQL : `u.public_id AS "publicId"`, `u.linkedin_url AS "linkedinUrl"`, etc.

### Visual regression baseline

- Spec `tests/e2e/refonte-visual-baseline.spec.ts` + 20 snapshots committés (gitignorés au début mais re-committés sur `6b57bdd` pour persistance)
- Skip CI automatique (macOS vs Linux rendering diverge)
- Règle user : ne pas lancer `pnpm test:e2e refonte-visual-baseline` sans demande explicite



### Reste à faire — Phase 1

- [x] Audit code baseline (4 surfaces)
- [x] Décision approche (petites touches, refactor à la fin)
- [x] Touches sur pages Communauté (publique + dashboard) — voir "État au 2026-04-21" ci-dessus
- [x] Modale membres avec infinite scroll
- [ ] Attaquer la **page événement** (publique `/m/[slug]` + dashboard) avec les mêmes patterns stabilisés
- [ ] Vérifier le rendu mobile une fois les touches desktop validées
- [ ] Création Draft PR pour activer les previews Vercel (optionnel)

### Phase 0 — extractions préparatoires (terminée)

- [x] Setup visual regression baseline (20 snapshots)
- [x] Extraction `CoverBlock` (Circle publique + dashboard)
- [~] ~~Extraction `HostsBlock`~~ skipped (patterns visuels différents Circle/Moment)
- [~] ~~Extraction `CircleDetailView`~~ skipped (ratio risque/gain défavorable, ~900 lignes)

### Phase 2 — refactor / extraction (après stabilisation design)

À ré-évaluer une fois le design stabilisé. Candidats potentiels :

- [ ] Extraction `HostsBlock` (si le design du bloc Organisateur s'aligne entre Circle et Moment)
- [ ] Extraction `CircleStatsBlock` (stats membres / événements)
- [ ] Extraction `CircleMetaRows` (7 items catégorie/ville/site/etc.)
- [ ] Unification `MetaRow` entre Communauté et événement
- [ ] Extraction `ShareSection` (CircleShareInviteCard + MomentShareCard)
- [ ] Éventuel `CircleDetailView` à la manière de `MomentDetailView`
- [ ] Mise à jour tests E2E + page Aide si pertinent
