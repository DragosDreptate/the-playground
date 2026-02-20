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

---

## MVP V1 — À faire

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

- [ ] **Registration — reste à faire**
  - Export CSV des inscrits

- [ ] **Paiement Stripe Connect**
  - Moments payants : prix en centimes, reversement aux Hosts
  - Stripe Connect onboarding pour les Hosts
  - 0% commission plateforme, seuls frais Stripe

- [ ] **Notifications email**
  - Resend + react-email templates
  - Confirmation inscription, rappels 24h/1h, changements, annulations
  - Architecture multi-canal (email V1, SMS/push/WhatsApp futur)

- [ ] **Fil de commentaires sur Moment**
  - CRUD commentaire sur chaque Moment
  - Visible sur la page publique

- [ ] **Répertoire public de Circles**
  - Annuaire de Circles uniquement (pas de Moments — distribution via lien partagé par le Host)
  - Chaque card affiche le prochain Moment à venir du Circle (teaser)
  - Filtrable par catégorie/thème et localisation
  - Pas de ranking, pas de marketplace

### Priorité moyenne

- [ ] **Export données**
  - CSV export : membres, événements, historique
  - Pour les Hosts

- [ ] **Assistant IA basique**
  - Description Moment, email invitation, suggestions Circle
  - SDK Anthropic (Claude)

### Infrastructure / Qualité

- [ ] **Baseliner les migrations Prisma** (actuellement `db:push` sans historique)
- [ ] **CI/CD GitHub Actions** (typecheck, tests, pnpm audit, Lighthouse CI)
- [ ] **Tests E2E Playwright** (parcours critiques)
- [ ] **Accessibilité axe-core** dans Playwright

---

## Phase 2 (post-MVP)

- [ ] Track (série d'événements récurrents dans un Circle)
- [ ] Check-in (marquer présent sur place)
- [ ] Plan Pro (analytics, branding, IA avancée, API, multi-canal)
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
