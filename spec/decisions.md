# Décisions clés — The Playground

> **Registre canonique des décisions du projet.** Source unique de vérité.
> Journal chronologique des décisions structurantes (architecturales, produit, stratégiques, techniques) prises au fil du projet. Les décisions intermédiaires supersédées ont été retirées.
>
> **Deux niveaux** : une ligne ici pour toute décision structurante ; un ADR détaillé dans [`spec/decisions/`](decisions/) (Contexte → Décision → Alternatives écartées → Conséquences) pour les décisions vraiment lourdes. Voir [`spec/decisions/README.md`](decisions/README.md).
>
> Règles de vie du projet (terminologie, principes, stack) : `CLAUDE.md`.

---

| Date | Décision |
| --- | --- |
| 2026-02-19 | Usecases = fonctions (pas de classes). ActionResult pattern pour server actions. Slug généré dans le usecase (règle métier). |
| 2026-02-19 | Stack : TypeScript full-stack (Next.js 16, Prisma, PostgreSQL, Auth.js, Stripe Connect, Tailwind + shadcn/ui, Resend, Anthropic SDK, Vercel + Neon). |
| 2026-02-19 | Architecture hexagonale stricte : `domain/` (models, ports, usecases) + `infrastructure/` (repositories, services) + `app/` (routes Next.js). |
| 2026-02-19 | Tests BDD lightweight (Given/When/Then natif Vitest) + Specification by Example (`test.each`), pas de Gherkin/Cucumber. |
| 2026-02-19 | 100% gratuit, 0% commission plateforme, seuls frais Stripe. |
| 2026-02-19 | Auth : Magic link + OAuth (Google, GitHub) via Auth.js v5. |
| 2026-02-19 | UI bilingue FR/EN dès V1, architecture i18n native (next-intl). |
| 2026-02-19 | Track retiré du MVP V1 → Phase 2. Check-in retiré du MVP → Phase 2. |
| 2026-02-20 | Modèle User unique — Host = Player + droits de gestion (rôle via `CircleMembership`). |
| 2026-02-20 | Positionnement : community-centric (modèle Meetup) + UX premium (Luma) + 100% gratuit. Communauté = entité centrale, événement = porte d'entrée virale. |
| 2026-02-20 | L'Organisateur est automatiquement inscrit (REGISTERED) à l'événement qu'il crée. |
| 2026-02-20 | Email non éditable dans le profil (clé unique Auth.js). Pas de merge/liaison de comptes dans le MVP. |
| 2026-02-20 | Neon branching dev/prod (`pnpm db:dev:reset`). Prix en centimes (int, convention Stripe). |
| 2026-02-21 | Fil de commentaires plat (pas de réponses imbriquées). Max 2000 chars. Tout authentifié peut commenter. |
| 2026-02-21 | Convention données test : domaine `@test.playground` (dev + prod). Convention démo : `@demo.playground`. |
| 2026-02-21 | Badges unifiés : `default` = engagement positif, `outline` = tout le reste. Couleur unique : `destructive` = `primary` (même rose). |
| 2026-02-21 | Emails envoyés depuis server actions (pas usecases). Fire-and-forget (email échoue → inscription réussit). |
| 2026-02-21 | Sécurité defense-in-depth : chaque usecase admin accepte `callerRole: UserRole` + lève `AdminUnauthorizedError`. |
| 2026-02-22 | **Terminologie FR finale** : Communauté (féminin), événement (masculin), Organisateur, Participant, Mon espace, Explorer, S'inscrire. Code inchangé (Circle, Moment, Host, Player). |
| 2026-02-23 | **Terminologie EN finale** : Community, Event, Member, Dashboard, Explore. Code inchangé. |
| 2026-02-28 | Dashboard Mode Switcher : enum `DashboardMode` (`PARTICIPANT`/`ORGANIZER`) persisté en DB + session Auth.js. |
| 2026-03-03 | Broadcast cooldown 24h (remplace le verrou permanent "envoi unique"). `broadcastSentAt` écrasé à chaque envoi. |
| 2026-03-14 | Statut DRAFT : tout événement créé est en Brouillon. DRAFT → PUBLISHED via `publishMoment` (sens unique). Notifications déplacées à la publication. |
| 2026-04-18 | Refonte du backlog : fichier unique `spec/BACKLOG.md` au format minimaliste (5 champs fixes), items ajoutés uniquement sur demande explicite. Phase 2 + Stripe déplacés dans `spec/ideas.md`, décisions clés dans `spec/decisions.md`. |
| 2026-04-19 | `spec/BACKLOG.md` sorti du tracking git. Source unique dans le repo principal, symlink dans les worktrees créé automatiquement par `scripts/worktree-new.sh`. Modifications en local sans commit / PR. |
| 2026-05-06 | Migration du backlog vers GitHub Issues + Project v2 « Backlog » (https://github.com/users/DragosDreptate/projects/1). Labels `type:*` (feature, evol, fix, chore, idea), fields Project `Status` (Backlog, Up Next, In Progress, In Review, Done) et `Priority` (high, medium, low). 22 items migrés en issues #423 → #444. `spec/BACKLOG.md` supprimé, symlink retiré du script worktree. |
| 2026-04-22 | **Distinction « Rejoindre » vs « S'inscrire » (FR) verrouillée** comme choix volontaire non unifiable. Rejoindre = action sur un Circle (adhésion durable à une communauté). S'inscrire = action sur un Moment (RSVP ponctuel). En EN les deux contextes utilisent « Join ». Ne pas chercher à unifier en FR. |
| 2026-05-07 | `allowDangerousEmailAccountLinking: true` activé sur Google et GitHub. Évite l'erreur `OAuthAccountNotLinked` quand un User a un compte existant (créé via magic link ou autre provider) et tente de se connecter avec un OAuth pour la première fois sur le même email. Risque mitigé : Google vérifie l'email via OIDC (`email_verified`), GitHub exige une vérification avant qu'une adresse soit marquée comme primary. La page `/auth/sign-in` lit désormais `searchParams.error` et affiche un bandeau pour les `SignInError` qui transitent encore par cette page (`OAuthCallbackError`, `OAuthSignInError`, `AccessDenied`, fallback `Default`). Issue #429. **[→ ADR-0001](decisions/0001-oauth-account-linking.md)** |
| 2026-06-16 | **Gouvernance des décisions formalisée.** `spec/decisions.md` devient le registre canonique unique. Système à deux niveaux : ligne ici + ADR détaillé dans `spec/decisions/` pour les décisions lourdes. Table « Décisions prises » de `CLAUDE.md` remplacée par un pointeur (évite la divergence constatée : la table CLAUDE.md s'arrêtait en avril, ce journal allait jusqu'en mai). Règle normative ajoutée dans `CLAUDE.md` : consigner toute décision structurante sans attendre une demande explicite. |
