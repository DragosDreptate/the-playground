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
| Dashboard Player-first : section "Mes prochains Moments" + "Mes Cercles" avec badge rôle | 2026-02-20 | non commité |
| Dev tooling : seed 3 utilisateurs test (host/player1/player2) + route GET d'impersonation (dev-only) | 2026-02-20 | `c862293` |
| Sécurité dashboard : pages Circle/Moment vérifient le rôle — Players voient la vue publique, contrôles Host masqués | 2026-02-20 | `c862293` |
| Règle métier : blocage inscription si Moment déjà commencé (`MomentAlreadyStartedError`) + transition auto PUBLISHED→PAST | 2026-02-20 | `c862293` |
| Bug fix : ré-inscription après annulation met à jour la ligne existante (pas de doublon) | 2026-02-20 | `c862293` |
| Tests : 21 nouveaux tests couvrant le cycle de vie de l'inscription (re-register, capacité, flux croisés) | 2026-02-20 | `c862293` |
| Monitoring : Sentry (error tracking client/server/edge) + Vercel Analytics + SpeedInsights | 2026-02-21 | `c862293` + `2dde4cc` |
| Page Moment unifiée : composant `MomentDetailView` partagé entre vue publique et vue Host | 2026-02-21 | `e867ba0` |
| Page Circle redesignée : layout 2 colonnes aligné sur Moment (cover gradient, hosts, stats) | 2026-02-21 | `0deec99` |
| Timeline Moments sur page Circle : toggle "À venir / Passés" (URL param `?tab=past`) + fil d'ariane avec dates | 2026-02-21 | `0deec99` |
| Statut inscription dans la timeline : dot coloré (rose/amber) + badge (Inscrit / Liste d'attente) | 2026-02-21 | `b9a9993` |
| Formulaire Moment : auto-sync date de fin = date de début à la sélection | 2026-02-21 | `0deec99` |
| Indicateurs Moment passé : cover grisée + badge "Passé" overlay + banner contextuel + carte "Événement terminé" avec CTA rétention Circle | 2026-02-21 | `488ddb8` |
| Fil de commentaires sur Moment : `CommentThread` (plat, chronologique) sur pages publique + dashboard Host/Player | 2026-02-21 | non commité |
| Scripts données test : `db:seed-test-data` (réaliste, idempotent, FR) + `db:cleanup-test-data` (dry-run par défaut) + variantes prod | 2026-02-21 | non commité |
| Redesign page profil : layout single-column centré, avatar header, stats inline, meta rows (email, membre depuis), formulaire simplifié | 2026-02-21 | `7142585` |
| Fils d'ariane cohérents sur toutes les pages dashboard (6 pages ajoutées/complétées) | 2026-02-21 | `313473e` |
| Harmonisation badges : Annulé → outline destructive, Organisateur → outline primary partout, Participant → secondary partout | 2026-02-21 | `8d7b76b` |
| Couleur destructive = primary (une seule couleur accent rose, danger communiqué par le contexte) | 2026-02-21 | `75fd383` |
| Bouton Modifier unifié : default (rose plein) sur pages Circle et Moment | 2026-02-21 | `295575d` |

---

## MVP V1 — À faire

> Référence UX complète : `spec/ux-parcours-jtbd.md` (8 personas, 25 JTBD, 7 parcours, matrice gaps).

---

### 🔴 Rétention & viralité — boucle critique (bloquant pour la croissance)

> Ces éléments sont les **casseurs de loop** identifiés dans l'analyse UX.
> Sans eux, le produit peut fonctionner mais ne peut pas croître ni fidéliser.
> Référence : parcours A→G, gaps MVP-1 à MVP-4 + H-1 à H-8.

#### Emails transactionnels (Resend + react-email)

- [ ] **Email de confirmation d'inscription** (MVP-1 — parcours A)
  - Déclenché immédiatement après `JoinMoment`
  - Contenu : titre Moment, date, lieu, lien `/m/[slug]`, lien d'annulation
  - Sans cet email, l'inscription est anxiogène et le taux d'absence explose

- [ ] ~~**Email de rappel pré-événement**~~ → **déprioritisé, post-MVP** (voir Phase 2)
  - Rappel 24h avant + rappel 1h avant — nécessite une infrastructure de jobs planifiés (Vercel Cron / QStash)
  - Complexité d'implémentation disproportionnée pour le MVP

- [ ] **Email de promotion liste d'attente** (MVP-3 — parcours C)
  - Déclenché par `CancelRegistration` quand un inscrit se désiste et promeut un waitlisté
  - Contenu : "Votre place est confirmée", détails du Moment, lien pour annuler si besoin
  - Sans cet email, le Player promu ne le sait jamais → place perdue en pratique

- [ ] **Email de notification Host : nouvelle inscription** (MVP-4 — parcours D)
  - Déclenché par chaque `JoinMoment` sur un Moment dont l'utilisateur est Host
  - Contenu : nom du nouvel inscrit, total inscrits / places restantes, lien vers gestion
  - Sans cet email, le Host ne sait pas que ça "marche" → abandon early adopters

- [ ] **Architecture email multi-canal** (infrastructure)
  - `EmailService` port déjà défini dans le domaine → implémenter `ResendEmailService`
  - Templates React (react-email) : cohérence visuelle avec la plateforme
  - File d'attente ou jobs planifiés pour les rappels (Vercel Cron Jobs ou queue)
  - Variables Vercel : `RESEND_API_KEY`, `EMAIL_FROM`

#### UX post-inscription — "Et maintenant ?" (parcours A)

- [ ] **CTA "Ajouter au calendrier" post-inscription** (gap M-1)
  - Sur la page `/m/[slug]` après inscription confirmée
  - Liens : Google Calendar, Apple Calendar, fichier `.ics` (ICS universel)
  - Référence CLAUDE.md : déjà prévu dans le périmètre MVP Player

- [ ] **Lien "Voir dans mon tableau de bord" post-inscription** (gap M-2)
  - Sur la page `/m/[slug]` après inscription : lien visible vers `/dashboard`
  - Objectif : faire découvrir l'espace personnel au nouveau membre

- [ ] **Section "Prochains Moments du Cercle" sur page Moment publique** (gap M-3)
  - Sur `/m/[slug]` pour les Moments PUBLISHED (pas PAST — déjà traité)
  - Affiche jusqu'à 3 prochains Moments du même Circle (titre, date, CTA)
  - Rétention Circle depuis la porte d'entrée virale

#### Engagement post-événement — fenêtre d'or 24h (parcours F)

- [ ] **Host peut commenter sur un Moment PAST** (gap H-1 — critique)
  - Actuellement : formulaire masqué pour tous sur PAST, y compris le Host
  - Décision à prendre : débloquer pour le Host uniquement, ou pour tous
  - Impact : le Host ne peut pas remercier sa communauté, pic d'engagement manqué

- [ ] **CTA "Créer le prochain Moment" depuis un Moment PAST** (gap H-2)
  - Sur la page Moment PAST, vue Host : bouton "Programmer le prochain Moment"
  - Pré-remplit le formulaire avec le même Circle
  - Capitalise sur l'élan post-événement

#### Clarté liste d'attente (parcours C)

- [ ] **Position dans la liste d'attente visible** (gap H-3)
  - Sur `/m/[slug]` et dashboard : "Vous êtes X° sur la liste d'attente"
  - Réduit l'incertitude, évite l'abandon silencieux
  - Nécessite un champ `waitlistPosition` ou calcul à la volée

#### Découverte inter-Moments (parcours B)

- [ ] **Autres Moments du Circle sur la page Moment dashboard Player** (gap H-4)
  - Sur `/dashboard/circles/[slug]/moments/[slug]` vue Player : section "Dans ce Cercle"
  - Liste les 3 prochains Moments À VENIR du même Circle
  - Actuellement absent : une fois sur un Moment, le Player ne découvre pas les autres

#### Onboarding Host — time-to-first-event (parcours G)

- [ ] **Guide onboarding Host débutant** (gap H-7)
  - Dashboard vide (nouveau user, aucun Circle) : remplacer le simple bouton "Créer un Cercle"
  - Proposition : stepper 3 étapes — "Créez votre Cercle → Créez votre premier Moment → Partagez le lien"
  - Objectif : réduire le time-to-first-event à < 5 minutes

- [ ] **CTA "Devenir organisateur" pour Players** (gap H-5)
  - Sur le dashboard d'un Player sans Circle : lien/bouton "Vous voulez organiser ? Créez votre Cercle"
  - Actuellement invisible pour un Player qui découvre la plateforme via un Moment

#### Gestion des inscriptions Host (parcours E)

- [ ] **Export CSV des inscrits** (gap E-3 + déjà au backlog)
  - Depuis la page Moment Host : bouton "Exporter la liste"
  - Colonnes : nom, email, statut (REGISTERED/WAITLISTED), date d'inscription
  - Besoin logistique réel (badges, listes d'émargement, suivi)

- [ ] **Vue segmentée inscrits/liste d'attente sur page Moment Host** (gap H-8 + M-5)
  - Compteur "X inscrits confirmés · Y en attente · Z places restantes" en haut de page
  - Liste séparée en deux sections : Inscrits / Liste d'attente
  - Actuellement : liste unique sans distinction claire

---

### Priorité haute (bloquant pour le lancement)

- [ ] **Admin plateforme**
  - Pages `/admin/*` (même stack, shadcn)
  - CRUD complet sur tous Circles / Users / Moments
  - Dashboard stats basiques
  - Champ `role` (USER/ADMIN) sur User, middleware guard sur `/admin/*`
  - Timing : avant Registration/Paiement

- [ ] **Outils Host enrichis**
  - Co-Hosts (plusieurs HOST par Circle)
  - Gestion membres (inviter, retirer)
  - Stats Circle basiques

- [ ] **Paiement Stripe Connect**
  - Moments payants : prix en centimes, reversement aux Hosts
  - Stripe Connect onboarding pour les Hosts
  - 0% commission plateforme, seuls frais Stripe

- [x] **Fil de commentaires sur Moment** ✅
  - CRUD commentaire sur chaque Moment
  - Visible sur la page publique et la vue dashboard

- [ ] **Répertoire public de Circles**
  - Annuaire de Circles uniquement (pas de Moments — distribution via lien partagé par le Host)
  - Chaque card affiche le prochain Moment à venir du Circle (teaser)
  - Filtrable par catégorie/thème et localisation
  - Pas de ranking, pas de marketplace

### Priorité moyenne

- [ ] **Notification aux membres : nouveau Moment dans leur Circle** (gap M-4)
  - Email ou notification in-app quand un Host crée un nouveau Moment dans un Circle dont l'utilisateur est membre
  - Le Player revient seulement s'il se souvient de vérifier — ce push est nécessaire

- [ ] **Export données Host**
  - CSV export : membres Circle, historique Moments, inscrits cumulés

- [ ] **Assistant IA basique**
  - Description Moment, email invitation, suggestions Circle
  - SDK Anthropic (Claude)

### Infrastructure / Qualité

- [ ] **Stratégie migrations DB + rollback production** — voir `spec/db-migration-rollback-strategy.md`
  - Baseline migrations Prisma (passer de `db:push` à `prisma migrate`)
  - Scripts `db:migrate`, `db:migrate:prod`, `db:migrate:status`, `db:snapshot`
  - Workflow pré-déploiement : snapshot Neon + Point-in-Time Restore comme filet
  - Validation titre Moment dans les usecases (max 200 chars, actuellement front-only)
- [ ] **CI/CD GitHub Actions** (typecheck, tests, pnpm audit, Lighthouse CI)
- [ ] **Tests E2E Playwright** (parcours critiques)
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
| 2026-02-20 | Positionnement clarifié : community-centric (modèle Meetup) + UX premium (expérience Luma) + 100% gratuit. Circle = entité centrale, Moment = porte d'entrée virale, page Circle = couche de rétention (absente chez Luma). Dashboard Host = Circle-first. |
| 2026-02-20 | L'organisateur est automatiquement inscrit (REGISTERED) au Moment qu'il crée — règle métier dans `createMoment`. |
| 2026-02-20 | Check-in retiré du MVP → Phase 2 (pas prioritaire pour le lancement) |
| 2026-02-20 | Répertoire public = Circles uniquement (pas de Moments). Distribution des Moments via lien partagé par le Host. Annuaire de Moments → Phase 2 si besoin. |
| 2026-02-21 | Moments passés accessibles sur la page publique `/m/[slug]` (avec UI "Événement terminé"). Seuls les CANCELLED renvoient une 404. |
| 2026-02-21 | Page Circle = même layout 2 colonnes que Moment (cover gradient LEFT sticky, contenu RIGHT). Cohérence design inter-pages. |
| 2026-02-21 | Carte "Événement terminé" (vue publique Moment passé) inclut un CTA "Voir les prochains Moments du Cercle" — rétention vers le Circle. |
| 2026-02-21 | Fil de commentaires plat (pas de réponses imbriquées). Max 2000 chars. Tout utilisateur authentifié peut commenter, même sans être membre. Auteur et Host peuvent supprimer. Sur Moments PAST, le formulaire est masqué mais les commentaires restent visibles. |
| 2026-02-21 | Convention pérenne utilisateurs test : domaine `@test.playground` en dev ET en prod. Pas de champ DB supplémentaire. Suppression via `DELETE WHERE email LIKE '%@test.playground'`. |
| 2026-02-21 | Scripts données test : seed idempotent (`upsert` partout), cleanup avec flag `--execute` (dry-run par défaut). Variantes prod via scripts shell Neon (même pattern que `db-push-prod.sh`). Données FR uniquement (noms, lieux). |
| 2026-02-21 | Page profil : layout single-column centré (pas 2 colonnes), avatar + nom + email + stats en header, formulaire prénom/nom, meta rows read-only (email, membre depuis). Email retiré du formulaire (lecture seule dans meta row). |
| 2026-02-21 | Fils d'ariane : obligatoires sur toutes les pages dashboard sauf racine `/dashboard` et onboarding `profile/setup`. Pattern CSS unifié. |
| 2026-02-21 | Badges unifiés : fond plein (`default`) = engagement positif (Inscrit, Publié). Outline = tout le reste (Organisateur en `outline` + accent primary, Annulé en `outline` + accent destructive, Passé en `outline` neutre, Participant en `secondary`). |
| 2026-02-21 | Couleur unique : `--destructive` = `--primary` (même rose). Le danger est communiqué par le contexte (mot, modale), pas par une couleur différente. Approche Luma : un seul accent. |
| 2026-02-21 | Bouton Modifier : toujours `default` (rose plein) + `size="sm"` sur les pages de détail (Circle et Moment). Cohérence inter-pages. |
| 2026-02-21 | Analyse UX JTBD complète (spec/ux-parcours-jtbd.md) : 8 personas, 25 JTBD, 7 parcours. 4 casseurs de loop identifiés (emails transactionnels), 8 gaps haute priorité, 7 moyens. Ajoutés au backlog sous "Rétention & viralité". |
