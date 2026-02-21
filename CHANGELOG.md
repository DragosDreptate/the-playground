# Changelog

Historique des livraisons de The Playground.
Chaque étape correspond à un bloc fonctionnel significatif du produit.

> Ce projet a été construit avec [Claude Code](https://claude.ai/claude-code) (Anthropic) — de l'architecture au déploiement.

---

## [0.7.0] — 2026-02-21 — Emails transactionnels & sécurité

Le dernier bloc critique avant le lancement. Les emails transactionnels donnent vie au produit : chaque inscription, chaque promotion de liste d'attente, chaque nouvelle inscription notifie les bonnes personnes au bon moment.

### Ajouté

- **Emails transactionnels** (Resend + react-email) — 4 emails MVP :
  - Confirmation d'inscription (Player)
  - Confirmation liste d'attente (Player)
  - Promotion liste d'attente — "une place s'est libérée !" (Player)
  - Notification nouvelle inscription (Host)
- **Pièce jointe .ics** sur les emails de confirmation et de promotion — l'événement arrive directement dans l'agenda du Participant
- **Générateur iCalendar** (`generateIcs`) — conforme RFC 5545, avec échappement des caractères spéciaux
- **Templates email** — layout partagé, calendar badge gradient rose→violet (inspiré Luma), CTA visible
- **Audit sécurité RBAC/IDOR** — defense-in-depth sur tous les usecases admin, tests d'autorisation
- **Tests unitaires** — couverture complète des usecases + 10 tests generateIcs
- **Documentation spec** — vision produit, admin plateforme, emails, cadrage mis à jour

### Architecture

- Port `EmailService` (domaine) → Adapter `ResendEmailService` (infrastructure)
- Pattern fire-and-forget : si l'email échoue, l'inscription réussit quand même
- i18n résolu avant le fire-and-forget (contexte requête Next.js)
- Templates locale-agnostiques (tous les textes arrivent pré-traduits dans `strings`)
- DNS configuré sur OVH : DKIM, SPF, DMARC pour `the-playground.fr`

---

## [0.6.0] — 2026-02-21 — Admin plateforme

La plateforme a besoin d'yeux. L'admin permet de superviser l'activité, modérer le contenu et débloquer les situations problématiques.

### Ajouté

- **Dashboard admin** — 4 cartes stats (Users, Circles, Moments, Inscriptions) + deltas hebdomadaires
- **Listes paginées** (20/page) avec recherche pour Users, Circles et Moments
- **Pages de détail** pour chaque entité avec toutes les informations associées
- **Actions de modération** — supprimer un utilisateur, un Circle ou un Moment, forcer l'annulation d'un Moment
- **Cascading delete** — suppression d'un utilisateur supprime ses Circles orphelins (s'il est seul Host)
- **Triple guard** — protection layout (redirect) + server action (`requireAdmin`) + usecase (`AdminUnauthorizedError`)

### Architecture

- Port `AdminRepository` dédié (requêtes transversales cross-domain, 13 méthodes)
- 11 usecases dans `domain/usecases/admin/`
- 14 server actions dans `app/actions/admin.ts`
- Layout sidebar dédié + middleware guard
- Champ `role` (USER/ADMIN) sur l'entité User
- i18n FR/EN complet (~70 clés)

---

## [0.5.0] — 2026-02-21 — Homepage, identité & découverte

The Playground prend forme visuellement. La homepage raconte l'histoire du produit, La Carte ouvre la découverte publique, et la terminologie propriétaire s'installe.

### Ajouté

