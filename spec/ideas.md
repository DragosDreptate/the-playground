# Idées — The Playground

> Parking d'idées non qualifiées. **Ne pas traiter directement.**
> Une idée devient actionable uniquement quand elle est **promue** dans `spec/BACKLOG.md` (sur demande explicite, avec cadrage en 5 champs).
> Ce fichier peut contenir du bruit, des doublons, des demi-phrases. C'est normal, c'est le rôle du parking.

---

## Fonctionnalités produit — Phase 2

- **Track** — série d'événements récurrents dans une Communauté (retiré du MVP v1).
- **Check-in** — marquer présent sur place (retiré du MVP v1).
- **Galerie photos post-événement** — upload par Participants et Organisateur après un événement `PAST`. Galerie sur `/m/[slug]` et page Communauté. Modération par l'Organisateur. CTA "Voir les photos" dans l'email post-événement. Infrastructure `StorageService` (Vercel Blob) déjà en place.
- **Dupliquer un événement** — bouton "Dupliquer" sur un événement existant pour pré-remplir le formulaire de création avec les mêmes infos (titre, lieu, description, capacité, prix). Gain de temps pour les événements récurrents similaires.
- **Statut "Proposé" + vote Communauté** — nouveau statut `PROPOSED` visible uniquement des Membres `ACTIVE`. Permet de voter (pour / contre / peut-être) sur une proposition (lieu, date, description). Objectif : feedback amont, implication des Membres, réduction du risque. Workflow : `DRAFT → PROPOSED → PUBLISHED` (retour possible à `DRAFT`). Spec : `spec/features/moment-proposed-vote.md`.
- **API publique v1** — permettre aux Organisateurs de créer/gérer des événements et récupérer les données via API REST + webhooks sortants. Débloque les intégrations (automatisation, CRM, bots). Spec : `spec/features/public-api-v1.md`.
- **Plan Pro** — analytics avancés, branding personnalisé, IA avancée, API, notifications multi-canal.
- **White-label / mono-community** — `spec/product/white-label-mono-community.md`.

## Qualité & Sécurité (quand maturité suffisante)

- **Visual regression testing** (Chromatic / Percy).
- **SAST complet** (Snyk / SonarCloud) — le DAST ZAP baseline est déjà en CI.
- **Load testing** (k6 / Artillery) — uniquement en phase pré-lancement.
- **Pentest externe** — pré-lancement.

## Performance DB

- **Migrer vers le driver WebSocket Neon** (`@neondatabase/serverless` Pool mode) — connexions TCP concurrentes sur cold start Vercel causent 650-750ms d'attente. WebSocket = HTTP upgrade, plus rapide, conçu pour Vercel Serverless + Neon.

## Améliorations Stripe / événements payants

> Issues identifiées pendant l'implémentation Stripe Connect (mars 2026). Non bloquantes.

- **Redesign bloc CTA + Participants** — dédupliquer les stats (inscrits + places) entre bloc CTA et bloc Participants. Intégrer la politique de remboursement.
- **Section Paiements à la création de Communauté** — afficher en mode désactivé sur la page de création ("Disponible après la création").
- **Sécuriser checkout-return URL** — remplacer `userId` / `momentId` dans les query params par le Stripe Checkout Session ID. Récupérer les metadata côté serveur.
- **Renommer `isDemoEmail`** — filtre aussi `@test.playground`, nom trompeur. Renommer en `isFilteredEmail` ou `isNonDeliverableEmail`.
- **Frais Stripe non remboursés** — Stripe ne rembourse pas ses frais (~0,59€/transaction). Si abus, ajouter limite temporelle (ex. remboursable jusqu'à 24h avant).
- **Guard payant + approbation** — interdire `price > 0 AND requiresApproval = true`. Le webhook crée REGISTERED directement et bypass l'approbation. Court terme : guard dans `createMoment`.
