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
- [x] Touches sur pages Communauté (publique + dashboard) — voir "État au 2026-04-21"
- [x] Modale membres avec infinite scroll
- [x] Page événement (publique `/m/[slug]` + dashboard) — voir "État au 2026-04-22"
- [x] Modale participants (MomentRegistrationsDialog) avec liste attente + export CSV
- [x] Hover uniformisé site-wide (cards + liens textuels)
- [ ] Vérifier le rendu mobile événement une fois les touches desktop validées
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

### Notes / Idées à retravailler plus tard (session en cours)

- [x] Menu "Ajouter à mon calendrier" refondu en DropdownMenu (desktop : label + chevron ; mobile : icône seule style Meetup). Composant client `AddToCalendarMenu` extrait. Options Google Calendar + Fichier .ics. Mockup `spec/mockups/moment-meta-add-to-calendar-dropdown.mockup.html`.
- [x] Bug date multi-jours corrigé (page événement uniquement). Nouveau helper `formatMomentDateTime(start, end, locale)` → `{ line1, line2, isMultiDay }`. Règle : same-day ou pas de `end` → ligne 1 date longue bold (`mardi 22 avril`), ligne 2 heure(s) muted (`22:00 – 23:30`). Multi-jour → 2 lignes équivalentes bold, chacune date courte + heure (`dim. 25 janv. · 22:00` / `lun. 26 janv. · 02:00`). `formatDateRange` (banner "événement passé") gère aussi la plage de dates au format compact. Emails et OG intentionnellement non touchés (pas de bug visible, juste info de fin absente — l'ICS attaché compense). Cards (Explorer/timeline) laissées en l'état.
- [x] CTAs host DRAFT simplifiés. Bouton "Publier" déplacé dans le banner DRAFT (host only, à droite du texte explicatif) — plus contextualisé. Colonne gauche passe de 3 CTAs à 2 : Modifier (primary, rose) + Supprimer (outline destructive). `PublishMomentButton` rendu inline-friendly (retrait `w-full`, `items-end` pour alignement à droite dans le banner).
- [ ] **Focus résiduel non souhaitable** sur composants graphiques (ex. bouton "Ajouter à mon calendrier", potentiellement d'autres DropdownMenu / Button ghost / Dialog triggers). Après manipulation, le composant garde un ring/outline rose (focus-visible) qui reste affiché même après fermeture ou blur. À traiter : recherche exhaustive des composants concernés (DropdownMenu triggers, Dialog triggers, Buttons utilisés comme CTA ponctuels post-action) + correction (blur explicite après action, ou override styles focus-visible si non pertinent pour l'interaction terminée).

### Exposition des membres / participants aux visiteurs non connectés — décision 2026-04-24

**Intention retenue (Option B, "transparence pleine")** : un visiteur non connecté voit la rangée d'avatars + noms + compteur des membres/participants sur les 3 pages publiques concernées, mais **sans interaction** (pas de modale cliquable, pas de lien vers les profils). L'accès aux profils reste gated par le login.

**Pourquoi** :
- Social proof fort (levier de conversion)
- Cohérence cross-page : la page événement expose déjà les inscrits, la page Communauté s'aligne
- Le bouton d'inscription / rejoindre est la porte vers le monde connecté — pas la rangée d'avatars
- Les données exposées (prénom, avatar, initiales) sont volontairement limitées : pas d'email, pas de profil détaillé

**Alternatives écartées** :
- *Option A, "protection forte"* : bloc MEMBRES caché aux non-connectés. Rejetée car on perd le social proof et crée une friction inutile sur une plateforme community-centric.
- *Option C, "compteur seul"* : affiche « 17 membres » sans avatars ni noms. Rejetée car moins engageante que B, sans gain RGPD significatif (les données exposées en B sont très limitées).

**Implémentation** : la page Communauté publique (`/circles/[slug]`) charge maintenant les `PLAYER` pour tout le monde, peu importe la session. La branche `canSeeMembers` (connecté + accès) contrôle uniquement la cliquabilité (modale), pas la présence de la rangée d'avatars.

**Limite connue** : aujourd'hui le chargement des `PLAYER` passe par `findMembersByRole` qui retourne tous les membres. Sur un gros Circle, c'est coûteux pour afficher 5 avatars. Ce sujet est traité dans le finding R1 (consolidation des 3 requêtes membres en une) — à reprendre dans un ticket dédié post-merge.

---

## État au 2026-04-22 — Phase 1 événement terminée

### Ce qui a été fait (4 commits depuis le snapshot précédent)

- `dc91f42` — Layout mobile Communauté réordonné via `max-lg:contents` + `max-lg:order-X` + stats inline
- `7e322fe` — Barre rose À propos desktop-only (mobile enlevé)
- `5f3152c` — Gros commit refonte page événement + hover uniformisé site-wide (57 fichiers)
- `ffc723c` — Titres de section harmonisés + fix hover cards dark mode

### Patterns visuels stabilisés sur la page événement

Page événement publique (`/m/[slug]`) et dashboard (`dashboard/.../moments/[momentSlug]`) partagent le même composant `MomentDetailView`. Tout ce qui suit vaut pour les 2 vues.

**Colonne gauche (340px sticky top-20)** :
- MomentCoverBlock (1:1, overlay bas avec crédit Unsplash, Demo badge top-left)
- CircleInfoBlock ("PROPOSÉ PAR LA COMMUNAUTÉ" + cover+nom ligne 1, description ligne 2 line-clamp-2)
- Bloc ORGANISÉ PAR (aligné sur le bloc Circle : label uppercase + avatars `UserAvatar size-sm` + noms cliquables). Basé sur `primaryHosts` (creator event, fallback HOSTs)
- Séparateur `border-t`
- Bloc CTAs conditionnel :
  - Host view : Publier (DRAFT) full-width + Modifier/Supprimer flex-1 chacun
  - Public organizer : "Gérer cet événement" full-width default
  - Public non-organizer, statut PUBLISHED : RegistrationButton (simplifié au bouton principal `size=sm w-full`, card "Vous participez" retirée)
  - Public non-organizer + statut DRAFT/PAST/CANCELLED : card muted/30 p-4 rounded-2xl avec texte + lien vers Circle
  - Public déjà inscrit : CTA "Annuler mon inscription" en `default` full-width (AlertDialog confirm)

**Colonne droite (flex-1)** :
- Breadcrumb (host only)
- Actions host minimales retirées (déplacées en left column)
- H1 titre
- Banners conditionnelles DRAFT / PAST
- Description avec barre rose `lg:border-l-2 lg:border-primary lg:pl-4` (desktop only)
- **Séparateur `border-t`**
- Section "Quand & Où" (style Luma) :
  - **Date** : badge icon `size-11 bg-primary/10` + CalendarIcon `size-5 text-primary` | formatée locale-aware (`formatLongDateWithWeekday` "mardi 22 avril" + `formatLocalizedTime` "15:00 – 17:00") | desktop-only : label "Ajouter à mon calendrier" + 2 boutons icônes (Google G + Download .ics) à droite
  - **Participants** : badge icon `size-11` + UsersIcon + label "PARTICIPANTS" uppercase + avatars `size-6 ring-2` (stack -space-x-1.5) + texte "Name1, Name2 et N autres". Cliquable → `MomentRegistrationsDialog` si authentifié
  - **Lieu** : badge icon `size-11` + MapPin/Globe `size-5 text-primary` + nom lieu `text-sm font-semibold` + adresse `text-muted-foreground text-sm`. Si `mapsUrl` : wrap entier dans `<a target="_blank">` avec icône `ArrowUpRight size-3.5` à droite du titre. VideoLink (ONLINE/HYBRID) séparé en dessous
  - **Carte Google Maps embed** : iframe non wrappée (zoom/pan natifs), footer lieu+adresse+bouton externe retiré (redondant)
- Section "Partager" (host only) : titre uppercase + row LinkIcon + row Mail (BroadcastMomentDialog). Ligne calendrier retirée (déplacée en meta Date)
- Demandes en attente / Payment summary (host)
- **Documents** (`MomentAttachmentsList`) : card englobante `rounded-2xl border p-6` + titre "DOCUMENTS" uppercase + `divide-y` avec rows cliquables (button type, `cursor-pointer`, `hover:bg-muted/50 -mx-2 rounded-xl`)
- **Aussi dans cette communauté** (public) : même pattern card englobante + titre uppercase + divide-y, rows `hover:bg-muted/50 -mx-2`, cover 48px, lien "Voir tous" footer bordé
- **CommentThread** : card englobante + titre "COMMENTAIRES" uppercase (count retiré). Chaque message : header (avatar size-sm + nom bold + date + delete) puis **texte indenté avec barre rose `border-l-2 border-primary pl-3 mt-1.5`**

### Hover uniformisé site-wide (patterns verbose)

Passage global de `hover:underline` vers un changement de couleur, 51+ occurrences dans 37 fichiers :

- **Hover direct** (liens inline, admin tables, pages static) : `hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors`
- **Hover via `.group` parent** (titre de card, nom Circle, etc.) : `group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors` — **bien `dark:group-hover:` pas `dark:hover:`** (sinon seul le hover direct du texte déclenche l'éclaircissement dark, pas le hover card)
- **Named groups** (`/organizer`, `/member`, `/stat`) : idem avec le namespace `group-hover/X:` et `dark:group-hover/X:`
- **Texte `text-primary`** (déjà rose) : `hover:text-primary/60 transition-colors` ou `hover:text-foreground transition-colors`
- Les `ui/button.tsx` et `ui/badge.tsx` conservent le `hover:underline` pour le variant `link` du design system
- Itérations testées et rejetées : `pink-300`, `fuchsia-300`, `rose-300`, `emerald-300` (trop contrastés ou hors teinte primary), `text-shadow glow currentColor` (invisible en dark), `underline animé growing` (fragile, débordait du texte). Solution retenue : passage primary direct + variante éclaircie en dark uniquement

### Architecture MomentRegistrationsDialog (modale participants)

Identique au pattern `CircleMembersDialog` :
- **Port** `RegistrationRepository.findParticipantsPaginated(momentId, { offset, limit })` → `{ participants, total, hasMore }`
- **Adapter Prisma** : `Promise.all([findMany(status: REGISTERED), count])`. Le `select` user de `findActiveWithUserByMomentId` aussi étendu avec les 4 champs sociaux (`website`, `linkedinUrl`, `twitterUrl`, `githubUrl`) pour que la première page soit dérivable côté JS sans round-trip supplémentaire
- **Usecase** `getMomentParticipantsPage` avec guard (auth + (circle PUBLIC ou membre ACTIF))
- **Server action** `getMomentParticipantsPageAction`
- **Type domaine** `RegistrationWithUser.user` étendu avec les 4 liens sociaux optionnels
- **Composant** `MomentRegistrationsDialog` (client) :
  - Header : UsersIcon badge size-14 + "X inscrits" en titre + "Y places restantes" / "Complet" subtitle + bouton "Exporter CSV" (ghost, host only)
  - Rows : avatar `size-md` + nom + badge Crown (tooltip CSS) + email (host only) + SocialLinks (Globe/Linkedin/X/Github) + DropdownMenu MoreVertical avec action "Retirer" (host only, non-host)
  - Section "Liste d'attente" (si `waitlistedRegistrations.length > 0`) : label Clock + count, même rows
  - Infinite scroll via IntersectionObserver + sentinel
  - `hostUserIds` = `[moment.createdById]` seulement (badge Crown uniquement sur le créateur de l'event, pas tous les HOSTs du Circle)
- **Optim serveur** : `participantsFirstPage` est dérivé côté JS depuis `allAttendees` (filter REGISTERED + slice 20). `findParticipantsPaginated` n'est appelé QUE côté client pour les pages suivantes de l'infinite scroll. Économie : 1 round-trip DB par rendu de page événement

### Autres features livrées

- **Layout 2 pages Circle mobile** (`max-lg:contents` + `max-lg:order-X`) : cover → pill+titre+À propos → organisateurs+stats+CTA → meta+partage+events. Sticky desktop préservé
- **Stats inline** Circle : valeur + libellé sur la même ligne (flex items-baseline)
- **Séparateur Stats/CTA Communauté** desktop-only (`max-lg:hidden`)
- **PublishMomentButton** devient full-width (support CTA stack)
- **DeleteMomentDialog** : prop `triggerClassName` pour `flex-1`
- **Cover crédit photo Unsplash** : déplacé en overlay bas de l'image (gain de hauteur)
- **Description événement** : barre rose gauche `lg:border-l-2 lg:border-primary lg:pl-4`
- **Participants modale** : menu 3-points contextuel (DropdownMenu) au lieu du bouton "Retirer" inline, pattern `CircleMembersDialog`
- Helpers format-date ajoutés : `formatLongDateWithWeekday`, `formatLocalizedTime`

### Règles durables créées (memory feedbacks)

- `feedback_sticky_column_under_header.md` : sticky `lg:top-20` minimum (SiteHeader h-14)
- `feedback_no_radix_tooltip_in_dialog_trigger.md` : jamais Radix Tooltip dans un DialogTrigger/button → hydration mismatch. Pattern tooltip CSS-pur
- `feedback_no_auto_visual_regression.md` : ne jamais lancer `pnpm test:e2e refonte-visual-baseline` sans demande explicite
- `feedback_note_vs_backlog.md` : "noter" = fichier spec de la session, jamais BACKLOG.md. Backlog seulement si "ajoute au backlog" explicite

### Reste à faire

- [ ] Valider visuellement l'ensemble de la refonte en dev server
- [ ] Mobile événement : vérifier que le layout tient bien (actuellement left column `hidden lg:flex`, le bloc CTAs + organisateurs n'est pas visible sur mobile)
- [ ] Refactor layout mobile événement avec `max-lg:contents` comme Circle (phase suivante)
- [ ] Draft PR pour previews Vercel
- [ ] Page Aide à mettre à jour (nouvelle modale participants, nouveaux CTAs)