- **Homepage redesignée** — hero split-screen (texte animé + mockup iPhone 3D), section "Comment ça marche" en 3 étapes, 3 piliers (Communauté d'abord, Design premium, 100% gratuit), CTA final
- **La Carte** (`/explorer`) — page publique de découverte des Cercles et Escales, filtrable par catégorie, tabs Cercles/Escales
- **Pages Circle publiques** (`/circles/[slug]`) — accessibles sans compte, SEO-friendly
- **Champs Circle enrichis** — `category` (enum 8 valeurs) + `city` (string libre)
- **Toggle langue FR/EN** dans le header
- **Favicon** — gradient rose→violet avec triangle play
- **Icône brand** dans le header (triangle play)
- **Données démo** — 6 Circles FR réalistes, 20 users, 30 Moments (`@demo.playground`)

### Terminologie i18n

La plateforme adopte son vocabulaire propre :
- **FR** : Moment → **Escale**, S'inscrire → **Rejoindre**, Dashboard → **Mon Playground**, Explorer → **La Carte**
- **EN** : Player → **Member**, Register → **Join**, Dashboard → **My Playground**, Explorer → **Explore**

---

## [0.4.0] — 2026-02-21 — Design system & polish

Le design passe du fonctionnel au premium. Chaque page est repensée pour atteindre le niveau Luma.

### Ajouté

- **Dashboard redesigné** — pill tabs (Mes Moments / Mes Cercles), timeline unifiée (upcoming + past), `DashboardMomentCard` + `CircleAvatar`, empty states avec CTA
- **Page Circle redesignée** — layout 2 colonnes (cover gradient + hosts + stats | titre + méta + timeline), toggle À venir/Passés via URL param
- **Page Moment passé** — cover grisée, badge overlay "Passé", banner contextuel, carte "Événement terminé" avec CTA rétention vers le Circle
- **Page profil redesignée** — single-column centré, avatar header, stats inline, meta rows
- **Liste des membres** (`CircleMembersList`) — Hosts avec couronne + Players, emails visibles uniquement pour les Hosts
- **Fils d'ariane** sur toutes les pages dashboard
- **Design system unifié** — une seule couleur accent (destructive = primary), badges harmonisés, hiérarchie boutons normative

### Modifié

- Couleur destructive alignée sur la teinte rose (hue 341) — approche Luma : un seul accent, zéro confusion
- Badges : fond plein = engagement positif, outline = tout le reste
- Bouton Modifier toujours `default` + `size="sm"` sur les pages de détail

---

## [0.3.0] — 2026-02-21 — Engagement & contenu

Les premières briques de l'engagement communautaire : commentaires, contenu enrichi, outils de test.

### Ajouté

- **Fil de commentaires** sur chaque Moment — plat, chronologique, auteur + Host peuvent supprimer, formulaire masqué sur les Moments passés
- **Autocomplete adresse** — intégration API BAN (Base Adresse Nationale) dans le formulaire Moment
- **Badge Organisateur** sur les cartes Moment (remplace "Inscrit" pour les Hosts)
- **Moments annulés** visibles dans la timeline du Circle (avec badge dédié)
- **Scripts données de test** — seed + cleanup pour `@test.playground`, idempotents
- **Impersonation dev** — `/api/dev/impersonate?email=...` pour les tests manuels

---

## [0.2.0] — 2026-02-20 — Parcours utilisateur complet

Le produit devient utilisable de bout en bout. Un Organisateur peut créer une communauté, publier un événement et recevoir des inscriptions. Un Participant peut s'inscrire, rejoindre la communauté et annuler.

### Ajouté

- **Système d'inscription** — JoinMoment, CancelRegistration, GetMomentRegistrations, GetUserRegistration
- **Liste d'attente** avec promotion automatique sur désistement
- **Auto-inscription Circle** — s'inscrire à un Moment inscrit automatiquement au Circle (zéro friction)
- **Auto-inscription Host** — créer un Moment inscrit automatiquement le Host
- **Dashboard Player-first** — "Mes prochains Moments" en timeline, "Mes Cercles" avec badge rôle
- **Sécurité dashboard** — Circle/Moment vérifient le rôle (Players redirigés vers la vue publique)
- **Profil utilisateur** + onboarding obligatoire au premier login (nom, prénom)
- **MomentDetailView** — composant unique paramétré par `variant` (public/host), réutilisé sur les deux vues
- **Formulaire Moment redesigné** — style Luma, minimaliste (titre, date, lieu, description), options avancées masquées
- **Header Luma-style** — avatar dropdown, navigation
- **Tests E2E mobiles** (Playwright) — dashboard + pages publiques
- **Monitoring** — Sentry (prod only) + Vercel Analytics + SpeedInsights

### Architecture

- Modèle de rôle refactoré : **Host = Player + droits de gestion** (single membership row, `@@unique([userId, circleId])`)
- Neon branching : branche `production` pour Vercel, branche `dev` pour local
- Script `db:dev:reset` pour recréer la branche dev depuis un snapshot prod

---

## [0.1.0] — 2026-02-19 — Fondations

Le socle technique et les premières features domaine. Le projet démarre avec une architecture hexagonale stricte et les deux entités centrales : Circle et Moment.

### Ajouté

- **Stack technique** — Next.js 15 (App Router), TypeScript strict, Prisma 7, PostgreSQL (Neon), Auth.js v5, Tailwind CSS 4, shadcn/ui, next-intl
- **Architecture hexagonale** — `domain/` (models, ports, usecases) → `infrastructure/` (repositories Prisma) → `app/` (routes Next.js)
- **Auth** — magic link + OAuth (Google, GitHub) via Auth.js v5
- **CRUD Circle** — première feature domaine complète (usecase + port + adapter + UI)
- **CRUD Moment** — avec page publique partageable `/m/[slug]`
- **i18n** — FR/EN natif avec next-intl
- **Déploiement** — Vercel (EU) + Neon PostgreSQL serverless (EU)

### Architecture

- Règle de dépendance unidirectionnelle : `app/ → domain/ ← infrastructure/`
- Le domaine ne dépend de rien (ni Prisma, ni Next.js, ni aucune librairie externe)
- Ports = interfaces TypeScript, Adapters = implémentations Prisma
- Usecases reçoivent les dépendances par injection
- Mapping Prisma ↔ domaine dans les repositories (pas dans le domaine)

---

## Conventions

- **Format** : [Keep a Changelog](https://keepachangelog.com/)
- **Versioning** : SemVer-inspired (0.x.0 = pre-launch milestones)
- **Langue** : français (cohérent avec le marché cible initial)
- **Mise à jour** : après chaque livraison significative (pas après chaque commit)
