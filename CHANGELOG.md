# Journal des modifications

Historique des livraisons de The Playground.
Chaque étape correspond à un bloc fonctionnel significatif du produit.

> Ce projet a été construit avec [Claude Code](https://claude.ai/claude-code) (Anthropic) — de l'architecture au déploiement.

---

## [0.7.0] — 2026-02-21 — Emails transactionnels & sécurité

Le dernier bloc critique avant le lancement. Les emails transactionnels donnent vie au produit : chaque inscription, chaque promotion de liste d'attente, chaque nouvelle inscription notifie les bonnes personnes au bon moment.

### Ajouté

- **Emails transactionnels** (Resend + react-email) — 4 emails MVP :
  - Confirmation d'inscription (Participant)
  - Confirmation liste d'attente (Participant)
  - Promotion liste d'attente — "une place s'est libérée !" (Participant)
  - Notification nouvelle inscription (Organisateur)
- **Pièce jointe .ics** sur les emails de confirmation et de promotion — l'Escale arrive directement dans l'agenda du Participant
- **Générateur iCalendar** — conforme RFC 5545, avec échappement des caractères spéciaux
- **Modèles email** — mise en page partagée, badge calendrier gradient rose→violet (inspiré Luma), bouton d'action visible
- **Audit sécurité** — vérification des contrôles d'accès sur tous les cas d'usage admin, tests d'autorisation
- **Tests unitaires** — couverture complète des cas d'usage + 10 tests sur le générateur iCalendar
- **Documentation spec** — vision produit, admin plateforme, emails, cadrage mis à jour

### Architecture

- Port `EmailService` (domaine) → Adapteur `ResendEmailService` (infrastructure)
- Envoi asynchrone sans attente : si l'email échoue, l'inscription réussit quand même
- Traductions résolues avant l'envoi asynchrone (contexte requête Next.js)
- Modèles email indépendants de la langue (tous les textes arrivent pré-traduits)
- DNS configuré sur OVH : DKIM, SPF, DMARC pour `the-playground.fr`

---

## [0.6.0] — 2026-02-21 — Admin plateforme

La plateforme a besoin d'yeux. L'admin permet de superviser l'activité, modérer le contenu et débloquer les situations problématiques.

### Ajouté

- **Tableau de bord admin** — 4 cartes stats (Utilisateurs, Cercles, Escales, Inscriptions) + deltas hebdomadaires
- **Listes paginées** (20/page) avec recherche pour Utilisateurs, Cercles et Escales
- **Pages de détail** pour chaque entité avec toutes les informations associées
- **Actions de modération** — supprimer un utilisateur, un Cercle ou une Escale, forcer l'annulation d'une Escale
- **Suppression en cascade** — suppression d'un utilisateur supprime ses Cercles orphelins (s'il est seul Organisateur)
- **Triple protection** — garde au niveau de la mise en page (redirection) + action serveur + cas d'usage

### Architecture

- Port `AdminRepository` dédié (requêtes transversales, 13 méthodes)
- 11 cas d'usage dans `domain/usecases/admin/`
- 14 actions serveur dans `app/actions/admin.ts`
- Mise en page avec barre latérale dédiée + garde d'accès
- Champ `role` (USER/ADMIN) sur l'entité Utilisateur
- Traductions FR/EN complètes (~70 clés)

---

## [0.5.0] — 2026-02-21 — Page d'accueil, identité & découverte

The Playground prend forme visuellement. La page d'accueil raconte l'histoire du produit, La Carte ouvre la découverte publique, et la terminologie propriétaire s'installe.

### Ajouté

- **Page d'accueil redesignée** — héro en écran partagé (texte animé + maquette iPhone 3D), section "Comment ça marche" en 3 étapes, 3 piliers (Communauté d'abord, Design premium, 100% gratuit), appel à l'action final
- **La Carte** (`/explorer`) — page publique de découverte des Cercles et Escales, filtrable par catégorie, onglets Cercles/Escales
- **Pages Cercle publiques** (`/circles/[slug]`) — accessibles sans compte, optimisées pour le référencement
- **Champs Cercle enrichis** — catégorie (enum 8 valeurs) + ville (string libre)
- **Sélecteur de langue FR/EN** dans l'en-tête
- **Favicon** — gradient rose→violet avec triangle play
- **Icône de marque** dans l'en-tête (triangle play)
- **Données démo** — 6 Cercles FR réalistes, 20 utilisateurs, 30 Escales (`@demo.playground`)

### Terminologie

La plateforme adopte son vocabulaire propre :
- **FR** : Moment → **Escale**, S'inscrire → **Rejoindre**, Dashboard → **Mon Playground**, Explorer → **La Carte**
- **EN** : Player → **Member**, Register → **Join**, Dashboard → **My Playground**, Explorer → **Explore**

> À partir de cette version, tous les documents destinés aux utilisateurs emploient la terminologie propriétaire.

---

## [0.4.0] — 2026-02-21 — Système de design & polish

Le design passe du fonctionnel au premium. Chaque page est repensée pour atteindre le niveau Luma.

### Ajouté

