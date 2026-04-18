# Cadrage projet THE PLAYGROUND

## Tagline

**EN**
Build your community. Host your events. Own your audience.

**FR**
Lancez votre communauté. Organisez vos événements. Animez votre réseau.

---

# 1. Vision

**Le modèle Meetup avec l'expérience Luma, 100% gratuit.**

The Playground est une plateforme **community-centric** (pas event-centric) permettant à toute communauté de :

- Lancer et structurer une Communauté persistante
- Organiser des événements comme points de rendez-vous récurrents
- Gérer des séries récurrentes (Tracks — Phase 2)
- Fidéliser ses membres dans la durée (rétention via la Communauté)
- Monétiser (ou pas) ses événements
- Conserver la propriété et la maîtrise de son audience

Ce n'est pas un réseau social.
Ce n'est pas une marketplace.
C'est une infrastructure communautaire.

---

# 2. Positionnement

## Deux références, un produit

| | Meetup.com | Luma (lu.ma) | The Playground |
|---|---|---|---|
| **On prend** | Le modèle communautaire : groupes persistants, membres, événements récurrents | L'expérience UI/UX : pages premium, friction zéro, mobile-first, design soigné | Les deux |
| **On ne prend pas** | L'UX datée, le paywall organisateur, l'inscription lourde | L'absence de rétention : pas de communauté, événement terminal | — |

- **Meetup** = bon modèle (communautés persistantes), mauvaise expérience (UX datée, paywall organisateur)
- **Luma** = bonne expérience (design premium, friction zéro), pas de rétention (event-centric, pas de communauté durable)
- **The Playground** = le meilleur des deux + 100% gratuit

## Community-centric vs Event-centric

**Luma (event-centric)** : créer un événement → des gens viennent → ils repartent → recommencer à zéro. L'événement est terminal.

**The Playground (community-centric)** : créer une Communauté → des gens rejoignent via un événement → ils restent membres → les événements suivants sont des points de rendez-vous dans une communauté vivante.

```
Luma:           Événement → Inscription → Événement a lieu → Fin (pas de rétention)
The Playground: Événement → Inscription → Membre de la Communauté → Prochains événements → Rétention
```

La Communauté est l'entité centrale. L'événement est la porte d'entrée virale. La page Communauté est la couche de rétention que Luma n'a pas.

## Problème marché

Les plateformes existantes sont :

- Fermées et payantes pour les organisateurs (Meetup)
- Event-centric sans rétention communautaire (Luma)
- Design daté (Meetup) ou fees élevées (Luma, Eventbrite)
- Centrées sur la plateforme plutôt que sur la communauté

Les communautés bricolent aujourd'hui :
- Formulaires
- Outils de paiement séparés
- Tableurs
- Emails manuels

## Proposition

The Playground est :

