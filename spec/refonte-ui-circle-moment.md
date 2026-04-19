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
- Décision approche : petites touches d'abord, refactor/extraction composants à la fin une fois le design stabilisé. Voir **Décisions design prises**.

## Décisions design prises

### 2026-04-19 — Approche : petites touches, refactor à la fin

Stratégie validée :

1. **Phase 1 — itération design** : modifications par petites touches sur les 4 surfaces, sans se préoccuper de la duplication de code. On duplique volontairement si besoin, on applique le cross-view alert à chaque modif, on laisse le design se stabiliser.
2. **Phase 2 — refactor / extraction** : une fois le design stabilisé (validation utilisateur), on extrait les composants partagés (CoverCard, HostsBlock, MetaRow unifié, ShareSection, potentiellement CircleDetailView à la manière de MomentDetailView). Zéro changement visuel pendant cette phase.

Rationale : le design n'est pas encore figé. Factoriser trop tôt risque de nous enfermer dans des composants qui ne survivront pas aux itérations. On garde la liberté visuelle d'abord, la propreté de code après.

## Questions ouvertes

> À compléter au fil des itérations.

## Reste à faire

### Phase 1 — petites touches (en cours)

- [x] Audit code baseline (4 surfaces)
- [x] Décision approche (petites touches, refactor à la fin)
- [ ] Captures visuelles des 4 surfaces × 2 breakpoints (optionnel, à la demande)
- [ ] Création Draft PR pour activer les previews Vercel
- [ ] Premières modifs design par petites touches (avec cross-view alert)

### Phase 2 — refactor / extraction (après stabilisation design)

- [ ] Extraction `CoverCard` (4 usages)
- [ ] Extraction `HostsBlock` (4 usages)
- [ ] Unification `MetaRow` entre Communauté et événement
- [ ] Extraction `ShareSection` (CircleShareInviteCard + MomentShareCard)
- [ ] Éventuel `CircleDetailView` à la manière de `MomentDetailView`
- [ ] Mise à jour tests E2E + page Aide si pertinent