- **Tableau de bord redesigné** — onglets (Mes Escales / Mes Cercles), timeline unifiée (à venir + passées), états vides avec appel à l'action
- **Page Cercle redesignée** — mise en page 2 colonnes (couverture gradient + Organisateurs + stats | titre + méta + timeline), bascule À venir/Passées via paramètre URL
- **Escale passée** — couverture grisée, badge superposé "Passée", bannière contextuelle, carte "Événement terminé" avec appel à l'action de rétention vers le Cercle
- **Page profil redesignée** — colonne unique centrée, avatar en en-tête, stats en ligne, lignes de métadonnées
- **Liste des membres** — Organisateurs avec couronne + Participants, emails visibles uniquement pour les Organisateurs
- **Fils d'ariane** sur toutes les pages du tableau de bord
- **Système de design unifié** — une seule couleur accent, badges harmonisés, hiérarchie de boutons normative

### Modifié

- Couleur de danger alignée sur la teinte rose (hue 341) — approche Luma : un seul accent, zéro confusion
- Badges : fond plein = engagement positif, contour = tout le reste
- Bouton Modifier toujours en variante principale sur les pages de détail

---

## [0.3.0] — 2026-02-21 — Engagement & contenu

Les premières briques de l'engagement communautaire : commentaires, contenu enrichi, outils de test.

### Ajouté

- **Fil de commentaires** sur chaque Escale — plat, chronologique, auteur + Organisateur peuvent supprimer, formulaire masqué sur les Escales passées
- **Autocomplétion d'adresse** — intégration API BAN (Base Adresse Nationale) dans le formulaire Escale
- **Badge Organisateur** sur les cartes Escale (remplace "Inscrit" pour les Organisateurs)
- **Escales annulées** visibles dans la timeline du Cercle (avec badge dédié)
- **Scripts données de test** — injection + nettoyage pour `@test.playground`, idempotents
- **Impersonnation dev** — `/api/dev/impersonate?email=...` pour les tests manuels

---

## [0.2.0] — 2026-02-20 — Parcours utilisateur complet

Le produit devient utilisable de bout en bout. Un Organisateur peut créer une communauté, publier une Escale et recevoir des inscriptions. Un Participant peut rejoindre, intégrer la communauté et annuler.

### Ajouté

- **Système d'inscription** — Rejoindre une Escale, annuler, consulter les inscriptions
- **Liste d'attente** avec promotion automatique sur désistement
- **Auto-inscription Cercle** — rejoindre une Escale inscrit automatiquement au Cercle (zéro friction)
- **Auto-inscription Organisateur** — créer une Escale inscrit automatiquement l'Organisateur
- **Tableau de bord orienté Participant** — "Mes prochaines Escales" en timeline, "Mes Cercles" avec badge rôle
- **Sécurité du tableau de bord** — Cercle/Escale vérifient le rôle (Participants redirigés vers la vue publique)
- **Profil utilisateur** + onboarding obligatoire au premier login (nom, prénom)
- **Vue Escale unifiée** — composant unique paramétré (publique/Organisateur), réutilisé sur les deux vues
- **Formulaire Escale redesigné** — style Luma, minimaliste (titre, date, lieu, description), options avancées masquées
- **En-tête style Luma** — menu avatar, navigation
- **Tests E2E mobiles** (Playwright) — tableau de bord + pages publiques
- **Supervision** — Sentry (prod uniquement) + Vercel Analytics + SpeedInsights

### Architecture

- Modèle de rôle refactoré : **Organisateur = Participant + droits de gestion** (une seule ligne d'appartenance par utilisateur et Cercle)
- Branches Neon : branche `production` pour Vercel, branche `dev` pour le développement local
- Script `db:dev:reset` pour recréer la branche dev depuis un instantané de production

---

## [0.1.0] — 2026-02-19 — Fondations

Le socle technique et les premières fonctionnalités domaine. Le projet démarre avec une architecture hexagonale stricte et les deux entités centrales : Cercle et Escale.

### Ajouté

- **Socle technique** — Next.js 15 (App Router), TypeScript strict, Prisma 7, PostgreSQL (Neon), Auth.js v5, Tailwind CSS 4, shadcn/ui, next-intl
- **Architecture hexagonale** — `domain/` (modèles, ports, cas d'usage) → `infrastructure/` (dépôts Prisma) → `app/` (routes Next.js)
- **Authentification** — lien magique + OAuth (Google, GitHub) via Auth.js v5
- **CRUD Cercle** — première fonctionnalité domaine complète (cas d'usage + port + adapteur + interface)
- **CRUD Escale** — avec page publique partageable `/m/[slug]`
- **Traductions** — FR/EN natif avec next-intl
- **Déploiement** — Vercel (EU) + Neon PostgreSQL serverless (EU)

### Architecture

- Règle de dépendance unidirectionnelle : `app/ → domain/ ← infrastructure/`
- Le domaine ne dépend de rien (ni Prisma, ni Next.js, ni aucune librairie externe)
- Ports = interfaces TypeScript, Adapteurs = implémentations Prisma
- Les cas d'usage reçoivent les dépendances par injection
- La correspondance Prisma ↔ domaine se fait dans les dépôts (pas dans le domaine)

---

## Conventions

- **Format** : [Keep a Changelog](https://keepachangelog.com/)
- **Versionnage** : inspiré SemVer (0.x.0 = jalons pré-lancement)
- **Langue** : français (cohérent avec le marché cible initial)
- **Mise à jour** : après chaque livraison significative (pas après chaque commit)
