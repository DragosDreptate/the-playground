# Backlog — The Playground

> Ce fichier est tenu à jour avec les décisions prises au fil du développement.
> Il fait foi pour le périmètre restant du MVP et les évolutions futures.

---

## Fait

| Feature | Date | Commit |
| --- | --- | --- |
| Auth (magic link + OAuth Google/GitHub) | 2026-02-19 | — |
| CRUD Communauté (domain, tests, UI, i18n) | 2026-02-19 | `dd41709` |
| Design system Cyberpunk + dark/light toggle | 2026-02-19 | `2250774` |
| CRUD événement (domain, tests, UI, i18n, page publique `/m/[slug]`) | 2026-02-20 | `7c507cb` |
| Refactor membership : Host extends Player | 2026-02-20 | `d9139f4` |
| Neon branching dev/prod + script `db:dev:reset` | 2026-02-20 | `036d93e` |
| Profil utilisateur + onboarding obligatoire au premier login | 2026-02-20 | `fd024a7` |
| Registration : `JoinMoment` (inscription + auto-join Communauté + liste d'attente) | 2026-02-20 | non commité |
| Registration : `CancelRegistration` (annulation + promotion liste d'attente) | 2026-02-20 | non commité |
| Registration : `GetMomentRegistrations`, `GetUserRegistration` | 2026-02-20 | non commité |
| Page publique `/m/[slug]` : bouton inscription fonctionnel (`RegistrationButton`, `RegistrationsList`) | 2026-02-20 | non commité |
| Dashboard Participant-first : `GetUserCirclesWithRole`, `GetUserUpcomingMoments` | 2026-02-20 | non commité |
| Dashboard Participant-first : section "Mes prochains événements" + "Mes Communautés" avec badge rôle | 2026-02-20 | non commité |
| Dev tooling : seed 3 utilisateurs test (host/player1/player2) + route GET d'impersonation (dev-only) | 2026-02-20 | `c862293` |
| Sécurité dashboard : pages Communauté/événement vérifient le rôle — Participants voient la vue publique, contrôles Organisateur masqués | 2026-02-20 | `c862293` |
| Règle métier : blocage inscription si événement déjà commencé (`MomentAlreadyStartedError`) + transition auto PUBLISHED→PAST | 2026-02-20 | `c862293` |
| Bug fix : ré-inscription après annulation met à jour la ligne existante (pas de doublon) | 2026-02-20 | `c862293` |
| Tests : 21 nouveaux tests couvrant le cycle de vie de l'inscription (re-register, capacité, flux croisés) | 2026-02-20 | `c862293` |
| Monitoring : Sentry (error tracking client/server/edge) + Vercel Analytics + SpeedInsights | 2026-02-21 | `c862293` + `2dde4cc` |
| Page événement unifiée : composant `MomentDetailView` partagé entre vue publique et vue Organisateur | 2026-02-21 | `e867ba0` |
| Page Communauté redesignée : layout 2 colonnes aligné sur événement (cover gradient, Organisateurs, stats) | 2026-02-21 | `0deec99` |
| Timeline événements sur page Communauté : toggle "À venir / Passés" (URL param `?tab=past`) + fil d'ariane avec dates | 2026-02-21 | `0deec99` |
| Statut inscription dans la timeline : dot coloré (rose/amber) + badge (Inscrit / Liste d'attente) | 2026-02-21 | `b9a9993` |
| Formulaire événement : auto-sync date de fin = date de début à la sélection | 2026-02-21 | `0deec99` |
| Indicateurs événement passé : cover grisée + badge "Passé" overlay + banner contextuel + carte "Événement terminé" avec CTA rétention Communauté | 2026-02-21 | `488ddb8` |
| Fil de commentaires sur événement : `CommentThread` (plat, chronologique) sur pages publique + dashboard Organisateur/Participant | 2026-02-21 | non commité |
| Scripts données test : `db:seed-test-data` (réaliste, idempotent, FR) + `db:cleanup-test-data` (dry-run par défaut) + variantes prod | 2026-02-21 | non commité |
| Redesign page profil : layout single-column centré, avatar header, stats inline, meta rows (email, membre depuis), formulaire simplifié | 2026-02-21 | `7142585` |
| Fils d'ariane cohérents sur toutes les pages dashboard (6 pages ajoutées/complétées) | 2026-02-21 | `313473e` |
| Harmonisation badges : Annulé → outline destructive, Organisateur → outline primary partout, Participant → secondary partout | 2026-02-21 | `8d7b76b` |
| Couleur destructive = primary (une seule couleur accent rose, danger communiqué par le contexte) | 2026-02-21 | `75fd383` |
| Bouton Modifier unifié : default (rose plein) sur pages Communauté et événement | 2026-02-21 | `295575d` |
| Le Répertoire : `/explorer` (tabs Communautés/Événements, filtre catégorie) + page Communauté publique `/circles/[slug]` + champs `category`/`city` sur Communauté | 2026-02-21 | `c3813e7` |
| Dashboard redesigné : pill tabs (Mes Escales / Mes Cercles), timeline unifiée (upcoming + past), `DashboardMomentCard` avec `CircleAvatar`, empty states CTA | 2026-02-21 | — |
| `CircleMembersList` : section membres sur page Communauté (Organisateurs avec Crown, emails visibles Organisateur-only via `variant`) | 2026-02-21 | — |
| Terminologie i18n : FR Moment → **Escale**, S'inscrire → **Rejoindre**, Dashboard → **Mon Playground** / EN Player → **Member**, Register → **Join**, Dashboard → **My Playground** | 2026-02-21 | — |
| Renommage Répertoire → **La Carte** (FR) / **Explore** (EN). Route `/explorer` inchangée. | 2026-02-21 | — |
| Homepage redesignée : hero split-screen (texte + mockup iPhone 3D tilt), section "Comment ça marche" (3 étapes), 3 piliers, CTA final, footer — i18n FR/EN complet | 2026-02-21 | — |
| Scripts données démo : `db:seed-demo-data` (6 Communautés, 20 users `@demo.playground`, 30 événements 80%/20%, FR, idempotent) + `db:cleanup-demo-data` (dry-run par défaut) + variantes prod | 2026-02-21 | `0fa65f0` |
| Admin plateforme : dashboard stats, listes paginées (Utilisateurs/Communautés/Événements) avec recherche, pages détail, suppression, forcer annulation événement. Middleware guard `/admin/*`, `UserRole` (USER/ADMIN), lien Admin dans UserMenu, i18n FR/EN complet | 2026-02-21 | `dbe3dda` |
| Emails transactionnels (Resend + react-email) : confirmation inscription, confirmation liste d'attente, promotion liste d'attente, notification Organisateur nouvelle inscription. Port `EmailService` + adapter `ResendEmailService`. Templates React avec calendar badge (gradient rose→violet). Fire-and-forget depuis server actions. i18n FR/EN complet. | 2026-02-21 | — |
| Email notification Organisateur : nouveau commentaire sur un événement (`host-new-comment` template, `sendHostNewComment` sur `EmailService`, déclenché depuis `addCommentAction`, fire-and-forget, i18n FR/EN `Email.commentNotification.*`). | 2026-02-24 | `f29287b` |
| Couverture tests complète : 14 nouveaux fichiers (get-user-registration, get-moment-comments, get-user-past-moments, 11 usecases admin). 5 specs E2E scaffoldées (auth, join-moment, host-flow, cancel-registration, comments). *(202 tests à ce stade, avant les ajouts sécurité et suivants)* | 2026-02-21 | `3ee4865` |
| Suppression de compte utilisateur : usecase `deleteAccount` (cascade Communauté si seul Organisateur), server action `deleteAccountAction`, section "Zone de danger" sur la page profil avec confirmation modale. i18n FR/EN `Profile.deleteAccount.*`. | 2026-02-22 | — |
| Agents Claude Code : `test-coverage-guardian` (audit couverture + création tests manquants, run + correction en boucle) + `security-guardian` (audit RBAC/IDOR/accès admin, création tests sécurité, correction vulnérabilités). Définis dans `.claude/agents/`. | 2026-02-21 | — |
| Sécurité : audit complet + correction vulnérabilité architecturale (defense-in-depth manquante sur 11 usecases admin). Ajout `callerRole: UserRole` + `AdminUnauthorizedError`. 59 nouveaux tests de sécurité (RBAC, IDOR cross-tenant, accès admin). *(271 tests à ce stade, avant les ajouts suivants)* | 2026-02-21 | `8b14aaf` |
| Upload d'avatar utilisateur : port `StorageService` (hexagonal), adapter `VercelBlobStorageService` (@vercel/blob), helper `isUploadedUrl`, helper `resizeImage` (Canvas API, crop carré centré, WebP 384×384 ~50 Ko), server action `uploadAvatarAction`, composant `AvatarUpload` (hover overlay + lien texte conditionnel, preview optimiste, spinner), protection OAuth (ne pas écraser avatar uploadé), i18n FR/EN `Profile.avatar.*`, tests `blob.test.ts` + cas image dans `update-profile.test.ts`. AvatarUpload intégré aussi sur la page d'onboarding `/dashboard/profile/setup`. | 2026-02-22 | `aa84d5c` |
| Isolation onboarding via route groups Next.js : `(app)/layout.tsx` (layout complet : SiteHeader + SiteFooter) + `(onboarding)/layout.tsx` (layout minimal : logo statique non-cliquable, LocaleToggle + ThemeToggle uniquement, pas de footer). Suppression de la prop `hideNav` du SiteHeader. Tests E2E (`onboarding.spec.ts`, 6 tests) + `playwright.config.ts` + script `test:e2e:setup-onboarding`. TDD : tests écrits en RED, puis implémentation, puis GREEN. | 2026-02-22 | `7c57b8d` |
| Audit sécurité (security-guardian) : 20 nouveaux tests de sécurité. `avatar-upload-isolation.test.ts` (5 tests IDOR/userId isolation) + `onboarding-guard.test.ts` (15 tests anti-boucle, transitions d'état, cas limites). Aucune vulnérabilité détectée dans le code source. *(303 tests à ce stade, avant les ajouts suivants)* | 2026-02-22 | — |
| Footer global (`SiteFooter`) + pages légales : mentions légales `/legal/mentions-legales`, confidentialité `/legal/confidentialite`, CGU `/legal/cgu`. i18n FR/EN complet (namespaces `Footer` + `Legal`). | 2026-02-22 | `da1c2e8` |
| Magic link email : template react-email avec icône PNG embarquée en base64 (gradient + triangle play). Zéro dépendance réseau pour le rendu. | 2026-02-22 | `f27fee9` |
| OpenGraph + SEO : images OG dynamiques (homepage, événement, Communauté), `metadataBase`, `generateMetadata`, `robots.ts`, `sitemap.ts`. | 2026-02-22 | — |
| Mobile responsive : hamburger menu (DropdownMenu), cards compactes Explorer, footer responsive, hero centrage, tabs responsive. | 2026-02-22 | — |
| Terminologie FR simplifiée pour accessibilité : Cercle → **Communauté**, Escale → **événement** (masculin), Mon Playground → **Mon espace**, La Carte → **Découvrir**, Rejoindre → **S'inscrire**. Code/clés JSON inchangés. EN inchangé. | 2026-02-22 | — |
| Cover Communauté : `CoverImagePicker` (tabs Photos Unsplash + Importer), server action `processCoverImage` dans `cover-image.ts`, champs `coverImage`/`coverImageAttribution` sur Communauté (DB + domaine), API proxy Unsplash `/api/unsplash/search`, affichage sur 5 emplacements, attribution "Photo par [Nom] sur Unsplash". | 2026-02-23 | — |
| Cover événement : mêmes champs `coverImage`/`coverImageAttribution` sur événement (DB + domaine), même composant `CoverImagePicker`, même server action `processCoverImage`, affichage sur pages publique et Organisateur. | 2026-02-23 | — |
| **Suivre une Communauté (Follow)** : table `CircleFollow` (DB + domaine), usecases `followCircle`/`unfollowCircle`, composant `FollowButton` (cloche, 3 états), intégré sur page Communauté publique (visible uniquement pour les utilisateurs connectés non-membres). Notification email aux followers à la création d'un événement (fire-and-forget). Déduplique followers+membres (un follower-membre ne reçoit qu'un seul email). | 2026-02-24 | `80a1390` |
| **Email aux membres : nouvel événement dans leur Communauté** : `notifyNewMoment` envoie automatiquement un email à tous les membres (PLAYERs) à la création d'un événement, sauf au créateur. Intégré dans `createMomentAction`. Fire-and-forget. Template distinct du template follower (intro "votre Communauté" vs "une Communauté que vous suivez"). | 2026-02-24 | `80a1390` |
| CoverImagePicker — photos aléatoires Unsplash à l'ouverture : suppression des photos curées statiques, nouvelle route `/api/unsplash/random` (8 appels parallèles `/photos/random`, 1 par thématique, cache `s-maxage=300`), skeleton 8 cases pendant le chargement, `defaultPhotos` mis en cache entre les ouvertures. | 2026-02-23 | `dcd2c6c` |
| CoverImagePicker — pagination recherche : remplacement du bouton "Voir plus" (qui agrandissait la modale) par une navigation prev/next qui remplace les photos sans changer la taille de la modale. | 2026-02-23 | — |
| CoverImagePicker — fix state reset : `handleApply` et `handleRemove` appelaient `setOpen(false)` directement (bypasse `onOpenChange` en mode contrôlé Radix), laissant `pending` stale. Corrigé en appelant `handleOpenChange(false)` pour garantir le reset complet. Fix parallèle : le bouton déclencheur appelait `setOpen(true)` au lieu de `handleOpenChange(true)`, empêchant le fetch des photos aléatoires. | 2026-02-23 | `e1131ef`, `9d5cfde` |
| **Refonte dashboard "Mon espace"** : tab Événements (`DashboardMomentCard` redesigné — cover 64 px à gauche, titre line-clamp-2, badge aligné à droite) + tab Communautés (nouveau `DashboardCircleCard` style Explorer — cover 1:1, stats membres/événements, prochain événement, bouton "Créer un événement" Organisateur-only). Nouveau type domaine `DashboardCircle` (`CircleWithRole` + `memberCount` + `upcomingMomentCount` + `nextMoment`). Nouveau usecase `getUserDashboardCircles`. Nouvelle méthode repository `findAllByUserIdWithStats` (requête unique, pas de N+1). Grille Communautés `sm:grid-cols-2`. 9 nouveaux tests unitaires (`get-user-dashboard-circles.test.ts`). | 2026-02-24 | `6a912a2` |
| **Emails transactionnels supplémentaires** : notification de mise à jour d'événement (`momentUpdate` / `hostMomentUpdate` — envoyés aux inscrits et à l'Organisateur quand date ou lieu change) + notification d'annulation d'événement (`momentCancelled` — envoyé à tous les inscrits REGISTERED quand un événement est annulé) + notification Organisateur à la création d'événement (`hostMomentCreated` — confirmation par email au créateur). Port `EmailService` étendu avec `sendMomentUpdate`, `sendMomentCancelled`, `sendHostMomentCreated`. Fire-and-forget depuis `updateMomentAction` et `cancelMomentAction`. i18n FR/EN complet dans `messages/*.json`. | 2026-02-24 | — |
| **Email alerte Organisateur : nouveau follower** : `host-new-follower` template, `sendHostNewFollower` sur `EmailService`, déclenché depuis `followCircleAction`, respecte la préférence `notifyNewFollower`, fire-and-forget. | 2026-02-24 | — |
| **Préférences de notifications email** : 4 booléens sur `User` (`notifyNewRegistration`, `notifyNewComment`, `notifyNewFollower`, `notifyNewMomentInCircle`), usecase `updateNotificationPreferences`, server action dans `profile.ts`, section "Notifications" sur `/dashboard/profile` avec toggles `Switch`, i18n FR/EN `Profile.notifications.*`. | 2026-02-24 | — |
| **Export CSV des inscrits** : bouton "Exporter CSV" sur la vue Organisateur d'un événement (`RegistrationsList`), client-side avec BOM UTF-8, colonnes prénom/nom/email/statut/date. i18n `Moment.registrations.exportCsv` + `Moment.registrations.csvHeaders.*`. | 2026-02-24 | — |
| **Dashboard Mode Switcher Participant / Organisateur** : enum `DashboardMode` sur `User` (DB + domaine + session Auth.js). Usecases `setDashboardMode`, `getHostUpcomingMoments`, `getHostPastMoments`. Composants `DashboardModeSwitcher` (pill switcher), `CreateMomentButton` (CTA adaptatif 0/1/2+ Communautés), `CreateMomentDropdown` (Popover). Dashboard content filtré par mode (vue Participant / vue Organisateur). Welcome page redesignée : deux cartes cliquables "Je participe" / "J'organise". `shouldRedirectToWelcome` (`src/lib/dashboard.ts`). `SiteHeader` + `MobileNav` avec `dashboardHref` conditionnel. Homepage CTAs adaptatifs. `globalTeardown` E2E. `thomas@demo.playground` ajouté. 19 tests unitaires + spec E2E `dashboard-mode-switcher.spec.ts` (9 tests). | 2026-02-28 | — |

---

## MVP V1 — À faire

> Référence UX complète : `spec/ux-parcours-jtbd.md` (8 personas, 25 JTBD, 7 parcours, matrice gaps).

---

### 🔴 Rétention & viralité — boucle critique (bloquant pour la croissance)

> Ces éléments sont les **casseurs de loop** identifiés dans l'analyse UX.
> Sans eux, le produit peut fonctionner mais ne peut pas croître ni fidéliser.
> Référence : parcours A→G, gaps MVP-1 à MVP-4 + H-1 à H-8.

#### Emails transactionnels (Resend + react-email)

- [x] **Email de confirmation d'inscription** (MVP-1 — parcours A) ✅
  - Déclenché immédiatement après `JoinMoment`
  - Contenu : titre événement, date, lieu, lien `/m/[slug]`, lien d'annulation
  - Gère aussi le cas WAITLISTED (textes différents, même template)

- [ ] **~~Email de rappel pré-événement~~** → **déprioritisé, post-MVP** (voir Phase 2)
  - Rappel 24h avant + rappel 1h avant — nécessite une infrastructure de jobs planifiés (Vercel Cron / QStash)
  - Complexité d'implémentation disproportionnée pour le MVP

- [x] **Email de promotion liste d'attente** (MVP-3 — parcours C) ✅
  - Déclenché par `CancelRegistration` quand un inscrit se désiste et promeut un waitlisté
  - Contenu : "Votre place est confirmée", détails de l'événement

- [x] **Email de notification Organisateur : nouvelle inscription** (MVP-4 — parcours D) ✅
  - Déclenché par chaque `JoinMoment` sur un événement dont l'utilisateur est Organisateur
  - Contenu : nom du nouvel inscrit, total inscrits / places restantes, lien vers gestion
  - Skip quand l'Organisateur s'inscrit lui-même

- [x] **Email alerte Organisateur : nouveau follower de sa Communauté** ✅
  - Déclenché dans `followCircleAction` après `followCircle` — fire-and-forget
  - Destinataires : tous les Organisateurs de la Communauté suivie
  - Contenu : prénom/nom du follower, lien vers la page Communauté, lien vers la liste des membres
  - Respecte la préférence `notifyNewFollower` de l'Organisateur
  - Template : `host-new-follower` (react-email). Port `EmailService.sendHostNewFollower` + adapter `ResendEmailService`.

- [x] **Architecture email multi-canal** (infrastructure) ✅
  - Port `EmailService` (8 méthodes) + adapter `ResendEmailService`
  - Templates React (react-email) : calendar badge gradient, layout blanc/gris
  - Fire-and-forget depuis server actions (pas de queue pour le MVP)
  - Clé API : `AUTH_RESEND_KEY` (partagée auth + transactionnel)

#### UX post-inscription — "Et maintenant ?" (parcours A)

- [x] **CTA "Ajouter au calendrier" post-inscription** (gap M-1) ✅
  - Sur la page `/m/[slug]` après inscription confirmée
  - Liens : Google Calendar (via `buildGoogleCalendarUrl`) + fichier `.ics` (via `/api/moments/[slug]/calendar`)
  - Composant `AddToCalendarButtons` (`src/components/moments/add-to-calendar-buttons.tsx`)
  - Intégré dans `RegistrationButton` côté client

- [ ] **Lien "Voir dans mon tableau de bord" post-inscription** (gap M-2)
  - Sur la page `/m/[slug]` après inscription : lien visible vers `/dashboard`
  - Objectif : faire découvrir l'espace personnel au nouveau membre

- [ ] **Section "Prochains événements de la Communauté" sur page événement publique** (gap M-3)
  - Sur `/m/[slug]` pour les événements PUBLISHED (pas PAST — déjà traité)
  - Affiche jusqu'à 3 prochains événements de la même Communauté (titre, date, CTA)
  - Rétention Communauté depuis la porte d'entrée virale

#### Engagement post-événement — fenêtre d'or 24h (parcours F)

- [ ] **L'Organisateur peut commenter sur un événement PAST** (gap H-1 — critique)
  - Actuellement : formulaire masqué pour tous sur PAST, y compris l'Organisateur
  - Décision à prendre : débloquer pour l'Organisateur uniquement, ou pour tous
  - Impact : l'Organisateur ne peut pas remercier sa communauté, pic d'engagement manqué

- [ ] **CTA "Créer le prochain événement" depuis un événement PAST** (gap H-2)
  - Sur la page événement PAST, vue Organisateur : bouton "Programmer le prochain événement"
  - Pré-remplit le formulaire avec la même Communauté
  - Capitalise sur l'élan post-événement

#### Clarté liste d'attente (parcours C)

- [x] **Position dans la liste d'attente visible** (gap H-3) ✅
  - Sur `/m/[slug]` et dashboard : "Vous êtes X° sur la liste d'attente"
  - Calcul à la volée via `prismaRegistrationRepository.countWaitlistPosition`
  - Affiché dans `RegistrationButton` via prop `waitlistPosition`

#### Découverte inter-événements (parcours B)

- [ ] **Autres événements de la Communauté sur la page événement dashboard Participant** (gap H-4)
  - Sur `/dashboard/circles/[slug]/moments/[slug]` vue Participant : section "Dans cette Communauté"
  - Liste les 3 prochains événements À VENIR de la même Communauté
  - Actuellement absent : une fois sur un événement, le Participant ne découvre pas les autres

#### Onboarding Organisateur — time-to-first-event (parcours G)

- [ ] **Guide onboarding Organisateur débutant** (gap H-7)
  - Stepper 3 étapes — "Créez votre Communauté → Créez votre premier événement → Partagez le lien"
  - Objectif : réduire le time-to-first-event à < 5 minutes
  - Note : le mode choice de la welcome page (`J'organise`) oriente déjà l'Organisateur débutant, mais sans guide pas-à-pas

- [x] **CTA "Devenir organisateur" pour Participants** (gap H-5) ✅
  - Adressé par le Dashboard Mode Switcher : le pill "Organisateur" est visible pour tous les utilisateurs, même sans Communauté
  - En mode Organisateur sans Communauté : CTA "Créer une Communauté d'abord" → `/dashboard/circles/new`

#### Accueil utilisateur direct — sans lien d'entrée

> Un utilisateur qui s'inscrit sans lien d'événement ni de Communauté ne sait pas où aller.
> Le dashboard vide est silencieux — il faut l'orienter activement.

- [x] **Dashboard Mode Switcher + Page de bienvenue `/dashboard/welcome`** ✅
  - **Enum `DashboardMode`** (`PARTICIPANT` / `ORGANIZER`) sur `User` (DB + domaine + session)
  - **Usecases** : `setDashboardMode`, `getHostUpcomingMoments`, `getHostPastMoments`
  - **Server action** : `setDashboardModeAction` (`src/app/actions/dashboard.ts`)
  - **Composants** : `DashboardModeSwitcher` (pill switcher client), `CreateMomentButton` (CTA adaptatif 0/1/2+ Communautés), `CreateMomentDropdown` (Popover sélection Communauté)
  - **Dashboard content** : filtrage par mode — vue Participant (événements où inscrit) vs vue Organisateur (événements créés, variante `organizer` de `DashboardMomentCard`)
  - **CTA adaptatif** en mode Organisateur : 0 Communauté → "Créer une Communauté d'abord", 1 Communauté → lien direct, 2+ → dropdown Popover
  - **SiteHeader / MobileNav** : `dashboardHref` conditionnel (conserve le mode actif via URL param)
  - **Homepage** : CTAs hero et section finale → `/dashboard/circles/new` si connecté
  - **Welcome page redesignée** — deux cartes cliquables ("Je participe" / "J'organise") avec `setDashboardMode` immédiat et redirect vers `/dashboard`
  - **Trigger welcome** : redirect vers `/dashboard/welcome` uniquement si `dashboardMode === null` ET aucune activité (pas de Communauté, pas d'inscription). Logique dans `shouldRedirectToWelcome` (`src/lib/dashboard.ts`)
  - **Persistance** : `dashboardMode` en DB + en session Auth.js. Bascule via URL param `?mode=participant|organizer` + `setDashboardModeAction` en background (fire-and-forget)
  - **Demo data** : `thomas@demo.playground` ajouté (user "blank slate" avec `dashboardMode: null` — permet de tester le flux welcome page)
  - **Tests** : 19 tests unitaires `lib/__tests__/dashboard.test.ts` (règle `shouldRedirectToWelcome`, table de vérité exhaustive) + spec E2E `dashboard-mode-switcher.spec.ts` (9 tests — switcher, CTAs, persistence URL, redirect welcome)
  - **Phase 2 — hors scope MVP** : email de re-engagement si N jours sans activité après le welcome

#### Gestion des inscriptions Organisateur (parcours E)

- [x] **Export CSV des inscrits** (gap E-3) ✅
  - Depuis la page événement Organisateur : bouton "Exporter CSV"
  - Colonnes : prénom, nom, email, statut (REGISTERED/WAITLISTED), date d'inscription
  - Implémenté dans `RegistrationsList` (`src/components/moments/registrations-list.tsx`) — client-side, avec BOM UTF-8
  - Clés i18n `Moment.registrations.exportCsv` + `Moment.registrations.csvHeaders.*`

- [ ] **Vue segmentée inscrits/liste d'attente sur page événement Organisateur** (gap H-8 + M-5)
  - Compteur "X inscrits confirmés · Y en attente · Z places restantes" en haut de page
  - Liste séparée en deux sections : Inscrits / Liste d'attente
  - Actuellement : liste unique sans distinction claire

---

### Personnalisation visuelle — avatars & covers

> Directement lié au principe "design premium par défaut" et à l'identité des communautés.
> Les gradients générés sont de bons fallbacks, mais les Organisateurs doivent pouvoir personnaliser leur Communauté.

- [x] **Avatar utilisateur** ✅ — upload photo de profil (Vercel Blob, resize Canvas WebP 384×384)

- [x] **Cover Communauté** ✅ — image personnalisée de la Communauté (Vercel Blob, Unsplash via proxy + upload local)
  - Champs `coverImage: String?` + `coverImageAttribution: Json?` sur `Circle` (DB + domaine)
  - Composant `CoverImagePicker` : dialog tabs "Photos Unsplash" + "Importer" (drag-and-drop, resize client-side)
    - Onglet Photos : 8 photos aléatoires Unsplash à l'ouverture (1/thématique, via `/api/unsplash/random`, chargées en parallèle, mises en cache) + recherche paginée prev/next
    - Onglet Importer : drag-and-drop ou sélection fichier, validation client (5 Mo, JPG/PNG/WebP), resize Canvas → WebP
  - Server action `processCoverImage` dans `src/app/actions/cover-image.ts` (partagée Communauté + événement)
  - Affiché sur page Communauté publique, page Communauté dashboard, `CircleCard`, `PublicCircleCard`, `CircleAvatar`
  - Attribution Unsplash : "Photo par [Nom] sur Unsplash"
  - Fallback : gradient actuel si pas d'image
  - Cleanup Vercel Blob de l'ancienne image lors du remplacement ou de la suppression

- [x] **Cover événement** ✅ — image de couverture de l'événement (Vercel Blob, Unsplash via proxy + upload local)
  - Champs `coverImage: String?` + `coverImageAttribution: Json?` sur `Moment` (DB + domaine)
  - Même composant `CoverImagePicker` que pour la Communauté (même server action `processCoverImage`)
  - Affiché en bannière sur la page publique `/m/[slug]` et la vue Organisateur
  - Fallback : gradient actuel si pas d'image

- [x] **Infrastructure upload** ✅ (prérequis commun aux covers Communauté/événement)
  - Port `StorageService` + adapter `VercelBlobStorageService` (@vercel/blob)
  - Contraintes : taille max 5 Mo, formats JPEG/PNG/WebP, redimensionnement Canvas côté client (WebP 384×384)

---

### Priorité haute (bloquant pour le lancement)

- [x] **Admin plateforme** ✅
  - Pages `/admin/*` (même stack, shadcn)
  - Dashboard stats + listes paginées + détail + suppression (Users, Circles, Moments)
  - Forcer annulation événement
  - Champ `role` (USER/ADMIN) sur User, middleware guard sur `/admin/*`

- [x] **Préférences de notifications email** ✅ — intégrées dans la page profil (pas de page `/dashboard/settings` séparée)
  - Section "Notifications" sur `/dashboard/profile` avec toggles `Switch` par type
  - Préférences implémentées : `notifyNewFollower`, `notifyNewRegistration`, `notifyNewComment`, `notifyNewMomentInCircle`
  - Toutes activées par défaut (opt-out), champs booléens sur `User` en DB
  - Usecase `updateNotificationPreferences` + server action dans `profile.ts`
  - Chaque server action qui envoie un email consulte la préférence avant d'appeler `emailService`
  - i18n FR/EN : namespace `Profile.notifications.*`

- [ ] **Outils Organisateur enrichis**
  - Co-Organisateurs (plusieurs Organisateurs par Communauté)
  - Gestion membres (inviter, retirer)
  - Stats Communauté basiques

- [ ] **Paiement Stripe Connect**
  - Événements payants : prix en centimes, reversement aux Organisateurs
  - Stripe Connect onboarding pour les Organisateurs
  - 0% commission plateforme, seuls frais Stripe

- [x] **Fil de commentaires sur événement** ✅
  - CRUD commentaire sur chaque événement
  - Visible sur la page publique et la vue dashboard

- [x] **Découvrir** (ex-Répertoire) ✅ — `spec/feature-explorer-la-carte.md`
  - Page `/explorer` : vitrine publique, "répertoire de tous les possibles" (SSR, revalidate: 60)
  - Tab **Communautés** : annuaire des Circles publics (card : nom, catégorie, ville, N membres, prochain événement en teaser)
  - Tab **Événements** : agenda chronologique des événements PUBLISHED de Communautés publiques (card community-first)
  - Filtre **catégorie** (MVP) — pas de filtre ville (densité insuffisante au lancement)
  - Page Communauté publique `/circles/[slug]` accessible sans compte (SEO + cold traffic)
  - Lien "Explorer" dans le header principal (visible utilisateurs connectés)
  - Schema : `CircleCategory` enum (8 valeurs) + `category` + `city` sur Communauté
  - Formulaire Communauté : Select catégorie + Input ville
  - 10 nouveaux tests unitaires BDD (`getPublicCircles`, `getPublicUpcomingMoments`)

### Priorité moyenne

- [x] **Email aux membres : nouvel événement dans leur Communauté** (gap M-4) ✅
  - Automatique à la création (cohérent avec modèle actuel : création = publication)
  - Déduplication : si un utilisateur est à la fois follower et membre, il reçoit uniquement l'email membre
  - Créateur exclu de la notification (via `findPlayersForNewMomentNotification`)

- [ ] **Export données Organisateur**
  - CSV export : membres Communauté, historique événements, inscrits cumulés

- [ ] **Assistant IA basique**
  - Description événement, email invitation, suggestions Communauté
  - SDK Anthropic (Claude)

### Infrastructure / Qualité

- [ ] **Stratégie migrations DB + rollback production** — voir `spec/db-migration-rollback-strategy.md`
  - Baseline migrations Prisma (passer de `db:push` à `prisma migrate`)
  - Scripts `db:migrate`, `db:migrate:prod`, `db:migrate:status`, `db:snapshot`
  - Workflow pré-déploiement : snapshot Neon + Point-in-Time Restore comme filet
  - Validation titre événement dans les usecases (max 200 chars, actuellement front-only)
  - **Risque si non fait** : `db:push` peut silencieusement supprimer des données en prod (drop + recreate sur renommage de colonne)

- [ ] **Corriger les vulnérabilités de dépendances** 🔴
  - `pnpm audit` remonte 6 high + 5 moderate + 1 low (état au 2026-02-27)
  - Analyser (`pnpm audit --audit-level=high`), mettre à jour ou appliquer des overrides
  - Activer `pnpm audit --audit-level=high` en CI comme gate bloquant

- [ ] **Pre-commit hooks (Husky + lint-staged)**
  - Aucun hook git local actuellement — les erreurs TS/lint ne sont détectées qu'en CI
  - Hook `pre-commit` : typecheck + eslint sur fichiers modifiés
  - Hook `commit-msg` : validation format commits conventionnels

- [ ] **Retirer \****`unsafe-eval`**\*\* du Content Security Policy**
  - `script-src` inclut `'unsafe-eval'` — affaiblit la protection XSS
  - Solution : nonces CSP via middleware Next.js (`experimental.nonce`) pour une politique stricte
  - Tester en staging avant déploiement prod

- [ ] **CI/CD enrichi**
  - [x] Typecheck + tests unitaires sur chaque PR ✅
  - [x] DAST ZAP baseline hebdomadaire + full scan manuel ✅
  - [x] Release-please (changelog automatique) ✅
  - [ ] `pnpm audit --audit-level=high` comme gate bloquant
  - [ ] Tests d'intégration (job dédié avec service PostgreSQL GitHub Actions)
  - [ ] Lighthouse CI sur pages clés (`/m/[slug]`, `/`) — seuils : Performance ≥ 90, A11y ≥ 90

- [ ] **Rate limiting sur les actions sensibles**
  - Aucune protection contre les abus (inscription, création de Communauté, commentaires)
  - Solution : Upstash Rate Limit (Redis serverless, compatible Vercel Edge)
  - Limites suggérées : 10 inscriptions/min/IP, 5 créations/heure/user

- [x] **Tests unitaires complets** — 447 tests, 55 fichiers, tous usecases couverts (33 racine + 11 admin) ✅
- [x] **Tests de sécurité** — RBAC, IDOR cross-tenant, accès admin, avatar isolation, onboarding guards (99 tests dédiés sécurité) ✅
- [x] **Tests E2E Playwright** — 72 tests, 9 specs (auth, join-moment, host-flow, cancel-registration, comments, onboarding, waitlist, explore, dashboard-mode-switcher). Infrastructure `globalSetup` + `globalTeardown` (nettoyage propre des données `@test.playground` après chaque run). ✅
- [ ] **Accessibilité axe-core** dans Playwright

- [ ] **Bundle analyzer** (`@next/bundle-analyzer`)
  - Aucune visibilité sur la taille du bundle JS
  - Lancer ponctuellement après l'ajout de dépendances majeures (`pnpm analyze`)

- [ ] **Diagramme d'architecture**
  - L'architecture hexagonale est documentée textuellement dans CLAUDE.md mais sans schéma visuel
  - Créer un diagramme C4 niveau 2 ou schéma des couches dans `spec/architecture.md`
  - Utile pour l'onboarding de nouveaux contributeurs

---

## Phase 2 (post-MVP)

- [x] **Suivre une Communauté (Follow)** ✅ — implémenté en 2026-02-24 (commit `80a1390`)
  - Table `CircleFollow`, usecases `followCircle`/`unfollowCircle`, `FollowButton` avec 3 états (cloche/abonné·e/hover se désabonner)
  - Visible uniquement pour les utilisateurs connectés non-membres sur `/circles/[slug]`
  - Email aux followers à chaque nouvel événement, déduplication avec membres
  - **Option future** : préférences granulaires (opt-out), affichage sur page Découvrir

- [ ] Track (série d'événements récurrents dans une Communauté)
- [ ] Check-in (marquer présent sur place)
- [ ] **Galerie photos post-événement**
  - Les Participants et l'Organisateur peuvent uploader des photos après un événement PAST
  - Galerie visible sur la page publique `/m/[slug]` et sur la page Communauté (onglet dédié ou section en bas)
  - Upload via `StorageService` existant (Vercel Blob) — infrastructure déjà en place
  - Contraintes : formats JPEG/PNG/WebP, taille max (resize côté client), N photos max par événement
  - Option modération : l'Organisateur peut supprimer une photo
  - Viralité : lien partageable vers la galerie, CTA "Voir les photos" dans l'email post-événement
- [ ] **Radar concurrentiel à la création d'événement**
  - Lors de la création d'un événement (step date/lieu), afficher les événements publiés sur les plateformes concurrentes (Meetup, Luma, Eventbrite…) dans la même ville, au même créneau
  - **Objectif** : permettre à l'Organisateur d'identifier les conflits potentiels avec des événements qui ciblent la même audience, avant de publier
  - **Affichage** : section "Événements le même jour dans ta ville" dans le formulaire — liste compacte (titre, plateforme source, heure, nombre d'inscrits si disponible)
  - **Sources** : APIs publiques Meetup (`/find/events`), Eventbrite (`/events/search`), Luma (scraping ou API si disponible) — requêtes filtrées par `location` + `date range`
  - **Périmètre** : rayon configurable (ex: 20 km), même catégorie en priorité
  - **IA** : scoring de "risque de conflit" basé sur similarité de catégorie, audience cible, créneau horaire — suggestion de créneaux alternatifs moins concurrentiels
  - **Privacy** : données affichées en lecture seule, pas stockées — requêtes live à la saisie (debounce)
  - **Contraintes** : rate limits APIs tierces, certaines nécessitent une clé (Eventbrite), Luma sans API officielle

- [ ] Plan Pro (analytics, branding, IA avancée, API, multi-canal)
- [ ] **Emails de rappel pré-événement** (24h + 1h avant) — jobs planifiés Vercel Cron ou Upstash QStash, flags `reminder24hSentAt` / `reminder1hSentAt` sur `Moment`
- [ ] Visual regression testing (Chromatic/Percy)
- [ ] SAST/DAST (Snyk/SonarCloud)
- [ ] Load testing (k6/Artillery)
- [ ] Pentest externe

---

## Bugs connus

| # | Description | Statut | Détail |
| --- | --- | --- | --- |
| B-01 | OAuth Google bloquée depuis les navigateurs in-app (Instagram, WhatsApp, Facebook…) | ⚠️ Workaround utilisateur | Google refuse les WebViews (`Error 403: disallowed_useragent`). Fix possible : détecter le user-agent et afficher un message explicatif sur `/auth/error` à la place de l'erreur Google. |
| B-02 | Page `/changelog` — RangeError stack overflow en prod | ✅ Corrigé `3fd5a2b` | `readFileSync(CHANGELOG.md)` pouvait crasher si le fichier absent du bundle serverless Vercel → boucle error boundary React. Fix : `outputFileTracingIncludes` + try/catch. |
| B-03 | OAuth Google `redirect_uri_mismatch` pour certains users | ✅ Corrigé (config Vercel) | `AUTH_URL` absent → Auth.js utilisait `VERCEL_URL` ou le header `x-forwarded-host` de façon non déterministe. Fix : ajouter `AUTH_URL=https://the-playground.fr` dans les variables Vercel. |

---

## Décisions clés

| Date | Décision |
| --- | --- |
| 2026-02-19 | Usecases = fonctions (pas de classes) |
| 2026-02-19 | ActionResult pattern pour les server actions |
| 2026-02-19 | Slug généré dans le usecase (règle métier) |
| 2026-02-19 | Circle = Cercle en français (renommé en **Communauté** le 2026-02-22), Host/Player en anglais dans le code |
| 2026-02-20 | Host = Player + droits de gestion (rôle hiérarchique, une seule membership par user/circle) |
| 2026-02-20 | Neon branching dev/prod (`pnpm db:dev:reset` pour snapshot frais) |
| 2026-02-20 | Onboarding profil obligatoire au premier login |
| 2026-02-20 | Email non éditable dans le profil (clé unique Auth.js, pivot de liaison entre providers) |
| 2026-02-20 | Pas de merge/liaison manuelle de comptes dans le MVP (si emails différents = comptes différents) |
| 2026-02-20 | Positionnement clarifié : community-centric (modèle Meetup) + UX premium (expérience Luma) + 100% gratuit. La Communauté est l'entité centrale, l'événement est la porte d'entrée virale, la page Communauté est la couche de rétention (absente chez Luma). Dashboard Organisateur = Communauté-first. *(Terminologie FR mise à jour le 2026-02-22 : Cercle → Communauté, Escale → événement)* |
| 2026-02-20 | L'organisateur est automatiquement inscrit (REGISTERED) à l'événement qu'il crée — règle métier dans `createMoment`. |
| 2026-02-20 | Check-in retiré du MVP → Phase 2 (pas prioritaire pour le lancement) |
| 2026-02-20 | ~~La Carte = Circles uniquement (pas d'événements).~~ **Révisée le 2026-02-21** : La Carte = Circles + événements à venir de Circles publics. *(Renommé "Découvrir" le 2026-02-22)* |
| 2026-02-21 | Événements passés accessibles sur la page publique `/m/[slug]` (avec UI "Événement terminé"). Seuls les CANCELLED renvoient une 404. |
| 2026-02-21 | Page Communauté = même layout 2 colonnes que la page événement (cover gradient LEFT sticky, contenu RIGHT). Cohérence design inter-pages. |
| 2026-02-21 | Carte "Événement terminé" (vue publique événement passé) inclut un CTA "Voir les prochains événements de la Communauté" — rétention vers la Communauté. |
| 2026-02-21 | Fil de commentaires plat (pas de réponses imbriquées). Max 2000 chars. Tout utilisateur authentifié peut commenter, même sans être membre. Auteur et Organisateur peuvent supprimer. Sur événements PAST, le formulaire est masqué mais les commentaires restent visibles. |
| 2026-02-21 | Convention pérenne utilisateurs test : domaine `@test.playground` en dev ET en prod. Pas de champ DB supplémentaire. Suppression via `DELETE WHERE email LIKE '%@test.playground'`. |
| 2026-02-21 | Scripts données test : seed idempotent (`upsert` partout), cleanup avec flag `--execute` (dry-run par défaut). Variantes prod via scripts shell Neon (même pattern que `db-push-prod.sh`). Données FR uniquement (noms, lieux). |
| 2026-02-21 | Page profil : layout single-column centré (pas 2 colonnes), avatar + nom + email + stats en header, formulaire prénom/nom, meta rows read-only (email, membre depuis). Email retiré du formulaire (lecture seule dans meta row). |
| 2026-02-21 | Fils d'ariane : obligatoires sur toutes les pages dashboard sauf racine `/dashboard` et onboarding `profile/setup`. Pattern CSS unifié. |
| 2026-02-21 | Badges unifiés : fond plein (`default`) = engagement positif (Inscrit, Publié). Outline = tout le reste (Organisateur en `outline` + accent primary, Annulé en `outline` + accent destructive, Passé en `outline` neutre, Participant en `secondary`). |
| 2026-02-21 | Couleur unique : `--destructive` = `--primary` (même rose). Le danger est communiqué par le contexte (mot, modale), pas par une couleur différente. Approche Luma : un seul accent. |
| 2026-02-21 | Bouton Modifier : toujours `default` (rose plein) + `size="sm"` sur les pages de détail (Communauté et événement). Cohérence inter-pages. |
| 2026-02-21 | Analyse UX JTBD complète (spec/ux-parcours-jtbd.md) : 8 personas, 25 JTBD, 7 parcours. 4 casseurs de loop identifiés (emails transactionnels), 8 gaps haute priorité, 7 moyens. Ajoutés au backlog sous "Rétention & viralité". |
| 2026-02-21 | Découvrir (spec/feature-explorer-la-carte.md) : `/explorer` avec tabs Communautés + Événements, community-first, pas d'algorithme. Décision révisée : Découvrir = Communautés + événements à venir de Communautés publiques (pas Communautés uniquement). Métaphore : "répertoire de tous les possibles" = incarnation du nom Playground. Schema : `category` + `city` sur Communauté. Page Communauté publique `/circles/[slug]` pour le cold traffic et le SEO. |
| 2026-02-21 | Dashboard redesigné : pill tabs + timeline unifiée. Pas de CTAs dans les tab headers, uniquement dans les empty states. Page de consultation, pas de création. |
| 2026-02-21 | Terminologie i18n rebranding (intermédiaire). FR : Moment → **Escale** (féminin — Publiée, Annulée, Passée), S'inscrire → **Rejoindre**, Dashboard → **Mon Playground**. EN : Player → **Member**, Register → **Join**, Dashboard → **My Playground**. *(Terminologie FR finalisée le 2026-02-22 : Escale → événement, Mon Playground → Mon espace, Rejoindre → S'inscrire)* |
| 2026-02-21 | Le Répertoire renommé **La Carte** (FR) / **Explore** (EN). Route `/explorer` et namespace i18n `Explorer` inchangés. **La Boussole** réservée pour l'assistant IA (futur). *(La Carte renommée ****\*\*\*\*\*\*Découvrir****\*\*\*\*\*\* en FR le 2026-02-22)* |
| 2026-02-21 | Convention démo : domaine **`@demo.playground`** distinct de `@test.playground`. Démo = contenu réaliste pour présentation/validation produit. Test = données techniques pour QA/dev. Reset complet de base (dev + prod) via `prisma db push --force-reset` avant injection démo. |
| 2026-02-21 | Données démo : 6 Communautés publiques (TECH/Paris, DESIGN/Lyon, SPORT_WELLNESS/Paris, BUSINESS/Bordeaux, ART_CULTURE/Nantes, SCIENCE_EDUCATION/online), 20 users FR, 30 événements (1 passé + 4 à venir par Communauté), ratio 20%/80%, contenu entièrement en français. |
| 2026-02-21 | Emails transactionnels : envoyés depuis les server actions (pas les usecases). Usecases restent purs (pas de side effects). Fire-and-forget (si email échoue, inscription réussit). Traductions i18n résolues dans le flux principal avant le fire-and-forget. Port `EmailService` avec 8 méthodes + adapter `ResendEmailService` (Resend + react-email). 4 emails MVP : confirmation inscription, confirmation liste d'attente, promotion liste d'attente, notification Organisateur. |
| 2026-02-21 | Agents Claude Code : définis dans `.claude/agents/` (gitignored). `test-coverage-guardian` — audit usecase vs test, création des manquants, run en boucle jusqu'à 100% vert. `security-guardian` — cartographie des points d'autorisation, tests RBAC/IDOR/admin, correction des vulnérabilités réelles dans le code source si détectées. Pattern : lancer en worktree isolé pour zéro risque sur main. |
| 2026-02-21 | Sécurité — defense-in-depth : les usecases admin ne doivent PAS faire confiance à la couche action seule. Chaque usecase admin accepte `callerRole: UserRole` et lève `AdminUnauthorizedError` si `callerRole !== "ADMIN"`. Principe : la sécurité est dans le domaine, pas uniquement à la périphérie. |
| 2026-02-21 | Observation architecturale : les pages admin (`/admin/*.tsx`) appellent `prismaAdminRepository` directement (sans passer par les usecases). Elles sont protégées par le layout guard mais ne bénéficient pas de la defense-in-depth des usecases. À adresser post-MVP. |
| 2026-02-22 | Terminologie FR simplifiée pour accessibilité : Cercle → **Communauté** (féminin), Escale → **événement** (masculin : Publié, Annulé, Passé), Mon Playground → **Mon espace**, La Carte → **Découvrir**, Rejoindre → **S'inscrire**. Code identifiers, clés JSON et noms de fichiers restent en anglais. EN inchangé. Motivation : termes plus accessibles pour les utilisateurs non familiers avec les concepts Meetup/Luma. |
| 2026-02-23 | CoverImagePicker — photos d'ouverture = **random Unsplash** (8 thématiques fixes : technology, design studio, business meeting, fitness sport, art painting, science laboratory, community people, nature landscape). Route `/api/unsplash/random` : 8 appels `/photos/random` en parallèle. Résultat mis en cache côté composant (pas de re-fetch aux réouvertures). Abandonne les photos curées statiques par catégorie (fragiles, non représentatives). |
| 2026-02-23 | CoverImagePicker — **Radix UI mode contrôlé** : en mode `open` contrôlé, changer l'état `open` programmatiquement via `setOpen(false)` ne déclenche PAS le callback `onOpenChange`. Pour garantir le reset de l'état interne, toujours passer par la fonction `handleOpenChange`. Règle : `handleApply` et `handleRemove` appellent `handleOpenChange(false)`, jamais `setOpen(false)` directement. |
| 2026-02-23 | CoverImagePicker — **pagination search** : navigation prev/next (remplace les photos en place) plutôt qu'un "Voir plus" (qui agrandissait la modale). Le param `page` est propagé à la route `/api/unsplash/search`. |
| 2026-02-28 | **Dashboard Mode Switcher** : enum `DashboardMode` (`PARTICIPANT` / `ORGANIZER`) sur `User`. Persisté en DB et en session Auth.js. Pill switcher dans le header du dashboard (client component). Le mode contrôle le contenu affiché (vue Participant = événements inscrits / vue Organisateur = événements créés + CTAs). Transition via URL param `?mode=participant\|organizer` + `setDashboardModeAction` en background. |
| 2026-02-28 | **Welcome page redesignée** : deux cartes cliquables ("Je participe" / "J'organise") remplacent les deux cartes CTA statiques ("Créer ma Communauté" / "Découvrir des Communautés"). Le choix persiste en DB. Trigger : `dashboardMode === null` ET aucune activité. Utilisateurs existants avec activité mais sans mode → PARTICIPANT par défaut (évite boucle infinie). |
| 2026-02-28 | **CTA Créer un événement adaptatif** : `CreateMomentButton` (Server Component) adapte le CTA selon le nombre de Communautés hébergées — 0 → redirect `/circles/new`, 1 → lien direct, 2+ → `CreateMomentDropdown` (Popover). |
| 2026-02-28 | **Infrastructure E2E — globalTeardown** : `tests/e2e/global-teardown.ts` ajouté dans `playwright.config.ts`. Nettoyage propre des données `@test.playground` après chaque run E2E (Moments → Circles → Users, dans l'ordre des contraintes FK). Le prochain run repart d'un état propre via `globalSetup`. |
| 2026-02-28 | **Données démo enrichies** : `thomas@demo.playground` ajouté dans `db-seed-demo-data.ts` — user "blank slate" avec `dashboardMode: null` (reset à chaque run du seed). Permet de tester le flux welcome page en prod sans créer un compte. |
