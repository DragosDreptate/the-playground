# Cadrage projet THE PLAYGROUND

## Tagline

**EN**
Build your community. Host your events. Own your audience.

**FR**
Lancez votre communauté. Organisez vos événements. Maîtrisez votre audience.

---

# 1. Vision

The Playground est une plateforme ouverte permettant à toute communauté de :

- Lancer et structurer une communauté (Circle)
- Organiser des événements (Moments)
- Gérer des séries récurrentes (Tracks — Phase 2)
- Monétiser (ou pas) ses événements
- Conserver la propriété et la maîtrise de son audience

Ce n'est pas un réseau social.
Ce n'est pas une marketplace.
C'est une infrastructure.

---

# 2. Positionnement

## Problème marché

Les plateformes existantes sont :

- Fermées
- Payantes pour les organisateurs
- Centrées sur la plateforme plutôt que sur la communauté
- Peu innovantes
- Design daté (Meetup) ou fees élevées (Luma, Eventbrite)

Les communautés bricolent aujourd'hui :
- Formulaires
- Outils de paiement séparés
- Tableurs
- Emails manuels

## Proposition

The Playground est :

- Ouvert
- Multi-communautés
- Simple
- IA-native
- Design-first
- Centré sur la propriété des données
- 100% gratuit (seuls les frais Stripe s'appliquent sur les événements payants)

---

# 3. Architecture sémantique

## 🌍 The Playground
La plateforme.

## 🔵 The Circle
La communauté.
Un espace autonome.

## 🟣 The Track *(Phase 2)*
Une série d'événements récurrents au sein d'une communauté (Circle). Retiré du MVP V1.

## 🟡 The Moment
Un événement individuel d'une communauté (présentiel ou visio). Il peut faire partie d'un Track ou être indépendant. Le Moment est l'unité virale de la plateforme : chaque Moment dispose d'une page autonome, belle et partageable.

## 🧑 The Host
Organisateur d'un Circle.

## 🎟️ The Player
Participant à un Moment et membre d'un Circle. S'inscrire à un Moment inscrit automatiquement le Player au Circle organisateur (de façon transparente). Le Circle se constitue organiquement via les inscriptions aux Moments.

---

# 4. Modèle conceptuel

## Circle

Contient :
- Nom
- Description
- Logo
- Hosts
- Players
- Tracks
- Moments
- Visibilité (public / privé sur lien)

## Track

- Nom
- Description
- Règle de récurrence
- Moments associés
- Statistiques consolidées

## Moment

- Titre
- Description
- Date
- Lieu / lien visio
- Capacité
- Prix (gratuit ou payant)
- Liste d'attente (promotion automatique en cas de désistement)
- Players inscrits
- Statut check-in
- Fil de commentaires (Players inscrits)
- URL partageable dédiée

---

# 5. MVP V1

## Côté Host

- Créer un Circle
- Créer un Moment (page autonome et partageable)
- Paramétrer :
  - Capacité
  - Gratuit / Payant
- Voir les Players inscrits
- Gestion de la liste d'attente
- Export données (CSV participants, données Circle)
- Check-in le jour J
- Communiquer avec les Players inscrits (email direct)
- Assistant IA basique :
  - Génération description Moment
  - Génération email d'invitation
  - Suggestions titre/description Circle

## Côté Player

- Découvrir un Moment via un lien partagé (page autonome)
- S'inscrire à un Moment (= rejoindre le Circle automatiquement)
- Payer si nécessaire (Stripe)
- Recevoir les notifications email :
  - Confirmation d'inscription
  - Rappel 24h avant
  - Rappel 1h avant
  - Notification de changement (lieu, horaire, annulation)
- Commenter sur le fil du Moment
- Découvrir le Circle et ses prochains Moments

## Répertoire public

- Annuaire simple de Circles publics
- Filtrable par thème et localisation
- Sans algorithme de ranking, sans promoted content

---

# 6. Monétisation

## Base

- 100% gratuit pour les Hosts et les Players
- Aucune commission plateforme
- Seuls les frais Stripe (~2.9% + 0.30$) s'appliquent sur les Moments payants
- The Playground ne prend aucune marge sur les transactions

## Évolution possible

- Plan Pro :
  - Analytics avancés
  - Branding personnalisé
  - IA avancée (analyse no-show, insights, optimisation)
  - API complète (lecture + écriture)
  - Communication multi-canal (SMS, push, WhatsApp)

---

# 7. Principes structurants

- Multi-tenant dès le départ
- Architecture hexagonale obligatoire
- Design premium par défaut (chaque page Moment doit être belle sans effort du Host)
- Mobile-first (le parcours Player est optimisé pour mobile)
- Données exportables (export complet Circle : membres, événements, historique)
- Pas d'algorithme de ranking global
- Pas de feed social
- Pas de marketplace (mais un répertoire simple de Circles publics)
- Ownership des données pour les Circles
- Architecture notifications multi-canal dès la conception (V1 = email, puis SMS/push/WhatsApp)
- **UI bilingue dès V1** (FR/EN) avec architecture i18n native pour support multi-langue futur

---

# 8. Différenciation clé

## 1. 100% gratuit

Aucune plateforme concurrente n'offre un service complet sans abonnement ni commission plateforme. Seuls les frais du processeur de paiement (Stripe) s'appliquent.

## 2. Récurrence native (Tracks)

- Génération automatique des Moments
- Statistiques cumulées
- Gestion centralisée

## 3. IA intégrée dès le MVP

Assistant Host pour :

- Génération description Moment
- Génération email d'invitation
- Suggestions titre/description Circle

Évolutions futures :

- Génération agenda
- FAQ automatique
- Post LinkedIn
- Analyse no-show
- Insights performance
- Optimisation créneaux

## 4. Ownership total des données

- Export complet à tout moment (CSV, JSON)
- API ouverte (Pro)
- "Vos données vous appartiennent. Partez quand vous voulez, avec tout."

## 5. Le Moment comme unité virale

Chaque Moment est une page autonome, design premium, optimisée pour le partage social. Le parcours : découvrir un Moment → s'inscrire → découvrir le Circle → rester.

---

# 9. Roadmap

## Phase 1 – Fondation

- Multi-communautés (Circles)
- CRUD Circle / Moment
- Pages Moment autonomes et partageables
- Inscriptions (avec inscription automatique au Circle)
- Liste d'attente avec promotion automatique
- Emails (confirmation, rappels, notifications de changement, communication Host→Players)
- Stripe (événements payants)
- Assistant IA basique (descriptions, emails)
- Répertoire public de Circles
- Export données (CSV)
- Check-in

## Phase 2 – Engagement

- Tracks (séries d'événements récurrents)
- Dashboard analytics simple
- Fil de commentaires enrichi
- Notifications multi-canal (SMS, push)
- Export avancé (JSON, données complètes)
- Améliorations IA (agenda, FAQ, post LinkedIn)

## Phase 3 – Pro & Intelligence

- Plan Pro
- API complète
- IA avancée (analytics comportementales, no-show, optimisation)
- Branding personnalisé
- WhatsApp / intégrations avancées
- Recommandations

---

# 10. Stack technique

- **TypeScript full-stack** (un seul langage front + back, types partagés)
- **Next.js 15** (App Router) — SSR pour les pages Moment, API Routes, i18n
- **Prisma** + **PostgreSQL** — ORM déclaratif, multi-tenant
- **Auth.js** (NextAuth v5) — magic link + OAuth (Google, GitHub), self-hosted
- **Stripe Connect** — paiements avec reversement aux Hosts
- **Tailwind CSS 4** + **shadcn/ui** — design premium par défaut
- **next-intl** — i18n FR/EN natif
- **Resend** + **react-email** — emails transactionnels
- **SDK Anthropic (Claude)** — assistant IA
- **Vercel** (région EU) + **Neon/Supabase** (PostgreSQL serverless EU)
- **pnpm**, **Vitest**, **Playwright**, **GitHub Actions**

Architecture hexagonale : `domain/` (logique métier pure) → `infrastructure/` (Prisma, Stripe, Resend) → `app/` (routes Next.js).

---

# 12. Orientation stratégique

The Playground est :

- Un SaaS multi-communautés
- Potentiellement indépendant de The Spark
- Utilisable en dogfooding immédiat
- Construit comme produit scalable
- Positionné en référence design (Luma comme benchmark UX)
- Lancement France d'abord, puis expansion européenne et internationale

---

# 13. Questions ouvertes

*(aucune pour le moment)*
