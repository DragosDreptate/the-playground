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
| Couverture tests complète : 14 nouveaux fichiers (get-user-registration, get-moment-comments, get-user-past-moments, 11 usecases admin). 5 specs E2E scaffoldées (auth, join-moment, host-flow, cancel-registration, comments). 202 tests, 100% verts. | 2026-02-21 | `3ee4865` |
| Agents Claude Code : `test-coverage-guardian` (audit couverture + création tests manquants, run + correction en boucle) + `security-guardian` (audit RBAC/IDOR/accès admin, création tests sécurité, correction vulnérabilités). Définis dans `.claude/agents/`. | 2026-02-21 | — |
| Sécurité : audit complet + correction vulnérabilité architecturale (defense-in-depth manquante sur 11 usecases admin). Ajout `callerRole: UserRole` + `AdminUnauthorizedError`. 59 nouveaux tests de sécurité (RBAC, IDOR cross-tenant, accès admin). 271 tests, 100% verts. | 2026-02-21 | `8b14aaf` |
| Upload d'avatar utilisateur : port `StorageService` (hexagonal), adapter `VercelBlobStorageService` (@vercel/blob), helper `isUploadedUrl`, helper `resizeImage` (Canvas API, crop carré centré, WebP 384×384 ~50 Ko), server action `uploadAvatarAction`, composant `AvatarUpload` (hover overlay + lien texte conditionnel, preview optimiste, spinner), protection OAuth (ne pas écraser avatar uploadé), i18n FR/EN `Profile.avatar.*`, tests `blob.test.ts` + cas image dans `update-profile.test.ts`. AvatarUpload intégré aussi sur la page d'onboarding `/dashboard/profile/setup`. | 2026-02-22 | `aa84d5c` |
| Isolation onboarding via route groups Next.js : `(app)/layout.tsx` (layout complet : SiteHeader + SiteFooter) + `(onboarding)/layout.tsx` (layout minimal : logo statique non-cliquable, LocaleToggle + ThemeToggle uniquement, pas de footer). Suppression de la prop `hideNav` du SiteHeader. Tests E2E (`onboarding.spec.ts`, 6 tests) + `playwright.config.ts` + script `test:e2e:setup-onboarding`. TDD : tests écrits en RED, puis implémentation, puis GREEN. | 2026-02-22 | `7c57b8d` |
| Audit sécurité (security-guardian) : 20 nouveaux tests de sécurité. `avatar-upload-isolation.test.ts` (5 tests IDOR/userId isolation) + `onboarding-guard.test.ts` (15 tests anti-boucle, transitions d'état, cas limites). Aucune vulnérabilité détectée dans le code source. 299 tests, 100% verts. | 2026-02-22 | — |

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
  - Contenu : titre Escale, date, lieu, lien `/m/[slug]`, lien d'annulation
  - Gère aussi le cas WAITLISTED (textes différents, même template)

- [ ] ~~**Email de rappel pré-événement**~~ → **déprioritisé, post-MVP** (voir Phase 2)
  - Rappel 24h avant + rappel 1h avant — nécessite une infrastructure de jobs planifiés (Vercel Cron / QStash)
  - Complexité d'implémentation disproportionnée pour le MVP

- [x] **Email de promotion liste d'attente** (MVP-3 — parcours C) ✅
  - Déclenché par `CancelRegistration` quand un inscrit se désiste et promeut un waitlisté
  - Contenu : "Votre place est confirmée", détails de l'Escale

- [x] **Email de notification Organisateur : nouvelle inscription** (MVP-4 — parcours D) ✅
  - Déclenché par chaque `JoinMoment` sur une Escale dont l'utilisateur est Organisateur
  - Contenu : nom du nouvel inscrit, total inscrits / places restantes, lien vers gestion
  - Skip quand l'Organisateur s'inscrit lui-même

- [x] **Architecture email multi-canal** (infrastructure) ✅
  - Port `EmailService` (3 méthodes) + adapter `ResendEmailService`
  - Templates React (react-email) : calendar badge gradient, layout blanc/gris
  - Fire-and-forget depuis server actions (pas de queue pour le MVP)
  - Clé API : `AUTH_RESEND_KEY` (partagée auth + transactionnel)

#### UX post-inscription — "Et maintenant ?" (parcours A)

- [ ] **CTA "Ajouter au calendrier" post-inscription** (gap M-1)
  - Sur la page `/m/[slug]` après inscription confirmée
  - Liens : Google Calendar, Apple Calendar, fichier `.ics` (ICS universel)
  - Référence CLAUDE.md : déjà prévu dans le périmètre MVP Participant

- [ ] **Lien "Voir dans mon tableau de bord" post-inscription** (gap M-2)
  - Sur la page `/m/[slug]` après inscription : lien visible vers `/dashboard`
  - Objectif : faire découvrir l'espace personnel au nouveau membre

- [ ] **Section "Prochaines Escales du Cercle" sur page Escale publique** (gap M-3)
  - Sur `/m/[slug]` pour les Escales PUBLISHED (pas PAST — déjà traité)
  - Affiche jusqu'à 3 prochaines Escales du même Cercle (titre, date, CTA)
  - Rétention Circle depuis la porte d'entrée virale

#### Engagement post-événement — fenêtre d'or 24h (parcours F)

- [ ] **L'Organisateur peut commenter sur une Escale PAST** (gap H-1 — critique)
  - Actuellement : formulaire masqué pour tous sur PAST, y compris l'Organisateur
  - Décision à prendre : débloquer pour l'Organisateur uniquement, ou pour tous
  - Impact : l'Organisateur ne peut pas remercier sa communauté, pic d'engagement manqué

- [ ] **CTA "Créer la prochaine Escale" depuis une Escale PAST** (gap H-2)
  - Sur la page Escale PAST, vue Organisateur : bouton "Programmer la prochaine Escale"
  - Pré-remplit le formulaire avec le même Circle
  - Capitalise sur l'élan post-événement

#### Clarté liste d'attente (parcours C)

- [ ] **Position dans la liste d'attente visible** (gap H-3)
  - Sur `/m/[slug]` et dashboard : "Vous êtes X° sur la liste d'attente"
  - Réduit l'incertitude, évite l'abandon silencieux
  - Nécessite un champ `waitlistPosition` ou calcul à la volée

#### Découverte inter-Escales (parcours B)

- [ ] **Autres Escales du Cercle sur la page Escale dashboard Participant** (gap H-4)
  - Sur `/dashboard/circles/[slug]/moments/[slug]` vue Participant : section "Dans ce Cercle"
  - Liste les 3 prochaines Escales À VENIR du même Cercle
  - Actuellement absent : une fois sur une Escale, le Participant ne découvre pas les autres

#### Onboarding Organisateur — time-to-first-event (parcours G)

- [ ] **Guide onboarding Organisateur débutant** (gap H-7)
  - Dashboard vide (nouveau user, aucun Circle) : remplacer le simple bouton "Créer un Cercle"
  - Proposition : stepper 3 étapes — "Créez votre Cercle → Créez votre première Escale → Partagez le lien"
  - Objectif : réduire le time-to-first-event à < 5 minutes

- [ ] **CTA "Devenir organisateur" pour Participants** (gap H-5)
  - Sur le dashboard d'un Participant sans Cercle : lien/bouton "Vous voulez organiser ? Créez votre Cercle"
  - Actuellement invisible pour un Participant qui découvre la plateforme via une Escale

#### Gestion des inscriptions Organisateur (parcours E)

- [ ] **Export CSV des inscrits** (gap E-3 + déjà au backlog)
  - Depuis la page Escale Organisateur : bouton "Exporter la liste"
  - Colonnes : nom, email, statut (REGISTERED/WAITLISTED), date d'inscription
  - Besoin logistique réel (badges, listes d'émargement, suivi)

- [ ] **Vue segmentée inscrits/liste d'attente sur page Escale Organisateur** (gap H-8 + M-5)
  - Compteur "X inscrits confirmés · Y en attente · Z places restantes" en haut de page
  - Liste séparée en deux sections : Inscrits / Liste d'attente
  - Actuellement : liste unique sans distinction claire

---

### Personnalisation visuelle — avatars & covers

> Directement lié au principe "design premium par défaut" et à l'identité des communautés.
> Les gradients générés sont de bons fallbacks, mais les Organisateurs doivent pouvoir personnaliser leur Cercle.

- [x] **Avatar utilisateur** ✅ — upload photo de profil (Vercel Blob, resize Canvas WebP 384×384)

- [ ] **Cover / avatar Circle** — image personnalisée du Cercle
  - Champ `imageUrl` sur `Circle` (DB + domaine)
  - Upload dans le formulaire d'édition du Cercle
  - Affiché en cover sur la page Circle (remplace le gradient généré) et dans `CircleAvatar`
  - Fallback : gradient actuel si pas d'image

- [ ] **Cover Escale** — image de couverture de l'Escale
  - Champ `coverImageUrl` sur `Moment` (DB + domaine)
  - Upload dans le formulaire de création/édition d'une Escale
  - Affiché en bannière sur la page publique `/m/[slug]` (remplace le gradient)
  - Fallback : gradient actuel si pas d'image

- [ ] **Infrastructure upload** (prérequis commun aux 3)
  - Adapter `StorageService` (port déjà prévu dans CLAUDE.md) : Uploadthing ou S3-compatible
  - Contraintes : taille max (ex. 5 Mo), formats acceptés (jpg, png, webp), redimensionnement côté service

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
  - Escales payantes : prix en centimes, reversement aux Organisateurs
  - Stripe Connect onboarding pour les Organisateurs
  - 0% commission plateforme, seuls frais Stripe

- [x] **Fil de commentaires sur Escale** ✅
  - CRUD commentaire sur chaque Escale
  - Visible sur la page publique et la vue dashboard

- [x] **La Carte** (ex-Répertoire) ✅ — `spec/feature-explorer-repertoire.md`
  - Page `/explorer` : vitrine publique, "répertoire de tous les possibles" (SSR, revalidate: 60)
  - Tab **Cercles** : annuaire des Circles publics (card : nom, catégorie, ville, N membres, prochaine Escale en teaser)
  - Tab **Événements** : agenda chronologique des Escales PUBLISHED de Cercles publics (card community-first)
  - Filtre **catégorie** (MVP) — pas de filtre ville (densité insuffisante au lancement)
  - Page Circle publique `/circles/[slug]` accessible sans compte (SEO + cold traffic)
  - Lien "Explorer" dans le header principal (visible auth et non-auth)
  - Schema : `CircleCategory` enum (8 valeurs) + `category` + `city` sur Circle
  - Formulaire Circle : Select catégorie + Input ville
  - 10 nouveaux tests unitaires BDD (`getPublicCircles`, `getPublicUpcomingMoments`)

### Priorité moyenne

- [ ] **Notification aux membres : nouvelle Escale dans leur Cercle** (gap M-4)
  - Email ou notification in-app quand un Organisateur crée une nouvelle Escale dans un Cercle dont l'utilisateur est membre
  - Le Participant revient seulement s'il se souvient de vérifier — ce push est nécessaire

- [ ] **Export données Organisateur**
  - CSV export : membres Circle, historique Escales, inscrits cumulés

- [ ] **Assistant IA basique**
  - Description Escale, email invitation, suggestions Circle
  - SDK Anthropic (Claude)

### Infrastructure / Qualité

- [ ] **Stratégie migrations DB + rollback production** — voir `spec/db-migration-rollback-strategy.md`
  - Baseline migrations Prisma (passer de `db:push` à `prisma migrate`)
  - Scripts `db:migrate`, `db:migrate:prod`, `db:migrate:status`, `db:snapshot`
  - Workflow pré-déploiement : snapshot Neon + Point-in-Time Restore comme filet
  - Validation titre Escale dans les usecases (max 200 chars, actuellement front-only)
- [ ] **CI/CD GitHub Actions** (typecheck, tests, pnpm audit, Lighthouse CI)
- [x] **Tests unitaires complets** — 299 tests, tous usecases couverts (y compris admin) ✅
- [x] **Tests de sécurité** — RBAC, IDOR cross-tenant, accès admin, avatar isolation, onboarding guards (79 tests dédiés sécurité) ✅
- [ ] **Tests E2E Playwright** — 6 specs (auth, join-moment, host-flow, cancel-registration, comments, onboarding). `onboarding.spec.ts` : 6/6 green. Les 5 autres à brancher sur environnement de test.
- [ ] **Accessibilité axe-core** dans Playwright

---

## Phase 2 (post-MVP)

- [ ] Track (série d'événements récurrents dans un Circle)
- [ ] Check-in (marquer présent sur place)
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
| 2026-02-19 | Circle = Cercle en français, Host/Player en anglais dans le code |
| 2026-02-20 | Host = Player + droits de gestion (rôle hiérarchique, une seule membership par user/circle) |
| 2026-02-20 | Neon branching dev/prod (`pnpm db:dev:reset` pour snapshot frais) |
| 2026-02-20 | Onboarding profil obligatoire au premier login |
| 2026-02-20 | Email non éditable dans le profil (clé unique Auth.js, pivot de liaison entre providers) |
| 2026-02-20 | Pas de merge/liaison manuelle de comptes dans le MVP (si emails différents = comptes différents) |
| 2026-02-20 | Positionnement clarifié : community-centric (modèle Meetup) + UX premium (expérience Luma) + 100% gratuit. Circle = entité centrale, Escale = porte d'entrée virale, page Cercle = couche de rétention (absente chez Luma). Dashboard Organisateur = Cercle-first. |
| 2026-02-20 | L'organisateur est automatiquement inscrit (REGISTERED) à l'Escale qu'il crée — règle métier dans `createMoment`. |
| 2026-02-20 | Check-in retiré du MVP → Phase 2 (pas prioritaire pour le lancement) |
| 2026-02-20 | La Carte = Circles uniquement (pas d'Escales). Distribution des Escales via lien partagé par l'Organisateur. Annuaire d'Escales → Phase 2 si besoin. |
| 2026-02-21 | Escales passées accessibles sur la page publique `/m/[slug]` (avec UI "Événement terminé"). Seuls les CANCELLED renvoient une 404. |
| 2026-02-21 | Page Circle = même layout 2 colonnes que Moment (cover gradient LEFT sticky, contenu RIGHT). Cohérence design inter-pages. |
| 2026-02-21 | Carte "Événement terminé" (vue publique Escale passée) inclut un CTA "Voir les prochaines Escales du Cercle" — rétention vers le Circle. |
| 2026-02-21 | Fil de commentaires plat (pas de réponses imbriquées). Max 2000 chars. Tout utilisateur authentifié peut commenter, même sans être membre. Auteur et Organisateur peuvent supprimer. Sur Escales PAST, le formulaire est masqué mais les commentaires restent visibles. |
| 2026-02-21 | Convention pérenne utilisateurs test : domaine `@test.playground` en dev ET en prod. Pas de champ DB supplémentaire. Suppression via `DELETE WHERE email LIKE '%@test.playground'`. |
| 2026-02-21 | Scripts données test : seed idempotent (`upsert` partout), cleanup avec flag `--execute` (dry-run par défaut). Variantes prod via scripts shell Neon (même pattern que `db-push-prod.sh`). Données FR uniquement (noms, lieux). |
| 2026-02-21 | Page profil : layout single-column centré (pas 2 colonnes), avatar + nom + email + stats en header, formulaire prénom/nom, meta rows read-only (email, membre depuis). Email retiré du formulaire (lecture seule dans meta row). |
| 2026-02-21 | Fils d'ariane : obligatoires sur toutes les pages dashboard sauf racine `/dashboard` et onboarding `profile/setup`. Pattern CSS unifié. |
| 2026-02-21 | Badges unifiés : fond plein (`default`) = engagement positif (Inscrit, Publié). Outline = tout le reste (Organisateur en `outline` + accent primary, Annulé en `outline` + accent destructive, Passé en `outline` neutre, Participant en `secondary`). |
| 2026-02-21 | Couleur unique : `--destructive` = `--primary` (même rose). Le danger est communiqué par le contexte (mot, modale), pas par une couleur différente. Approche Luma : un seul accent. |
| 2026-02-21 | Bouton Modifier : toujours `default` (rose plein) + `size="sm"` sur les pages de détail (Circle et Escale). Cohérence inter-pages. |
| 2026-02-21 | Analyse UX JTBD complète (spec/ux-parcours-jtbd.md) : 8 personas, 25 JTBD, 7 parcours. 4 casseurs de loop identifiés (emails transactionnels), 8 gaps haute priorité, 7 moyens. Ajoutés au backlog sous "Rétention & viralité". |
| 2026-02-21 | La Carte (spec/feature-explorer-repertoire.md) : `/explorer` avec tabs Cercles + Événements, community-first, pas d'algorithme. Décision révisée : La Carte = Circles + Escales à venir de Circles publics (pas Circles uniquement). Nouvelle métaphore : "répertoire de tous les possibles" = incarnation du nom Playground. Schema : `category` + `city` sur Circle. Page Circle publique `/circles/[slug]` pour le cold traffic et le SEO. |
| 2026-02-21 | Dashboard redesigné : pill tabs + timeline unifiée. Pas de CTAs dans les tab headers, uniquement dans les empty states. Page de consultation, pas de création. |
| 2026-02-21 | Terminologie i18n rebranding. FR : Moment → **Escale** (féminin — Publiée, Annulée, Passée, cette/une Escale), S'inscrire → **Rejoindre**, Dashboard → **Mon Playground**. EN : Player → **Member**, Register → **Join**, Dashboard → **My Playground**. Code identifiers, clés JSON et noms de fichiers restent en anglais (Moment, Player). |
| 2026-02-21 | Le Répertoire renommé **La Carte** (FR) / **Explore** (EN). Métaphore voyage cohérente (Carte = destinations, Escale = étape). Route `/explorer` et namespace i18n `Explorer` inchangés. **La Boussole** réservée pour l'assistant IA (futur). |
| 2026-02-21 | Convention démo : domaine **`@demo.playground`** distinct de `@test.playground`. Démo = contenu réaliste pour présentation/validation produit. Test = données techniques pour QA/dev. Reset complet de base (dev + prod) via `prisma db push --force-reset` avant injection démo. |
| 2026-02-21 | Données démo : 6 Circles publics (TECH/Paris, DESIGN/Lyon, SPORT_WELLNESS/Paris, BUSINESS/Bordeaux, ART_CULTURE/Nantes, SCIENCE_EDUCATION/online), 20 users FR, 30 Escales (1 passée + 4 à venir par Circle), ratio 20%/80%, contenu entièrement en français. |
| 2026-02-21 | Emails transactionnels : envoyés depuis les server actions (pas les usecases). Usecases restent purs (pas de side effects). Fire-and-forget (si email échoue, inscription réussit). Traductions i18n résolues dans le flux principal avant le fire-and-forget. Port `EmailService` avec 3 méthodes + adapter `ResendEmailService` (Resend + react-email). 4 emails MVP : confirmation inscription, confirmation liste d'attente, promotion liste d'attente, notification Organisateur. |
| 2026-02-21 | Agents Claude Code : définis dans `.claude/agents/` (gitignored). `test-coverage-guardian` — audit usecase vs test, création des manquants, run en boucle jusqu'à 100% vert. `security-guardian` — cartographie des points d'autorisation, tests RBAC/IDOR/admin, correction des vulnérabilités réelles dans le code source si détectées. Pattern : lancer en worktree isolé pour zéro risque sur main. |
| 2026-02-21 | Sécurité — defense-in-depth : les usecases admin ne doivent PAS faire confiance à la couche action seule. Chaque usecase admin accepte `callerRole: UserRole` et lève `AdminUnauthorizedError` si `callerRole !== "ADMIN"`. Principe : la sécurité est dans le domaine, pas uniquement à la périphérie. |
| 2026-02-21 | Observation architecturale : les pages admin (`/admin/*.tsx`) appellent `prismaAdminRepository` directement (sans passer par les usecases). Elles sont protégées par le layout guard mais ne bénéficient pas de la defense-in-depth des usecases. À adresser post-MVP. |
