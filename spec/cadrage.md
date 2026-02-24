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

- Lancer et structurer une communauté persistante (Circle)
- Organiser des événements (Moments) comme points de rendez-vous récurrents
- Gérer des séries récurrentes (Tracks — Phase 2)
- Fidéliser ses membres dans la durée (rétention via le Circle)
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

**The Playground (community-centric)** : créer un Circle → des gens rejoignent via un Moment → ils restent membres → les Moments suivants sont des points de rendez-vous dans une communauté vivante.

```
Luma:           Event → Inscription → Event a lieu → Fin (pas de rétention)
The Playground: Moment → Inscription → Membre du Circle → Prochains Moments → Rétention
```

Le Circle est l'entité centrale. Le Moment est la porte d'entrée virale. La page Circle est la couche de rétention que Luma n'a pas.

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

- **Community-centric** — le Circle (communauté) est l'entité centrale, pas l'événement
- Ouvert et multi-communautés
- Simple (UX Luma)
- IA-native
- Design-first (benchmark Luma)
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
Un événement individuel d'une communauté (présentiel ou visio). Il peut faire partie d'un Track ou être indépendant. Le Moment est la **porte d'entrée virale** de la plateforme : chaque Moment dispose d'une page autonome, belle et partageable. Mais le Moment n'est pas terminal — il mène au Circle.

## 🧑 The Host
Organisateur d'un Circle. Son dashboard est **Circle-first** : le Circle est le cockpit, les Moments sont des actions lancées depuis ce cockpit.

## 🎟️ The Player (Member en EN, Participant en FR)
Participant à un Moment et membre persistant d'un Circle. S'inscrire à un Moment inscrit automatiquement le Player au Circle organisateur (de façon transparente). Le Circle se constitue organiquement via les inscriptions aux Moments. Après le Moment, le Player reste membre du Circle et découvre les prochains Moments.

---

# 4. Modèle conceptuel

## Circle

Contient :
- Nom
- Description
- Logo
- Hosts
- Players
- Moments
- Visibilité (public / privé sur lien)
- Catégorie (`CircleCategory`)
- Ville (string libre)

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
- Fil de commentaires (Players inscrits)
- URL partageable dédiée

---

# 5. MVP V1

## Côté Host

- Créer un Circle ✅
- Créer un Moment (page autonome et partageable) ✅
- Paramétrer :
  - Capacité ✅
  - Gratuit / Payant *(Stripe Connect — pas encore implémenté)*
- Voir les Players inscrits ✅
- Gestion de la liste d'attente ✅
- Export données (CSV participants, données Circle) *(pas encore implémenté)*
- Communiquer avec les Players inscrits (email direct) *(pas encore implémenté)*
- Assistant IA basique *(pas encore implémenté)*

## Côté Player

- Découvrir un Moment via un lien partagé (page autonome, design premium) ✅
- S'inscrire à un Moment (= rejoindre le Circle automatiquement, zéro friction) ✅
- Payer si nécessaire (Stripe) *(Stripe Connect — pas encore implémenté)*
- Recevoir les notifications email :
  - Confirmation d'inscription ✅
  - Confirmation liste d'attente ✅
  - Promotion liste d'attente ✅
  - ~~Rappel 24h avant~~ *(déprioritisé → Phase 2)*
  - ~~Rappel 1h avant~~ *(déprioritisé → Phase 2)*
  - Notification de changement (lieu, horaire, annulation) *(post-MVP)*
- Commenter sur le fil du Moment ✅
- Notification Host lors d'un nouveau commentaire ✅
- **Après le Moment** : découvrir la page Circle, les prochains Moments, les autres membres → rétention ✅

## Découvrir (découverte publique) ✅

- Annuaire simple de Circles publics ✅
- Filtrable par thème (catégorie), ville en affichage uniquement (pas de filtre MVP) ✅
- Tab Événements : agenda chronologique des événements à venir de Circles publics ✅
- Sans algorithme de ranking, sans promoted content ✅

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
- Pas de marketplace (mais Découvrir : annuaire simple de Circles publics)
- Ownership des données pour les Circles
- Architecture notifications multi-canal dès la conception (V1 = email, puis SMS/push/WhatsApp)
- **UI bilingue dès V1** (FR/EN) avec architecture i18n native pour support multi-langue futur

---

# 8. Différenciation clé

## 1. Community-centric (modèle Meetup) + UX premium (expérience Luma)

The Playground combine le meilleur de deux mondes :
- **De Meetup** : communautés persistantes, membres, événements récurrents dans un groupe, répertoire de découverte
- **De Luma** : pages événement premium, inscription sans friction, design mobile-first, minimalisme

Ce que Luma n'a pas : la rétention. Un événement Luma est terminal. Un Moment The Playground mène au Circle, qui retient les membres dans la durée.

Ce que Meetup n'a pas : l'expérience. Le design Meetup est daté, l'inscription est lourde, le paywall bloque les organisateurs.

## 2. 100% gratuit

Aucune plateforme concurrente n'offre un service complet sans abonnement ni commission plateforme. Seuls les frais du processeur de paiement (Stripe) s'appliquent.

## 3. La page Circle = couche de rétention

La page Circle montre les prochains Moments, les Moments passés, les membres et l'identité de la communauté. C'est ce qui transforme des participants ponctuels en membres fidèles. Luma n'a pas d'équivalent.

## 4. Récurrence native (Tracks — Phase 2)

- Génération automatique des Moments
- Statistiques cumulées
- Gestion centralisée

## 5. IA intégrée dès le MVP

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

## 6. Ownership total des données

- Export complet à tout moment (CSV, JSON)
- API ouverte (Pro)
- "Vos données vous appartiennent. Partez quand vous voulez, avec tout."

## 7. Le Moment comme porte d'entrée virale

Chaque Moment est une page autonome, design premium (benchmark Luma), optimisée pour le partage social. Mais contrairement à Luma, le Moment n'est pas terminal. Le parcours : découvrir un Moment → s'inscrire → devenir membre du Circle → découvrir les prochains Moments → rester.

---

# 9. Roadmap

## Phase 1 – Fondation

- Multi-communautés (Circles) ✅
- CRUD Circle / Moment ✅
- Pages Moment autonomes et partageables ✅
- Inscriptions (avec inscription automatique au Circle) ✅
- Liste d'attente avec promotion automatique ✅
- Emails transactionnels (confirmation inscription, liste d'attente, promotion, notification Host nouvelle inscription, notification Host nouveau commentaire) ✅
- Stripe Connect (événements payants) — pas encore implémenté
- Assistant IA basique (descriptions, emails) — pas encore implémenté
- Découvrir (répertoire public de Circles + événements) ✅
- Export données (CSV) — pas encore implémenté
- Admin plateforme (dashboard stats, listes paginées, modération) ✅

## Phase 2 – Engagement

- Tracks (séries d'événements récurrents)
- Check-in le jour J
- Dashboard analytics simple
- Fil de commentaires enrichi
- Notifications multi-canal (SMS, push)
- Emails enrichis (rappels 24h/1h, notifications de changement, communication Host→Players)
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
