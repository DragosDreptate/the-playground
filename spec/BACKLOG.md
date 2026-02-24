# Backlog — The Playground

> Ce fichier est tenu à jour avec les décisions prises au fil du développement.
> Il fait foi pour le périmètre restant du MVP et les évolutions futures.

---

## Fait

| Feature | Date | Commit |
|---------|------|--------|
| Auth (magic link + OAuth Google/GitHub) | 2026-02-19 | — |
| CRUD Circle (domain, tests, UI, i18n) | 2026-02-19 | `dd41709` |
| Design system Cyberpunk + dark/light toggle | 2026-02-19 | `2250774` |
| CRUD Moment (domain, tests, UI, i18n, page publique `/m/[slug]`) | 2026-02-20 | `7c507cb` |
| Refactor membership : Host extends Player | 2026-02-20 | `d9139f4` |
| Neon branching dev/prod + script `db:dev:reset` | 2026-02-20 | `036d93e` |
| Profil utilisateur + onboarding obligatoire au premier login | 2026-02-20 | `fd024a7` |
| Registration : `JoinMoment` (inscription + auto-join Circle + liste d'attente) | 2026-02-20 | non commité |
| Registration : `CancelRegistration` (annulation + promotion liste d'attente) | 2026-02-20 | non commité |
| Registration : `GetMomentRegistrations`, `GetUserRegistration` | 2026-02-20 | non commité |
| Page publique `/m/[slug]` : bouton inscription fonctionnel (`RegistrationButton`, `RegistrationsList`) | 2026-02-20 | non commité |
| Dashboard Player-first : `GetUserCirclesWithRole`, `GetUserUpcomingMoments` | 2026-02-20 | non commité |
| Dashboard Player-first : section "Mes prochaines Escales" + "Mes Cercles" avec badge rôle | 2026-02-20 | non commité |
| Dev tooling : seed 3 utilisateurs test (host/player1/player2) + route GET d'impersonation (dev-only) | 2026-02-20 | `c862293` |
| Sécurité dashboard : pages Circle/Moment vérifient le rôle — Participants voient la vue publique, contrôles Organisateur masqués | 2026-02-20 | `c862293` |
| Règle métier : blocage inscription si Moment déjà commencé (`MomentAlreadyStartedError`) + transition auto PUBLISHED→PAST | 2026-02-20 | `c862293` |
| Bug fix : ré-inscription après annulation met à jour la ligne existante (pas de doublon) | 2026-02-20 | `c862293` |
| Tests : 21 nouveaux tests couvrant le cycle de vie de l'inscription (re-register, capacité, flux croisés) | 2026-02-20 | `c862293` |
| Monitoring : Sentry (error tracking client/server/edge) + Vercel Analytics + SpeedInsights | 2026-02-21 | `c862293` + `2dde4cc` |
| Page Moment unifiée : composant `MomentDetailView` partagé entre vue publique et vue Organisateur | 2026-02-21 | `e867ba0` |
| Page Circle redesignée : layout 2 colonnes aligné sur Moment (cover gradient, hosts, stats) | 2026-02-21 | `0deec99` |
| Timeline Escales sur page Circle : toggle "À venir / Passés" (URL param `?tab=past`) + fil d'ariane avec dates | 2026-02-21 | `0deec99` |
| Statut inscription dans la timeline : dot coloré (rose/amber) + badge (Inscrit / Liste d'attente) | 2026-02-21 | `b9a9993` |
| Formulaire Moment : auto-sync date de fin = date de début à la sélection | 2026-02-21 | `0deec99` |
| Indicateurs Escale passée : cover grisée + badge "Passé" overlay + banner contextuel + carte "Événement terminé" avec CTA rétention Circle | 2026-02-21 | `488ddb8` |
| Fil de commentaires sur Escale : `CommentThread` (plat, chronologique) sur pages publique + dashboard Organisateur/Participant | 2026-02-21 | non commité |
| Scripts données test : `db:seed-test-data` (réaliste, idempotent, FR) + `db:cleanup-test-data` (dry-run par défaut) + variantes prod | 2026-02-21 | non commité |
| Redesign page profil : layout single-column centré, avatar header, stats inline, meta rows (email, membre depuis), formulaire simplifié | 2026-02-21 | `7142585` |
| Fils d'ariane cohérents sur toutes les pages dashboard (6 pages ajoutées/complétées) | 2026-02-21 | `313473e` |
| Harmonisation badges : Annulé → outline destructive, Organisateur → outline primary partout, Participant → secondary partout | 2026-02-21 | `8d7b76b` |
| Couleur destructive = primary (une seule couleur accent rose, danger communiqué par le contexte) | 2026-02-21 | `75fd383` |
| Bouton Modifier unifié : default (rose plein) sur pages Circle et Escale | 2026-02-21 | `295575d` |
| Le Répertoire : `/explorer` (tabs Cercles/Événements, filtre catégorie) + page Circle publique `/circles/[slug]` + champs `category`/`city` sur Circle | 2026-02-21 | `c3813e7` |
| Dashboard redesigné : pill tabs (Mes Escales / Mes Cercles), timeline unifiée (upcoming + past), `DashboardMomentCard` avec `CircleAvatar`, empty states CTA | 2026-02-21 | — |
| `CircleMembersList` : section membres sur page Circle (Organisateurs avec Crown, emails visibles Organisateur-only via `variant`) | 2026-02-21 | — |
| Terminologie i18n : FR Moment → **Escale**, S'inscrire → **Rejoindre**, Dashboard → **Mon Playground** / EN Player → **Member**, Register → **Join**, Dashboard → **My Playground** | 2026-02-21 | — |
| Renommage Répertoire → **La Carte** (FR) / **Explore** (EN). Route `/explorer` inchangée. | 2026-02-21 | — |
| Homepage redesignée : hero split-screen (texte + mockup iPhone 3D tilt), section "Comment ça marche" (3 étapes), 3 piliers, CTA final, footer — i18n FR/EN complet | 2026-02-21 | — |
| Scripts données démo : `db:seed-demo-data` (6 Circles, 20 users `@demo.playground`, 30 Escales 80%/20%, FR, idempotent) + `db:cleanup-demo-data` (dry-run par défaut) + variantes prod | 2026-02-21 | `0fa65f0` |
| Admin plateforme : dashboard stats, listes paginées (Users/Circles/Moments) avec recherche, pages détail, suppression, forcer annulation Moment. Middleware guard `/admin/*`, `UserRole` (USER/ADMIN), lien Admin dans UserMenu, i18n FR/EN complet | 2026-02-21 | `dbe3dda` |
| Emails transactionnels (Resend + react-email) : confirmation inscription, confirmation liste d'attente, promotion liste d'attente, notification Organisateur nouvelle inscription. Port `EmailService` + adapter `ResendEmailService`. Templates React avec calendar badge (gradient rose→violet). Fire-and-forget depuis server actions. i18n FR/EN complet. | 2026-02-21 | — |
| Email notification Organisateur : nouveau commentaire sur un événement (`host-new-comment` template, `sendHostNewComment` sur `EmailService`, déclenché depuis `addCommentAction`, fire-and-forget, i18n FR/EN `Email.commentNotification.*`). | 2026-02-24 | `f29287b` |
| Couverture tests complète : 14 nouveaux fichiers (get-user-registration, get-moment-comments, get-user-past-moments, 11 usecases admin). 5 specs E2E scaffoldées (auth, join-moment, host-flow, cancel-registration, comments). 202 tests, 100% verts. | 2026-02-21 | `3ee4865` |
| Suppression de compte utilisateur : usecase `deleteAccount` (cascade Circle si seul Organisateur), server action `deleteAccountAction`, section "Zone de danger" sur la page profil avec confirmation modale. i18n FR/EN `Profile.deleteAccount.*`. | 2026-02-22 | — |
| Agents Claude Code : `test-coverage-guardian` (audit couverture + création tests manquants, run + correction en boucle) + `security-guardian` (audit RBAC/IDOR/accès admin, création tests sécurité, correction vulnérabilités). Définis dans `.claude/agents/`. | 2026-02-21 | — |
| Sécurité : audit complet + correction vulnérabilité architecturale (defense-in-depth manquante sur 11 usecases admin). Ajout `callerRole: UserRole` + `AdminUnauthorizedError`. 59 nouveaux tests de sécurité (RBAC, IDOR cross-tenant, accès admin). 271 tests au total à ce stade, 100% verts. | 2026-02-21 | `8b14aaf` |
| Upload d'avatar utilisateur : port `StorageService` (hexagonal), adapter `VercelBlobStorageService` (@vercel/blob), helper `isUploadedUrl`, helper `resizeImage` (Canvas API, crop carré centré, WebP 384×384 ~50 Ko), server action `uploadAvatarAction`, composant `AvatarUpload` (hover overlay + lien texte conditionnel, preview optimiste, spinner), protection OAuth (ne pas écraser avatar uploadé), i18n FR/EN `Profile.avatar.*`, tests `blob.test.ts` + cas image dans `update-profile.test.ts`. AvatarUpload intégré aussi sur la page d'onboarding `/dashboard/profile/setup`. | 2026-02-22 | `aa84d5c` |
| Isolation onboarding via route groups Next.js : `(app)/layout.tsx` (layout complet : SiteHeader + SiteFooter) + `(onboarding)/layout.tsx` (layout minimal : logo statique non-cliquable, LocaleToggle + ThemeToggle uniquement, pas de footer). Suppression de la prop `hideNav` du SiteHeader. Tests E2E (`onboarding.spec.ts`, 6 tests) + `playwright.config.ts` + script `test:e2e:setup-onboarding`. TDD : tests écrits en RED, puis implémentation, puis GREEN. | 2026-02-22 | `7c57b8d` |
| Audit sécurité (security-guardian) : 20 nouveaux tests de sécurité. `avatar-upload-isolation.test.ts` (5 tests IDOR/userId isolation) + `onboarding-guard.test.ts` (15 tests anti-boucle, transitions d'état, cas limites). Aucune vulnérabilité détectée dans le code source. À ce stade : 303 tests, 46 fichiers, 100% verts. | 2026-02-22 | — |
| Footer global (`SiteFooter`) + pages légales : mentions légales `/legal/mentions-legales`, confidentialité `/legal/confidentialite`, CGU `/legal/cgu`. i18n FR/EN complet (namespaces `Footer` + `Legal`). | 2026-02-22 | `da1c2e8` |
| Magic link email : template react-email avec icône PNG embarquée en base64 (gradient + triangle play). Zéro dépendance réseau pour le rendu. | 2026-02-22 | `f27fee9` |
| OpenGraph + SEO : images OG dynamiques (homepage, événement, Communauté), `metadataBase`, `generateMetadata`, `robots.ts`, `sitemap.ts`. | 2026-02-22 | — |
| Mobile responsive : hamburger menu (DropdownMenu), cards compactes Explorer, footer responsive, hero centrage, tabs responsive. | 2026-02-22 | — |
| Terminologie FR simplifiée pour accessibilité : Cercle → **Communauté**, Escale → **événement** (masculin), Mon Playground → **Mon espace**, La Carte → **Découvrir**, Rejoindre → **S'inscrire**. Code/clés JSON inchangés. EN inchangé. | 2026-02-22 | — |
| Cover Circle : `CoverImagePicker` (tabs Photos Unsplash + Importer), server action `processCoverImage` dans `cover-image.ts`, champs `coverImage`/`coverImageAttribution` sur Circle (DB + domaine), API proxy Unsplash `/api/unsplash/search`, affichage sur 5 emplacements, attribution "Photo par [Nom] sur Unsplash". | 2026-02-23 | — |
| Cover Moment : mêmes champs `coverImage`/`coverImageAttribution` sur Moment (DB + domaine), même composant `CoverImagePicker`, même server action `processCoverImage`, affichage sur pages publique et Organisateur. | 2026-02-23 | — |
| CoverImagePicker — photos aléatoires Unsplash à l'ouverture : suppression des photos curées statiques, nouvelle route `/api/unsplash/random` (8 appels parallèles `/photos/random`, 1 par thématique, cache `s-maxage=300`), skeleton 8 cases pendant le chargement, `defaultPhotos` mis en cache entre les ouvertures. | 2026-02-23 | `dcd2c6c` |
| CoverImagePicker — pagination recherche : remplacement du bouton "Voir plus" (qui agrandissait la modale) par une navigation prev/next qui remplace les photos sans changer la taille de la modale. | 2026-02-23 | — |
| CoverImagePicker — fix state reset : `handleApply` et `handleRemove` appelaient `setOpen(false)` directement (bypasse `onOpenChange` en mode contrôlé Radix), laissant `pending` stale. Corrigé en appelant `handleOpenChange(false)` pour garantir le reset complet. Fix parallèle : le bouton déclencheur appelait `setOpen(true)` au lieu de `handleOpenChange(true)`, empêchant le fetch des photos aléatoires. | 2026-02-23 | `e1131ef`, `9d5cfde` |

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

- [ ] ~~**Email de rappel pré-événement**~~ → **déprioritisé, post-MVP** (voir Phase 2)
  - Rappel 24h avant + rappel 1h avant — nécessite une infrastructure de jobs planifiés (Vercel Cron / QStash)
  - Complexité d'implémentation disproportionnée pour le MVP

- [x] **Email de promotion liste d'attente** (MVP-3 — parcours C) ✅
  - Déclenché par `CancelRegistration` quand un inscrit se désiste et promeut un waitlisté
  - Contenu : "Votre place est confirmée", détails de l'événement

- [x] **Email de notification Organisateur : nouvelle inscription** (MVP-4 — parcours D) ✅
  - Déclenché par chaque `JoinMoment` sur un événement dont l'utilisateur est Organisateur
  - Contenu : nom du nouvel inscrit, total inscrits / places restantes, lien vers gestion
  - Skip quand l'Organisateur s'inscrit lui-même

- [x] **Architecture email multi-canal** (infrastructure) ✅
  - Port `EmailService` (3 méthodes) + adapter `ResendEmailService`
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
  - Rétention Circle depuis la porte d'entrée virale

#### Engagement post-événement — fenêtre d'or 24h (parcours F)

- [ ] **L'Organisateur peut commenter sur un événement PAST** (gap H-1 — critique)
  - Actuellement : formulaire masqué pour tous sur PAST, y compris l'Organisateur
  - Décision à prendre : débloquer pour l'Organisateur uniquement, ou pour tous
  - Impact : l'Organisateur ne peut pas remercier sa communauté, pic d'engagement manqué

- [ ] **CTA "Créer le prochain événement" depuis un événement PAST** (gap H-2)
  - Sur la page événement PAST, vue Organisateur : bouton "Programmer le prochain événement"
  - Pré-remplit le formulaire avec le même Circle
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
  - Dashboard vide (nouveau user, aucun Circle) : remplacer le simple bouton "Créer une Communauté"
  - Proposition : stepper 3 étapes — "Créez votre Communauté → Créez votre premier événement → Partagez le lien"
  - Objectif : réduire le time-to-first-event à < 5 minutes

- [ ] **CTA "Devenir organisateur" pour Participants** (gap H-5)
  - Sur le dashboard d'un Participant sans Communauté : lien/bouton "Vous voulez organiser ? Créez votre Communauté"
  - Actuellement invisible pour un Participant qui découvre la plateforme via un événement

#### Accueil utilisateur direct — sans lien d'entrée

> Un utilisateur qui s'inscrit sans lien d'événement ni de Communauté ne sait pas où aller.
> Le dashboard vide est silencieux — il faut l'orienter activement.

- [x] **Page de bienvenue `/dashboard/welcome`** ✅
  - **Trigger** : accès à `/dashboard/welcome` si l'utilisateur n'a aucune activité (aucun Circle créé, aucune Registration). Redirect vers `/dashboard` si activité détectée.
  - **Persistance basée sur l'état** — pas de flag DB. La page redirige vers `/dashboard` dès qu'il a un Circle ou une Registration.
  - **Contenu** : message d'accueil personnalisé (prénom) + 2 cartes CTA :
    1. **Créer ma Communauté** (`default` / primary) → `/dashboard/circles/new`
    2. **Découvrir des Communautés** (`outline`) → `/explorer`
  - **Phase 2 — hors scope MVP** : email de re-engagement si N jours sans activité après le welcome

#### Gestion des inscriptions Organisateur (parcours E)

- [ ] **Export CSV des inscrits** (gap E-3 + déjà au backlog)
  - Depuis la page événement Organisateur : bouton "Exporter la liste"
  - Colonnes : nom, email, statut (REGISTERED/WAITLISTED), date d'inscription
  - Besoin logistique réel (badges, listes d'émargement, suivi)

- [ ] **Vue segmentée inscrits/liste d'attente sur page événement Organisateur** (gap H-8 + M-5)
  - Compteur "X inscrits confirmés · Y en attente · Z places restantes" en haut de page
  - Liste séparée en deux sections : Inscrits / Liste d'attente
  - Actuellement : liste unique sans distinction claire

---

### Personnalisation visuelle — avatars & covers

> Directement lié au principe "design premium par défaut" et à l'identité des communautés.
> Les gradients générés sont de bons fallbacks, mais les Organisateurs doivent pouvoir personnaliser leur Communauté.

- [x] **Avatar utilisateur** ✅ — upload photo de profil (Vercel Blob, resize Canvas WebP 384×384)

- [x] **Cover Circle** ✅ — image personnalisée de la Communauté (Vercel Blob, Unsplash via proxy + upload local)
  - Champs `coverImage: String?` + `coverImageAttribution: Json?` sur `Circle` (DB + domaine)
  - Composant `CoverImagePicker` : dialog tabs "Photos Unsplash" + "Importer" (drag-and-drop, resize client-side)
    - Onglet Photos : 8 photos aléatoires Unsplash à l'ouverture (1/thématique, via `/api/unsplash/random`, chargées en parallèle, mises en cache) + recherche paginée prev/next
    - Onglet Importer : drag-and-drop ou sélection fichier, validation client (5 Mo, JPG/PNG/WebP), resize Canvas → WebP
  - Server action `processCoverImage` dans `src/app/actions/cover-image.ts` (partagée Circle + Moment)
  - Affiché sur page Circle publique, page Circle dashboard, `CircleCard`, `PublicCircleCard`, `CircleAvatar`
  - Attribution Unsplash : "Photo par [Nom] sur Unsplash"
  - Fallback : gradient actuel si pas d'image
  - Cleanup Vercel Blob de l'ancienne image lors du remplacement ou de la suppression

- [x] **Cover événement** ✅ — image de couverture de l'événement (Vercel Blob, Unsplash via proxy + upload local)
  - Champs `coverImage: String?` + `coverImageAttribution: Json?` sur `Moment` (DB + domaine)
  - Même composant `CoverImagePicker` que pour le Circle (même server action `processCoverImage`)
  - Affiché en bannière sur la page publique `/m/[slug]` et la vue Organisateur
  - Fallback : gradient actuel si pas d'image

- [x] **Infrastructure upload** ✅ (prérequis commun aux covers Circle/événement)
  - Port `StorageService` + adapter `VercelBlobStorageService` (@vercel/blob)
  - Contraintes : taille max 5 Mo, formats JPEG/PNG/WebP, redimensionnement Canvas côté client (WebP 384×384)

---

### Priorité haute (bloquant pour le lancement)

- [x] **Admin plateforme** ✅
  - Pages `/admin/*` (même stack, shadcn)
  - Dashboard stats + listes paginées + détail + suppression (Users, Circles, Moments)
  - Forcer annulation Moment
  - Champ `role` (USER/ADMIN) sur User, middleware guard sur `/admin/*`

- [ ] **Outils Organisateur enrichis**
  - Co-Organisateurs (plusieurs HOST par Circle)
  - Gestion membres (inviter, retirer)
  - Stats Circle basiques

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
  - Page Circle publique `/circles/[slug]` accessible sans compte (SEO + cold traffic)
  - Lien "Explorer" dans le header principal (visible utilisateurs connectés)
  - Schema : `CircleCategory` enum (8 valeurs) + `category` + `city` sur Circle
  - Formulaire Circle : Select catégorie + Input ville
  - 10 nouveaux tests unitaires BDD (`getPublicCircles`, `getPublicUpcomingMoments`)

### Priorité moyenne

- [ ] **Email aux membres : nouvel événement dans leur Communauté** (gap M-4)
  - Notifier tous les membres d'une Communauté quand l'Organisateur programme un nouvel événement
  - Contenu : titre, date, lieu, description courte, CTA "S'inscrire" → `/m/[slug]`
  - Sans cette notification, les membres ne reviennent que s'ils pensent à vérifier — ce push est le principal levier de rétention
  - **❓ Décision ouverte : automatique ou manuel ?**
    - **Contexte modèle actuel** : il n'existe pas de statut `DRAFT` — les statuts sont `PUBLISHED` / `CANCELLED` / `PAST`. Un événement est créé directement en `PUBLISHED`. Création = publication, ce sont le même moment.
    - **Automatique à la création** (= à la publication aujourd'hui) : zéro friction, mais l'Organisateur ne peut pas corriger une erreur avant que les membres soient notifiés
    - **Manuel** (bouton "Notifier les membres" sur la page événement) : l'Organisateur contrôle le moment d'envoi — mais étape supplémentaire qu'il peut oublier
    - **Hybride** (envoi automatique à la publication, re-notification manuelle possible) : nécessite d'introduire un statut `DRAFT` — changement de modèle non négligeable, à peser par rapport au bénéfice
    - **Recommandation court terme** : automatique à la création (simple, cohérent avec le modèle actuel), avec un délai de grâce de quelques minutes pour annulation ("Annuler l'envoi" façon Gmail)
  - Dépend de l'infrastructure email existante (`ResendEmailService`, `EmailService` port) — réutilisable directement
  - Option future : préférence par membre (opt-out des notifications Communauté)
  - Prérequis si hybride retenu : ajouter `DRAFT` à `MomentStatus` (DB + domaine + UI)

- [ ] **Export données Organisateur**
  - CSV export : membres Circle, historique événements, inscrits cumulés

- [ ] **Assistant IA basique**
  - Description événement, email invitation, suggestions Communauté
  - SDK Anthropic (Claude)

### Infrastructure / Qualité

- [ ] **Stratégie migrations DB + rollback production** — voir `spec/db-migration-rollback-strategy.md`
  - Baseline migrations Prisma (passer de `db:push` à `prisma migrate`)
  - Scripts `db:migrate`, `db:migrate:prod`, `db:migrate:status`, `db:snapshot`
  - Workflow pré-déploiement : snapshot Neon + Point-in-Time Restore comme filet
  - Validation titre événement dans les usecases (max 200 chars, actuellement front-only)
- [ ] **CI/CD GitHub Actions** (typecheck, tests, pnpm audit, Lighthouse CI)
- [x] **Tests unitaires complets** — 333 tests, 47 fichiers, tous usecases couverts (25 racine + 11 admin) ✅
- [x] **Tests de sécurité** — RBAC, IDOR cross-tenant, accès admin, avatar isolation, onboarding guards (79 tests dédiés sécurité) ✅
- [ ] **Tests E2E Playwright** — 8 specs (auth, join-moment, host-flow, cancel-registration, comments, onboarding, waitlist, explore). `onboarding.spec.ts` : 6/6 green. Les 7 autres à brancher sur environnement de test.
- [ ] **Accessibilité axe-core** dans Playwright

---

## Phase 2 (post-MVP)

- [ ] **Suivre une Communauté (Follow)** — non-membre notifié lors d'un nouvel événement
  - Un utilisateur peut "suivre" une Communauté dont il n'est pas encore membre
  - **Effet** : reçoit un email à chaque nouvel événement PUBLISHED dans cette Communauté (même template que "Email aux membres : nouvel événement")
  - **UI** : icône cloche 🔔 sur la page Circle publique (`/circles/[slug]`) et page Découvrir — toggle actif/inactif, comme le bouton "Follow" LinkedIn
  - **Distinct du membership** : follow = abonnement notifications uniquement, pas membre du Circle. L'inscription à un événement reste le seul chemin vers le membership (règle inchangée)
  - **Data model** : nouvelle table `CircleFollow` (`userId`, `circleId`, `createdAt`) — contrainte unique, index sur `circleId` pour les lookups batch au moment de l'envoi
  - **Désabonnement** : même cloche (toggle off) + lien "Se désabonner" dans le footer de l'email
  - **Option future** : préférences granulaires (ex: seulement événements en présentiel, seulement certaines catégories)

- [ ] Track (série d'événements récurrents dans un Circle)
- [ ] Check-in (marquer présent sur place)
- [ ] **Galerie photos post-événement**
  - Les Participants et l'Organisateur peuvent uploader des photos après un événement PAST
  - Galerie visible sur la page publique `/m/[slug]` et sur la page Circle (onglet dédié ou section en bas)
  - Upload via `StorageService` existant (Vercel Blob) — infrastructure déjà en place
  - Contraintes : formats JPEG/PNG/WebP, taille max (resize côté client), N photos max par événement
  - Option modération : l'Organisateur peut supprimer une photo
  - Viralité : lien partageable vers la galerie, CTA "Voir les photos" dans l'email post-événement
- [ ] Plan Pro (analytics, branding, IA avancée, API, multi-canal)
- [ ] **Emails de rappel pré-événement** (24h + 1h avant) — jobs planifiés Vercel Cron ou Upstash QStash, flags `reminder24hSentAt` / `reminder1hSentAt` sur `Moment`
- [ ] Visual regression testing (Chromatic/Percy)
- [ ] SAST/DAST (Snyk/SonarCloud)
- [ ] Load testing (k6/Artillery)
- [ ] Pentest externe

---

## Décisions clés

| Date | Décision |
|------|----------|
| 2026-02-19 | Usecases = fonctions (pas de classes) |
| 2026-02-19 | ActionResult pattern pour les server actions |
| 2026-02-19 | Slug généré dans le usecase (règle métier) |
| 2026-02-19 | Circle = Cercle en français (renommé en **Communauté** le 2026-02-22), Host/Player en anglais dans le code |
| 2026-02-20 | Host = Player + droits de gestion (rôle hiérarchique, une seule membership par user/circle) |
| 2026-02-20 | Neon branching dev/prod (`pnpm db:dev:reset` pour snapshot frais) |
| 2026-02-20 | Onboarding profil obligatoire au premier login |
| 2026-02-20 | Email non éditable dans le profil (clé unique Auth.js, pivot de liaison entre providers) |
| 2026-02-20 | Pas de merge/liaison manuelle de comptes dans le MVP (si emails différents = comptes différents) |
| 2026-02-20 | Positionnement clarifié : community-centric (modèle Meetup) + UX premium (expérience Luma) + 100% gratuit. Circle = entité centrale, événement = porte d'entrée virale, page Communauté = couche de rétention (absente chez Luma). Dashboard Organisateur = Communauté-first. *(Terminologie FR mise à jour le 2026-02-22 : Cercle → Communauté, Escale → événement)* |
| 2026-02-20 | L'organisateur est automatiquement inscrit (REGISTERED) à l'événement qu'il crée — règle métier dans `createMoment`. |
| 2026-02-20 | Check-in retiré du MVP → Phase 2 (pas prioritaire pour le lancement) |
| 2026-02-20 | ~~La Carte = Circles uniquement (pas d'événements).~~ **Révisée le 2026-02-21** : La Carte = Circles + événements à venir de Circles publics. *(Renommé "Découvrir" le 2026-02-22)* |
| 2026-02-21 | Événements passés accessibles sur la page publique `/m/[slug]` (avec UI "Événement terminé"). Seuls les CANCELLED renvoient une 404. |
| 2026-02-21 | Page Circle = même layout 2 colonnes que Moment (cover gradient LEFT sticky, contenu RIGHT). Cohérence design inter-pages. |
| 2026-02-21 | Carte "Événement terminé" (vue publique événement passé) inclut un CTA "Voir les prochains événements de la Communauté" — rétention vers le Circle. |
| 2026-02-21 | Fil de commentaires plat (pas de réponses imbriquées). Max 2000 chars. Tout utilisateur authentifié peut commenter, même sans être membre. Auteur et Organisateur peuvent supprimer. Sur événements PAST, le formulaire est masqué mais les commentaires restent visibles. |
| 2026-02-21 | Convention pérenne utilisateurs test : domaine `@test.playground` en dev ET en prod. Pas de champ DB supplémentaire. Suppression via `DELETE WHERE email LIKE '%@test.playground'`. |
| 2026-02-21 | Scripts données test : seed idempotent (`upsert` partout), cleanup avec flag `--execute` (dry-run par défaut). Variantes prod via scripts shell Neon (même pattern que `db-push-prod.sh`). Données FR uniquement (noms, lieux). |
| 2026-02-21 | Page profil : layout single-column centré (pas 2 colonnes), avatar + nom + email + stats en header, formulaire prénom/nom, meta rows read-only (email, membre depuis). Email retiré du formulaire (lecture seule dans meta row). |
| 2026-02-21 | Fils d'ariane : obligatoires sur toutes les pages dashboard sauf racine `/dashboard` et onboarding `profile/setup`. Pattern CSS unifié. |
| 2026-02-21 | Badges unifiés : fond plein (`default`) = engagement positif (Inscrit, Publié). Outline = tout le reste (Organisateur en `outline` + accent primary, Annulé en `outline` + accent destructive, Passé en `outline` neutre, Participant en `secondary`). |
| 2026-02-21 | Couleur unique : `--destructive` = `--primary` (même rose). Le danger est communiqué par le contexte (mot, modale), pas par une couleur différente. Approche Luma : un seul accent. |
| 2026-02-21 | Bouton Modifier : toujours `default` (rose plein) + `size="sm"` sur les pages de détail (Circle et événement). Cohérence inter-pages. |
| 2026-02-21 | Analyse UX JTBD complète (spec/ux-parcours-jtbd.md) : 8 personas, 25 JTBD, 7 parcours. 4 casseurs de loop identifiés (emails transactionnels), 8 gaps haute priorité, 7 moyens. Ajoutés au backlog sous "Rétention & viralité". |
| 2026-02-21 | Découvrir (spec/feature-explorer-la-carte.md) : `/explorer` avec tabs Communautés + Événements, community-first, pas d'algorithme. Décision révisée : Découvrir = Circles + événements à venir de Circles publics (pas Circles uniquement). Métaphore : "répertoire de tous les possibles" = incarnation du nom Playground. Schema : `category` + `city` sur Circle. Page Circle publique `/circles/[slug]` pour le cold traffic et le SEO. |
| 2026-02-21 | Dashboard redesigné : pill tabs + timeline unifiée. Pas de CTAs dans les tab headers, uniquement dans les empty states. Page de consultation, pas de création. |
| 2026-02-21 | Terminologie i18n rebranding (intermédiaire). FR : Moment → **Escale** (féminin — Publiée, Annulée, Passée), S'inscrire → **Rejoindre**, Dashboard → **Mon Playground**. EN : Player → **Member**, Register → **Join**, Dashboard → **My Playground**. *(Terminologie FR finalisée le 2026-02-22 : Escale → événement, Mon Playground → Mon espace, Rejoindre → S'inscrire)* |
| 2026-02-21 | Le Répertoire renommé **La Carte** (FR) / **Explore** (EN). Route `/explorer` et namespace i18n `Explorer` inchangés. **La Boussole** réservée pour l'assistant IA (futur). *(La Carte renommée **Découvrir** en FR le 2026-02-22)* |
| 2026-02-21 | Convention démo : domaine **`@demo.playground`** distinct de `@test.playground`. Démo = contenu réaliste pour présentation/validation produit. Test = données techniques pour QA/dev. Reset complet de base (dev + prod) via `prisma db push --force-reset` avant injection démo. |
| 2026-02-21 | Données démo : 6 Circles publics (TECH/Paris, DESIGN/Lyon, SPORT_WELLNESS/Paris, BUSINESS/Bordeaux, ART_CULTURE/Nantes, SCIENCE_EDUCATION/online), 20 users FR, 30 événements (1 passé + 4 à venir par Circle), ratio 20%/80%, contenu entièrement en français. |
| 2026-02-21 | Emails transactionnels : envoyés depuis les server actions (pas les usecases). Usecases restent purs (pas de side effects). Fire-and-forget (si email échoue, inscription réussit). Traductions i18n résolues dans le flux principal avant le fire-and-forget. Port `EmailService` avec 3 méthodes + adapter `ResendEmailService` (Resend + react-email). 4 emails MVP : confirmation inscription, confirmation liste d'attente, promotion liste d'attente, notification Organisateur. |
| 2026-02-21 | Agents Claude Code : définis dans `.claude/agents/` (gitignored). `test-coverage-guardian` — audit usecase vs test, création des manquants, run en boucle jusqu'à 100% vert. `security-guardian` — cartographie des points d'autorisation, tests RBAC/IDOR/admin, correction des vulnérabilités réelles dans le code source si détectées. Pattern : lancer en worktree isolé pour zéro risque sur main. |
| 2026-02-21 | Sécurité — defense-in-depth : les usecases admin ne doivent PAS faire confiance à la couche action seule. Chaque usecase admin accepte `callerRole: UserRole` et lève `AdminUnauthorizedError` si `callerRole !== "ADMIN"`. Principe : la sécurité est dans le domaine, pas uniquement à la périphérie. |
| 2026-02-21 | Observation architecturale : les pages admin (`/admin/*.tsx`) appellent `prismaAdminRepository` directement (sans passer par les usecases). Elles sont protégées par le layout guard mais ne bénéficient pas de la defense-in-depth des usecases. À adresser post-MVP. |
| 2026-02-22 | Terminologie FR simplifiée pour accessibilité : Cercle → **Communauté** (féminin), Escale → **événement** (masculin : Publié, Annulé, Passé), Mon Playground → **Mon espace**, La Carte → **Découvrir**, Rejoindre → **S'inscrire**. Code identifiers, clés JSON et noms de fichiers restent en anglais. EN inchangé. Motivation : termes plus accessibles pour les utilisateurs non familiers avec les concepts Meetup/Luma. |
| 2026-02-23 | CoverImagePicker — photos d'ouverture = **random Unsplash** (8 thématiques fixes : technology, design studio, business meeting, fitness sport, art painting, science laboratory, community people, nature landscape). Route `/api/unsplash/random` : 8 appels `/photos/random` en parallèle. Résultat mis en cache côté composant (pas de re-fetch aux réouvertures). Abandonne les photos curées statiques par catégorie (fragiles, non représentatives). |
| 2026-02-23 | CoverImagePicker — **Radix UI mode contrôlé** : en mode `open` contrôlé, changer l'état `open` programmatiquement via `setOpen(false)` ne déclenche PAS le callback `onOpenChange`. Pour garantir le reset de l'état interne, toujours passer par la fonction `handleOpenChange`. Règle : `handleApply` et `handleRemove` appellent `handleOpenChange(false)`, jamais `setOpen(false)` directement. |
| 2026-02-23 | CoverImagePicker — **pagination search** : navigation prev/next (remplace les photos en place) plutôt qu'un "Voir plus" (qui agrandissait la modale). Le param `page` est propagé à la route `/api/unsplash/search`. |