- **Community-centric** — la Communauté est l'entité centrale, pas l'événement
- Ouvert et multi-communautés
- Simple (UX Luma)
- IA-native
- Design-first (benchmark Luma)
- Centré sur la propriété des données
- 100% gratuit (seuls les frais Stripe s'appliquent sur les événements payants)

---

# 3. Architecture sémantique

> Note : les termes anglais (`Circle`, `Moment`, `Host`, `Player`) sont utilisés dans le code source, les types, les fichiers et les clés i18n. Les termes ci-dessous sont les concepts tels qu'ils s'appellent dans le code.

## 🌍 The Playground
La plateforme.

## 🔵 The Circle
La Communauté.
Un espace autonome.

## 🟣 The Track *(Phase 2)*
Une série d'événements récurrents au sein d'une Communauté. Retiré du MVP V1.

## 🟡 The Moment
Un événement individuel d'une Communauté (présentiel ou visio). Il peut faire partie d'un Track ou être indépendant. L'événement est la **porte d'entrée virale** de la plateforme : chaque événement dispose d'une page autonome, belle et partageable. Mais l'événement n'est pas terminal — il mène à la Communauté.

## 🧑 The Host
Organisateur d'une Communauté. Son tableau de bord est **Communauté-first** : la Communauté est le cockpit, les événements sont des actions lancées depuis ce cockpit.

## 🎟️ The Player (Member en EN, Participant en FR)
Participant à un événement et membre persistant d'une Communauté. S'inscrire à un événement inscrit automatiquement le Participant à la Communauté organisatrice (de façon transparente). La Communauté se constitue organiquement via les inscriptions aux événements. Après l'événement, le Participant reste membre de la Communauté et découvre les prochains événements.

---

# 4. Modèle conceptuel

## Communauté

Contient :
- Nom
- Description
- Logo
- Organisateurs
- Participants
- Événements
- Visibilité (public / privé sur lien)
- Catégorie (`CircleCategory`)
- Ville (string libre)

## Track

- Nom
- Description
- Règle de récurrence
- Événements associés
- Statistiques consolidées

## Événement

- Titre
- Description
- Date
- Lieu / lien visio
- Capacité
- Prix (gratuit ou payant)
- Liste d'attente (promotion automatique en cas de désistement)
- Participants inscrits
- Fil de commentaires (tout utilisateur authentifié)
- URL partageable dédiée

---

# 5. MVP V1

## Côté Organisateur

- Créer une Communauté ✅
- Créer un événement (page autonome et partageable) ✅
- Paramétrer :
  - Capacité ✅
  - Gratuit / Payant ✅ (Stripe Connect — livré v2.0.0)
- Voir les Participants inscrits ✅
- Gestion de la liste d'attente ✅
- Export CSV des inscrits ✅ (colonnes : prénom, nom, email, statut, date)
- Export données Communauté (membres, historique) — *pas encore implémenté*
- Communiquer avec les Participants inscrits (email direct groupé) — *pas encore implémenté* *(l'invitation Communauté "Broadcast" sur un événement est implémentée — bouton "Inviter ma Communauté" — mais pas l'email groupé libre Organisateur → Participants)*
- Retirer un membre de la Communauté ✅ (avec annulation automatique des inscriptions à venir)
- Inviter par lien privé ✅ (token d'invitation unique sur la Communauté, page `/circles/join/[token]`)
- Assistant IA basique *(pas encore implémenté)*

## Côté Participant

- Découvrir un événement via un lien partagé (page autonome, design premium) ✅
- S'inscrire à un événement (= rejoindre la Communauté automatiquement, zéro friction) ✅
- Payer si nécessaire (Stripe) ✅ (Stripe Connect — livré v2.0.0)
- Recevoir les notifications email :
  - Confirmation d'inscription ✅
  - Confirmation liste d'attente ✅
  - Promotion liste d'attente ✅
  - Rappel 24h avant ✅ (livré v1.15.0)
  - ~~Rappel 1h avant~~ *(pas encore implémenté — backlog #001)*
  - Notification de changement (lieu, horaire) ✅
  - Notification d'annulation ✅
- Commenter sur le fil de l'événement ✅
- Notification Organisateur lors d'un nouveau commentaire ✅
- **Après l'événement** : découvrir la page Communauté, les prochains événements, les autres membres → rétention ✅

## Explorer (découverte publique) ✅

- Annuaire simple de Communautés publiques ✅
- Filtrable par thème (catégorie), ville en affichage uniquement (pas de filtre MVP) ✅
- Tab Événements : agenda chronologique des événements à venir de Communautés publiques ✅
- Sans algorithme de ranking, sans promoted content ✅

---

# 6. Monétisation

## Base

- 100% gratuit pour les Organisateurs et les Participants
- Aucune commission plateforme
- Seuls les frais Stripe (~2.9% + 0.30$) s'appliquent sur les événements payants
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
- Design premium par défaut (chaque page événement doit être belle sans effort de l'Organisateur)
- Mobile-first (le parcours Participant est optimisé pour mobile)
- Données exportables (export complet Communauté : membres, événements, historique)
- Pas d'algorithme de ranking global
- Pas de feed social
- Pas de marketplace (mais Explorer : annuaire simple de Communautés publiques)
- Ownership des données pour les Communautés
- Architecture notifications multi-canal dès la conception (V1 = email, puis SMS/push/WhatsApp)
- **UI bilingue dès V1** (FR/EN) avec architecture i18n native pour support multi-langue futur

---

# 8. Différenciation clé

## 1. Community-centric (modèle Meetup) + UX premium (expérience Luma)

The Playground combine le meilleur de deux mondes :
- **De Meetup** : communautés persistantes, membres, événements récurrents dans un groupe, répertoire de découverte
- **De Luma** : pages événement premium, inscription sans friction, design mobile-first, minimalisme

Ce que Luma n'a pas : la rétention. Un événement Luma est terminal. Un événement The Playground mène à la Communauté, qui retient les membres dans la durée.

Ce que Meetup n'a pas : l'expérience. Le design Meetup est daté, l'inscription est lourde, le paywall bloque les organisateurs.

## 2. 100% gratuit

Aucune plateforme concurrente n'offre un service complet sans abonnement ni commission plateforme. Seuls les frais du processeur de paiement (Stripe) s'appliquent.

## 3. La page Communauté = couche de rétention

La page Communauté montre les prochains événements, les événements passés, les membres et l'identité de la communauté. C'est ce qui transforme des participants ponctuels en membres fidèles. Luma n'a pas d'équivalent.

## 4. Récurrence native (Tracks — Phase 2)

- Génération automatique des événements
- Statistiques cumulées
- Gestion centralisée

## 5. IA intégrée (Phase 2 — partiellement implémentée)

> **Note** : L'IA pour l'assistant Organisateur a été déprioritisée pour le MVP. Le SDK Anthropic est intégré à la stack. Un premier usage IA a été implémenté en Phase 2 (Radar concurrentiel — POC lab).

Premier usage IA implémenté :

- **Radar concurrentiel** ✅ (POC `/lab/events-radar`) — agent Claude qui analyse les événements concurrents (Luma, Meetup, Eventbrite) pour une ville et un créneau donnés

Assistant Organisateur prévu (pas encore implémenté) :

- Génération description événement
- Génération email d'invitation
- Suggestions titre/description Communauté

Évolutions futures :

- Génération agenda
- FAQ automatique
- Post LinkedIn
- Analyse no-show
- Insights performance
- Optimisation créneaux

## 6. Ownership total des données

- Export complet à tout moment (CSV, JSON)
- API ouverte (Pro)
- "Vos données vous appartiennent. Partez quand vous voulez, avec tout."

## 7. L'événement comme porte d'entrée virale

Chaque événement est une page autonome, design premium (benchmark Luma), optimisée pour le partage social. Mais contrairement à Luma, l'événement n'est pas terminal. Le parcours : découvrir un événement → s'inscrire → devenir membre de la Communauté → découvrir les prochains événements → rester.

---

# 9. Roadmap

## Phase 1 – Fondation

- Multi-communautés ✅
- CRUD Communauté / événement ✅
- Pages événement autonomes et partageables ✅
- Inscriptions (avec inscription automatique à la Communauté) ✅
- Liste d'attente avec promotion automatique ✅
- Emails transactionnels (confirmation inscription, liste d'attente, promotion, notification Organisateur nouvelle inscription, notification Organisateur nouveau commentaire, mise à jour événement, annulation événement, confirmation publication événement, notification nouvel événement dans communauté aux membres à la publication, broadcast "Inviter ma Communauté") ✅
- Stripe Connect (événements payants) ✅ — livré v2.0.0
- Assistant IA basique (descriptions, emails) — pas encore implémenté
- Explorer (répertoire public de Communautés + événements) ✅
- Export données (CSV inscrits) ✅ — export membres Communauté et export historique pas encore implémentés
- Admin plateforme (dashboard stats, listes paginées, modération) ✅
- Gestion membres Communauté : retrait de membre ✅, invitation par lien privé (token) ✅

## Phase 2 – Engagement

- Tracks (séries d'événements récurrents)
- Check-in le jour J
- [ ] **Suivre une Communauté (Follow)** — *système Follow supprimé (2026-03-14), remplacé par `joinCircleDirectly` (adhésion directe PLAYER)*. À repenser si une fonctionnalité d'abonnement sans adhésion est souhaitée.
- [x] **Radar concurrentiel** ✅ — POC `/lab/events-radar` : agent IA (Claude) qui scrape Luma, Meetup, Eventbrite pour trouver les événements concurrents dans une ville et un créneau donnés. `RadarUsage` en DB pour le rate-limiting.
- Dashboard analytics simple
- Fil de commentaires enrichi
- Notifications multi-canal (SMS, push)
- Emails enrichis (rappels 24h avant l'événement ✅ — livré v1.15.0 ; rappel 1h avant — pas encore implémenté)
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
- **Next.js 16** (App Router) — SSR pour les pages événement, API Routes, i18n
- **Prisma** + **PostgreSQL** — ORM déclaratif, multi-tenant
- **Auth.js** (NextAuth v5) — magic link + OAuth (Google, GitHub), self-hosted
- **Stripe Connect** — paiements avec reversement aux Organisateurs
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

- Un SaaS multi-communautés, **community-centric** (pas event-centric)
- Le modèle fonctionnel de Meetup (communautés persistantes, membres, récurrence) avec l'expérience UI/UX de Luma (design premium, friction zéro)
- 100% gratuit — différenciation radicale vs tous les concurrents
- Potentiellement indépendant de The Spark
- Utilisable en dogfooding immédiat
- Construit comme produit scalable
- Lancement France d'abord, puis expansion européenne et internationale

---

# 13. Questions ouvertes

*(aucune pour le moment)*
