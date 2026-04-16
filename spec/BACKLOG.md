# Backlog — The Playground

> Ce fichier fait foi pour le **périmètre complet du produit** : ce qui est livré, ce qui reste à faire, et ce qui est prévu pour la suite.
> Organisé par domaine fonctionnel. Chaque feature livrée renvoie vers sa spec et sa version de release.
>
> **Sources de vérité** : page Aide (`Help` dans `messages/fr.json`), page Changelog (`CHANGELOG.md`), historique Git/PRs.
>
> **Dernière mise à jour** : 2026-04-12 (v2.7.0)

---

## Table des matières

1. [Fait (livré)](#fait-livré)
2. [À faire — Produit](#à-faire--produit)
3. [À faire — Infrastructure & Qualité](#à-faire--infrastructure--qualité)
4. [Phase 2 (post-MVP)](#phase-2-post-mvp)
5. [Bugs connus](#bugs-connus)
6. [Améliorations futures — Stripe](#améliorations-futures--stripe)
7. [Décisions clés](#décisions-clés)

---

## Fait (livré)

> 31 versions livrées (v0.1.0 → v2.7.0), 100+ features. Organisées par domaine fonctionnel.

### Authentification & Profil

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Auth magic link + OAuth Google/GitHub (Auth.js v5) | v0.1.0 | — |
| Onboarding profil obligatoire au premier login | v0.2.0 | `spec/product/options-onboarding.md` |
| Isolation onboarding (route group Next.js, layout minimal) | v0.2.0 | — |
| Upload avatar (resize Canvas → WebP 384×384, Vercel Blob) | v0.8.0 | — |
| Suppression de compte (cascade Communauté si seul Organisateur) | v0.8.0 | — |
| Profils publics `/u/[identifier]` (lien unique, membres cliquables) | v1.11.0 | `spec/features/virality-public-profiles.md` |
| Page de bienvenue `/dashboard/welcome` (choix Participant/Organisateur) | v1.6.0 | — |
| Profils enrichis (bio, ville, liens réseaux sociaux) | v2.6.0 | — |
| Email de bienvenue personnalisé (lettre du fondateur post-onboarding) | v2.7.0 | `spec/features/email-onboarding.md` |

### Communautés (Circles)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| CRUD Communauté (domain, tests, UI, i18n) | v0.1.0 | — |
| Page publique `/circles/[slug]` (SEO, cold traffic, sans compte) | v0.5.0 | `spec/features/explorer-la-carte.md` |
| Catégorie (enum 8 valeurs) + ville sur Communauté | v0.5.0 | — |
| Catégorie personnalisée (`customCategory` si `OTHER`) | v1.0.0 | — |
| Cover image (Unsplash via proxy + upload local, Vercel Blob) | v1.0.0 | — |
| Liste des membres (Organisateurs avec Crown, emails Organisateur-only) | v1.1.0 | — |
| Rejoindre une Communauté directement (`JoinCircleButton`, remplace Follow) | v1.13.0 | — |
| Suppression de membre (`removeCircleMember`) | v1.10.0 | — |
| Invitation par lien privé (token unique, génération/révocation) | v1.10.0 | `spec/features/bulk-invite.md` |
| Quitter une Communauté (depuis page publique) | v1.9.0 | — |
| Site web Communauté (URL affichée sur dashboard et page invitation) | v2.6.0 | — |
| Réseaux de Communautés (regroupement, page partagée, badge) | v2.6.0 | `spec/features/circle-network.md` |

### Événements (Moments)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| CRUD événement + page publique `/m/[slug]` (URL partageable) | v0.1.0 | — |
| Formulaire création minimaliste (titre, date, lieu, description) | v0.1.0 | — |
| Autocomplétion adresse (Google Places) | v1.10.0 | — |
| Fil de commentaires (plat, chronologique, max 2000 chars) | v0.3.0 | — |
| Commentaires activés sur événements passés | v1.5.0 | — |
| URLs cliquables dans descriptions et commentaires | v1.13.0 | — |
| Événements passés accessibles (UI "Événement terminé" + CTA rétention) | v0.4.0 | — |
| Statut Brouillon (DRAFT → PUBLISHED, sens unique) | v1.13.0 | — |
| Publication directe depuis le formulaire de création | v2.7.0 | — |
| Cover image événement (Unsplash contextuel lié au titre + upload) | v2.7.0 | — |
| Pièces jointes (PDF + images, max 3 par événement) | v2.7.0 | `spec/features/moment-attachments.md` |
| Section "Prochains événements de la Communauté" sur page événement | v1.5.0 | — |
| Ajout au calendrier (Google Calendar, Apple Calendar, .ics) | v0.8.0 | — |
| Dates verrouillées sur événements passés | v1.15.0 | — |
| Mention "Proposé par [Communauté]" sur page événement | v1.15.0 | — |

### Inscriptions & Liste d'attente

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Inscription + auto-join Communauté (zéro friction) | v0.2.0 | — |
| Annulation inscription + promotion automatique liste d'attente | v0.2.0 | — |
| Position dans la liste d'attente visible (Xème) | v0.8.0 | — |
| Blocage inscription si événement commencé (`MomentAlreadyStartedError`) | v0.2.0 | — |
| Ré-inscription après annulation (update, pas de doublon) | v0.2.0 | — |
| Inscriptions sur validation (approbation Organisateur, par événement ou Communauté) | v1.17.0 | `spec/features/approval-registration.md` |
| File d'attente approbation dans le dashboard Organisateur | v1.17.0 | — |
| Suppression de participant par l'Organisateur | v1.16.0 | — |

### Paiements (Stripe Connect)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Événements payants avec prix configurable (en centimes) | v2.0.0 | `spec/features/stripe-connect.md` |
| Stripe Connect onboarding Organisateur | v2.0.0 | — |
| Politique de remboursement configurable par événement | v2.0.0 | — |
| Remboursements automatiques (annulation participant, suppression, annulation événement) | v2.0.0 | — |
| Remboursements batch à la suppression d'événement | v2.0.0 | — |
| 0% commission plateforme (seuls frais Stripe ~2.9% + 0.30€) | v2.0.0 | — |
| Résumé facturation sur page Organisateur | v2.0.0 | — |
| Accès dashboard Stripe Express | v2.0.0 | — |

### Emails & Notifications

| Feature | Version | Spec / PR |
| --- | --- | --- |
| **Architecture** : port `EmailService` (14+ méthodes) + adapter `ResendEmailService` | v0.7.0 | `spec/features/email-transactional.md` |
| Templates React (react-email) avec calendar badge gradient | v0.7.0 | — |
| Magic link email avec logo PNG embarqué base64 | v0.7.0 | — |
| Confirmation inscription (+ variante liste d'attente) | v0.7.0 | — |
| Promotion liste d'attente | v0.7.0 | — |
| Notification Organisateur : nouvelle inscription | v0.7.0 | — |
| Notification : nouveau commentaire (tous les inscrits + Organisateurs) | v1.5.0 | — |
| Notification : nouveau membre rejoint la Communauté | v1.14.0 | — |
| Notification : nouvel événement publié dans la Communauté | v1.5.0 | — |
| Notification : mise à jour événement (date/lieu changés) | v1.3.0 | — |
| Notification : annulation événement (tous les inscrits REGISTERED) | v1.5.0 | — |
| Confirmation Organisateur à la création (avec .ics) | v1.5.0 | — |
| Rappel automatique 24h avant événement (cron Vercel horaire) | v1.15.0 | — |
| Broadcast "Inviter ma Communauté" (cooldown 24h, message personnalisable) | v1.9.0 | — |
| Email confirmation paiement (avec reçu) | v2.0.0 | — |
| Email notification annulation payante (pour l'Organisateur) | v2.0.0 | — |
| Notification Organisateur : demande d'adhésion (approbation) | v2.3.1 | — |
| Email de bienvenue personnalisé (lettre fondateur) | v2.7.0 | `spec/features/email-onboarding.md` |
| Préférences de notifications (3 toggles opt-out sur profil) | v1.2.0 | — |

### Dashboard (Mon espace)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Vue Participant / Organisateur (mode switcher persisté en DB + session) | v1.6.0 | — |
| Timeline événements (à venir + passés) avec badges statut | v0.2.0 | — |
| Onglet Communautés (cards avec stats membres/événements, prochain événement) | v1.0.0 | — |
| Pagination événements passés (5 par défaut + "Voir plus") | v2.4.0 | — |
| Export CSV des inscrits (prénom, nom, email, statut, date) | v1.5.0 | — |
| CTA "Créer un événement" adaptatif (0/1/2+ Communautés) | v1.6.0 | — |
| Badge réseau sur les Communautés du dashboard | v2.7.0 | — |
| Compteurs inscrits/liste d'attente sur page Organisateur | v0.2.0 | — |
| Perf : `React.cache()` pour `getUserDashboardCircles` (754ms → 192ms, -75%) | v1.5.0 | — |
| CTA "Mes inscriptions" post-inscription (bouton dans le banner confirmation → `/dashboard?tab=moments`) | v2.8.0 | — |

### Explorer (Découvrir)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Page `/explorer` (tabs Communautés/Événements, SSR, revalidate 300s) | v0.5.0 | `spec/features/explorer-la-carte.md` |
| Section "À la une" (3 Communautés featured, cinématique, renouvellement quotidien) | v1.13.0 | — |
| Filtres catégorie + tri (Recommandé / Popularité / Date) | v1.13.0 | — |
| Format liste | v1.13.0 | — |
| Pagination "Voir plus" (lazy loading) | v1.1.0 | — |
| Score de classement automatique (`recalculate-scores` cron quotidien) | v1.13.0 | `spec/features/explorer-rating.md` |
| Visibilité immédiate nouvelles Communautés + recalcul manuel (admin) | v1.16.0 | — |

### Radar (planification événements)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Radar d'événements concurrents (Luma, Eventbrite, Meetup) | v1.8.0 | `spec/features/local-events-watcher.md` |
| Interface : sélecteur ville, dates, mots-clés, streaming résultats | v1.8.0 | — |
| Mots-clés personnalisés (ajout/modification/suppression) | v2.1.0 | — |
| Limité aux événements physiques uniquement | v2.1.0 | — |
| 25 analyses/jour par utilisateur | v2.1.0 | — |

### Admin plateforme

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Dashboard stats + listes paginées (Utilisateurs/Communautés/Événements) | v0.6.0 | `spec/features/admin-plateforme.md` |
| Suppression + forcer annulation événement | v0.6.0 | — |
| Courbes d'activité 30 jours enrichies | v1.12.0 | — |
| Pages analytics détaillées (inscriptions, commentaires, avec graphiques) | v1.13.0 | — |
| Taux d'activation (utilisateurs ayant rejoint ≥1 événement) | v1.12.0 | — |
| Tri colonnes + responsive hamburger menu | v1.13.0 | — |
| Gestion visibilité Explorer + recalcul scores | v1.16.0 | — |
| Historique événements dans la fiche utilisateur | v2.3.0 | — |
| Notifications Slack admin | v2.2.0 | — |

### SEO & Contenu

| Feature | Version | Spec / PR |
| --- | --- | --- |
| OG images dynamiques (homepage, événement, Communauté) | v0.8.0 | `spec/infra/seo-strategy.md` |
| `generateMetadata`, `metadataBase`, `robots.ts`, `sitemap.ts` | v0.8.0 | — |
| Structured data enrichies (événements : description, image, prix, disponibilité) | v2.4.0 | — |
| Canonical + hreflang sur pages publiques | v2.4.0 | — |
| Blog bilingue FR/EN (5 articles) | v2.5.0 | `spec/features/blog-seo.md` |
| Sections comparison/audience/FAQ structurée sur homepage | v2.5.0 | — |
| Redirection intelligente homepage (selon contexte utilisateur) | v2.3.0 | — |

### Pages institutionnelles

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Homepage (hero, "Comment ça marche", 3 piliers, CTA, footer) | v0.5.0 | — |
| About `/about` | v0.10.0 | — |
| Changelog `/changelog` + réécriture automatique en langage utilisateur | v0.10.0 | — |
| Contact `/contact` (formulaire + email direct) | v1.16.0 | — |
| Pages légales (mentions légales, confidentialité, CGU) | v0.8.0 | — |
| Page Aide `/help` (sidebar navigation, FAQ accordion, sections Participant/Organisateur) | v1.10.0 | `spec/product/help-page-content.md` |

### Infrastructure & DevOps

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Neon branching dev/prod + `db:dev:reset` | v0.1.0 | — |
| Sentry error tracking (client/server/edge) | v0.2.0 | — |
| PostHog product analytics | v0.2.0 | — |
| Rapports PostHog quotidiens/hebdomadaires (cron email + Slack) | v2.7.0 | — |
| CI : typecheck + tests unitaires sur chaque PR | v0.5.0 | — |
| CI : DAST ZAP baseline hebdomadaire + full scan manuel | v1.13.0 | — |
| CI : Release Please v17 (changelog automatique) | v1.5.0 | — |
| PWA installable iOS (Safari) + Android (Chrome) | v1.3.0 | — |
| Version affichée dans le footer | v1.3.0 | — |
| Scripts seed test + démo (idempotent, variantes prod) | v0.4.0 | — |
| Scripts export contacts Brevo, backfill notification prefs, dashboard mode | — | — |

### i18n (internationalisation)

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Français + Anglais natifs (next-intl) | v0.1.0 | — |
| Espagnol | v1.7.0 | — |
| Roumain | v1.7.0 | — |
| Néerlandais | v1.7.0 | — |

### Design & UX

| Feature | Version | Spec / PR |
| --- | --- | --- |
| Design system dark/light (Tailwind + shadcn/ui) | v0.1.0 | `spec/design/design-system.md` |
| Responsive mobile complet (hamburger menu, cards compactes, hero centré) | v0.8.0 | — |
| Covers carrées 1:1 partout (règle absolue) | v1.0.0 | — |
| Avatar stacking (inscrits sur les cartes événement) | v2.3.0 | — |
| CoverImagePicker (Unsplash contextuel + pagination + import drag-and-drop) | v1.0.0 | — |

### Tests & Qualité

| Feature | Version | Spec / PR |
| --- | --- | --- |
| 690+ tests unitaires Vitest (37 usecases domaine + 11 admin) | — | — |
| 99+ tests de sécurité (RBAC, IDOR cross-tenant, admin, avatar isolation, invite token) | — | — |
| 11 specs E2E Playwright (auth, join, host-flow, cancel, comments, onboarding, waitlist, explore, dashboard-mode, broadcast, circle-invite) | — | — |
| Infrastructure E2E : globalSetup + globalTeardown (nettoyage `@test.playground`) | — | — |
| Audit sécurité complet | — | `spec/docs/security/AUDIT-2026-04-01.md` |

---

## À faire — Produit

> Référence UX complète : `spec/product/ux-parcours-jtbd.md` (8 personas, 25 JTBD, 7 parcours, matrice gaps).

### Haute priorité — Rétention & croissance

| # | Feature | Contexte | Gap |
| --- | --- | --- | --- |
| P-01 | **Rappel 1h avant événement** | Infra 24h en place (cron, template, batch). Ajout incrémental : champ `reminder1hSentAt`, fenêtre 50min-70min. | — |
| P-02 | **CTA "Créer le prochain événement" depuis un événement PAST** | Vue Organisateur événement passé : bouton "Programmer le prochain événement" (pré-remplir même Communauté). Capitaliser sur l'élan post-événement. | H-2 |
| P-03 | **Guide onboarding Organisateur** | Stepper 3 étapes (Créer Communauté → Créer événement → Partager le lien). Objectif : time-to-first-event < 5 min. La welcome page oriente déjà, mais sans guide pas-à-pas. | H-7 |

### Moyenne priorité

| # | Feature | Contexte | Spec |
| --- | --- | --- | --- |
| P-05 | **Co-Organisateurs** | Plusieurs Organisateurs par Communauté. Nécessite un modèle de permissions. | `spec/features/co-organisateurs.md` |
| P-06 | **Export données Organisateur étendu** | CSV membres Communauté, historique événements, inscrits cumulés. L'export CSV inscrits par événement existe déjà. | — |
| P-07 | **Assistant IA basique** | Description événement, email invitation, suggestions Communauté. SDK Anthropic (Claude). | — |
| P-08 | **Stats Communauté basiques** | Métriques sur la page Communauté Organisateur (tendance membres, taux de remplissage, etc.). | — |
| P-09 | **Notification désinscription (opt-in Organisateur)** | Option dans le profil Organisateur pour recevoir (ou non) une notification quand un Participant se désinscrit d'un événement gratuit. Actuellement seuls les événements payants notifient l'Organisateur. Alignement Meetup (qui notifie systématiquement). | — |
| P-10 | **Refonte UX édition d'événement : transitions de statut via actions contextuelles** | Aujourd'hui le formulaire d'édition expose un combobox de statut. Avec l'ajout de `PROPOSED`, chaque transition a des side-effects distincts (archivage commentaires, reset votes, envoi d'emails, refunds Stripe). Remplacer le combobox par des boutons d'action contextuels propres à chaque statut courant du Moment (ex. `DRAFT` → boutons "Publier" / "Proposer au vote" / "Annuler" ; `PUBLISHED` → "Annuler l'événement"). Voir recommandation dans `spec/features/moment-proposed-vote.md`. | — |

---

## À faire — Infrastructure & Qualité

| # | Feature | Contexte | Spec |
| --- | --- | --- | --- |
| I-01 | **Stratégie migrations DB + rollback prod** | Passer de `db:push` à `prisma migrate`. `db:push` peut silencieusement supprimer des données en prod (drop+recreate sur renommage). Snapshot Neon + PITR comme filet. | `spec/infra/db-migration-rollback-strategy.md` |
| I-02 | **Corriger vulnérabilités dépendances** | `pnpm audit` remontait 6 high + 5 moderate (état 2026-02-27). À réévaluer. | — |
| I-03 | **Pre-commit hooks (Husky + lint-staged)** | Aucun hook git local — erreurs TS/lint détectées uniquement en CI. Hook `pre-commit` + `commit-msg`. | — |
| I-04 | **Retirer \****`unsafe-eval`**\*\* du CSP** | `script-src` inclut `'unsafe-eval'`. Solution : nonces CSP via middleware Next.js. | — |
| I-05 | **CI : \****`pnpm audit --audit-level=high`**\*\* gate bloquant** | Gate manquant en CI. | — |
| I-06 | **CI : Tests d'intégration** | Job dédié avec service PostgreSQL GitHub Actions. | — |
| I-07 | **CI : Lighthouse CI** | Pages clés (`/m/[slug]`, `/`). Seuils : Performance ≥ 90, A11y ≥ 90. | — |
| I-08 | **Rate limiting actions sensibles** | Aucune protection anti-abus. Solution : Upstash Rate Limit. Limites : 10 inscriptions/min/IP, 5 créations/heure/user. | — |
| I-09 | **Accessibilité axe-core dans Playwright** | Intégrer axe-core dans les tests E2E existants. | — |
| I-10 | **Bundle analyzer** | `@next/bundle-analyzer`. Aucune visibilité sur la taille du bundle JS. | — |
| I-11 | **Diagramme d'architecture** | L'architecture hexagonale est documentée textuellement (CLAUDE.md) mais sans schéma visuel. C4 niveau 2 dans `spec/architecture.md`. | — |
| I-12 | **Test unitaire \****`joinCircleDirectly`** | Fichier de test dédié manquant. | — |
| I-13 | **E2E : rejoindre Communauté directement** | Parcours `JoinCircleButton` (sans événement) non couvert en E2E. | — |

---

## Phase 2 (post-MVP)

### Performance DB

- [x] **Migrer vers le driver WebSocket Neon** (`@neondatabase/serverless` Pool mode)
  - Connexions TCP concurrentes sur cold start Vercel causent 650-750ms d'attente
  - WebSocket = HTTP upgrade, plus rapide, conçu pour Vercel Serverless + Neon
  - Pré-requis : baseline propre post React.cache() (déjà en place)

### Fonctionnalités produit

- [ ] **Track** — Série d'événements récurrents dans une Communauté (retiré du MVP v1)
- [ ] **Check-in** — Marquer présent sur place (retiré du MVP v1)
- [ ] **Galerie photos post-événement** — Upload par Participants et Organisateur après un événement PAST. Galerie sur `/m/[slug]` et page Communauté. Modération par l'Organisateur. CTA "Voir les photos" dans l'email post-événement. Infrastructure `StorageService` (Vercel Blob) déjà en place.
- [ ] **Dupliquer un événement** — Bouton "Dupliquer" sur un événement existant pour pré-remplir le formulaire de création avec les mêmes infos (titre, lieu, description, capacité, prix). Gain de temps pour les événements récurrents similaires.
- [ ] **Statut "Proposé" + vote Communauté** — Nouveau statut d'événement `PROPOSED` (en plus de `DRAFT`, `PUBLISHED`, `PAST`), visible uniquement des Membres `ACTIVE` de la Communauté. Permet aux Membres de voter (pour / contre / peut-être) sur la proposition (lieu, date, description) afin de guider l'Organisateur dans sa décision de publier ou de modifier. Objectif : recueillir un feedback en amont, impliquer les Membres, réduire le risque qu'un événement publié ne corresponde pas aux attentes. Sens du workflow : `DRAFT → PROPOSED → PUBLISHED` (avec retour possible à `DRAFT` pour modification). Spec : `spec/features/moment-proposed-vote.md`
- [ ] **API publique v1** — Permettre aux organisateurs de créer/gérer des événements et récupérer les données via API REST + webhooks sortants. Débloque les intégrations avec des systèmes internes (automatisation, CRM, bots). Spec : `spec/features/public-api-v1.md`
- [ ] **Plan Pro** — Analytics avancés, branding personnalisé, IA avancée, API, notifications multi-canal
- [x] **Suppression lien d'invitation** — Remplacer le système de token par email uniquement — `spec/features/remove-invite-token.md`
- [ ] **White-label / mono-community** — `spec/product/white-label-mono-community.md`

### Qualité & Sécurité

- [ ] **Visual regression testing** (Chromatic/Percy)
- [ ] **SAST complet** (Snyk/SonarCloud) — le DAST ZAP baseline est déjà en CI
- [ ] **Load testing** (k6/Artillery) — uniquement en phase pré-lancement
- [ ] **Pentest externe** — pré-lancement

---

## Bugs connus

| # | Description | Statut | Détail |
| --- | --- | --- | --- |
| B-01 | OAuth Google bloquée depuis les navigateurs in-app (Instagram, WhatsApp, Facebook) | **Workaround utilisateur** | Google refuse les WebViews (`Error 403: disallowed_useragent`). Fix possible : détecter le user-agent et afficher un message explicatif sur `/auth/error`. |
| B-04 | Page `/changelog` uniquement en français | **Ouvert** | Contenu de `CHANGELOG.md` rédigé en FR uniquement. Fix possible : deux fichiers FR/EN, ou afficher le même contenu FR (acceptable pour un changelog technique). |

> **Résolus** : B-02 (RangeError changelog, `3fd5a2b`), B-03 (OAuth `redirect_uri_mismatch`, config Vercel `AUTH_URL`).

---

## Améliorations futures — Stripe / Événements payants

> Issues identifiées pendant l'implémentation Stripe Connect (mars 2026). Non bloquantes pour le MVP.

| # | Sujet | Détail |
| --- | --- | --- |
| S-01 | Redesign bloc CTA + Participants | Dédupliquer les stats (inscrits + places) entre le bloc CTA et le bloc Participants. Intégrer la mention de politique de remboursement. |
| S-02 | Section Paiements à la création de Communauté | Afficher la section "Paiements" en mode désactivé sur la page de création (message : "Disponible après la création"). |
| ~~S-03~~ | ~~Banner vert confirmation inscription~~ | Résolu : banner redesigné en style card (`bg-card`) avec icône check emerald. |
| S-04 | Sécuriser checkout-return URL | Remplacer `userId`/`momentId` dans les query params par le Stripe Checkout Session ID. Récupérer les metadata côté serveur. |
| S-05 | Renommer `isDemoEmail` | Le nom est trompeur (filtre aussi `@test.playground`). Renommer en `isFilteredEmail` ou `isNonDeliverableEmail`. |
| S-06 | Frais Stripe non rembours��s | Stripe ne rembourse pas ses frais (~0,59€/transaction). Si abus, ajouter limite temporelle (ex: remboursable jusqu'à 24h avant). |
| S-07 | Guard payant + approbation | Interdire la combinaison `price > 0 AND requiresApproval=true`. Le webhook crée REGISTERED directement, bypass l'approbation. Court terme : guard dans `createMoment`. |

---

## Décisions clés

> Décisions architecturales et produit prises au fil du développement. Les décisions intermédiaires supersédées ont été retirées.

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

---

## Références

### Specs par domaine

| Domaine | Fichier |
| --- | --- |
| Produit — Vision | `spec/product/vision-produit.md` |
| Produit — Cadrage | `spec/product/cadrage.md` |
| Produit — UX / JTBD | `spec/product/ux-parcours-jtbd.md` |
| Produit — Page Aide | `spec/product/help-page-content.md` |
| Produit — Onboarding | `spec/product/options-onboarding.md` |
| Produit — White-label | `spec/product/white-label-mono-community.md` |
| Feature — Explorer | `spec/features/explorer-la-carte.md` |
| Feature — Explorer rating | `spec/features/explorer-rating.md` |
| Feature — Stripe Connect | `spec/features/stripe-connect.md` |
| Feature — Approbation inscriptions | `spec/features/approval-registration.md` |
| Feature — Réseaux Communautés | `spec/features/circle-network.md` |
| Feature — Pièces jointes | `spec/features/moment-attachments.md` |
| Feature — Statut "Proposé" + vote | `spec/features/moment-proposed-vote.md` |
| Feature — Profils publics | `spec/features/virality-public-profiles.md` |
| Feature — Admin plateforme | `spec/features/admin-plateforme.md` |
| Feature — Emails transactionnels | `spec/features/email-transactional.md` |
| Feature — Blog SEO | `spec/features/blog-seo.md` |
| Feature — Email onboarding | `spec/features/email-onboarding.md` |
| Feature — Invitation bulk | `spec/features/bulk-invite.md` |
| Feature — Co-Organisateurs | `spec/features/co-organisateurs.md` |
| Feature — Radar | `spec/features/local-events-watcher.md` |
| Feature — Suppression token invitation | `spec/features/remove-invite-token.md` |
| Infra — Migration DB | `spec/infra/db-migration-rollback-strategy.md` |
| Infra — Stratégie SEO | `spec/infra/seo-strategy.md` |
| Infra — Workflow Git | `spec/infra/git-workflow.md` |
| Recherche — Concurrence | `spec/research/analyse-concurrence.md` |
| Recherche — Benchmark Luma | `spec/research/luma-benchmark.md` |
| Recherche — MCP | `spec/research/mcp.md` |
| Sécurité — Audit | `spec/docs/security/AUDIT-2026-04-01.md` |
| Design — System | `spec/design/design-system.md` |
| Design — Audit mobile | `spec/design/AUDIT-MOBILE.md` |
| Design — Inventaire composants | `spec/design/ui-components-inventory.md` |
| Marketing — Backlog | `spec/mkt/BACKLOG.md` |
