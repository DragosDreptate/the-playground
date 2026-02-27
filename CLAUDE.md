# The Playground - Guide projet

## Vision

**Lancez votre communauté. Organisez vos événements. Animez votre réseau.**

Plateforme SaaS ouverte et 100% gratuite pour communautés. **Le modèle Meetup.com avec l'expérience Luma, 100% gratuit.**

### Positionnement — Community-centric, pas event-centric

The Playground est **community-centric** (comme Meetup), pas event-centric (comme Luma).

- **Luma** : créer un événement → des gens viennent → ils repartent → recommencer à zéro. L'événement est terminal, aucune rétention.
- **Meetup** : créer un groupe → des gens rejoignent → ils restent → les événements sont des rendez-vous dans la communauté. Bon modèle, mais UX datée et paywall organisateur.
- **The Playground** : le modèle communautaire de Meetup + l'expérience premium de Luma + 100% gratuit.

Le **Circle** (Communauté) est l'entité centrale. L'**événement** est un point d'entrée viral vers le Circle. L'inscription à un événement rend le Participant membre du Circle. Après l'événement, le Circle reste — avec ses membres, ses prochains événements, son identité.

```
Luma:           Event → Inscription → Event a lieu → Fin (pas de rétention)
The Playground: Événement → Inscription → Membre du Circle → Prochains événements → Rétention
```

### Ce qu'on prend de chaque référence

| | Meetup.com | Luma | The Playground |
|---|---|---|---|
| Communauté persistante | oui | non | **oui** |
| Membres du groupe | oui | non | **oui** |
| Page événement premium | non (datée) | oui | **oui** |
| Inscription sans friction | non (compte obligatoire) | oui | **oui** |
| Dashboard organisateur | basique | bon | **bon** |
| Découverte publique | oui (annuaire) | non | **oui** (Découvrir) |
| Gratuit | non (abo organisateur) | commission | **100% gratuit** |

### Parcours clés

**Host (Organisateur)** :
1. Créer son **Circle** (sa Communauté) — c'est le cockpit
2. Créer des **événements** dans cette Communauté
3. Gérer ses **Participants** de façon persistante (pas événement par événement)
4. Communiquer avec sa communauté entre les événements

**Player (Participant)** :
1. Reçoit un lien vers un événement (viralité, comme Luma)
2. S'inscrit → devient membre du Circle (transparent, zéro friction)
3. Après l'événement : découvre la page Communauté, les prochains événements, les autres membres
4. Revient naturellement pour les événements suivants

> Le dashboard Organisateur est **Circle-first**, pas event-first. Le Circle est le cockpit, les événements sont des actions lancées depuis ce cockpit.

## Architecture sémantique

| Concept | FR (i18n) | Description |
| --- | --- | --- |
| **Playground** | — | La plateforme |
| **Circle** | Communauté | Une communauté autonome (publique ou privée) |
| **Track** | — | Série d'événements récurrents dans un Circle (**Phase 2** — retiré du MVP) |
| **Moment** | événement (FR) / Event (EN) | Événement individuel — unité virale de la plateforme, page autonome et partageable |
| **Host** | Organisateur | Organisateur d'un Circle |
| **Player** | Participant (FR) / Member (EN) | Participant à un Moment / membre d'un Circle |

> **Règle i18n** : En code (types, variables, DB, noms de fichiers, clés JSON), on utilise toujours les termes anglais (Circle, Moment, Host, Player). Les traductions user-facing sont :
> - **FR** : Circle → **Communauté** (féminin : une Communauté, cette Communauté), Moment → **événement** (masculin : un événement, cet événement, Publié, Annulé, Passé), Host → Organisateur, Player → Participant, Register → **S'inscrire**, Dashboard → **Mon espace**, Explorer → **Découvrir**
> - **EN** : Circle → **Community**, Moment → **Event**, Host reste inchangé. Player → **Member**, Register → **Join**, Dashboard → **Dashboard**, Explorer → **Explore**

## Règles métier clés

- **Le Circle est l'entité centrale** — tout gravite autour de la communauté, pas de l'événement
- S'inscrire à un événement inscrit automatiquement le Participant à la Communauté (transparent, pas de friction)
- L'événement est la **porte d'entrée virale**. La Communauté est la **couche de rétention**
- Parcours : découvrir un événement → s'inscrire → devenir membre de la Communauté → découvrir les prochains événements → rester
- **La page Circle est la page de rétention** : prochains événements, événements passés, membres, identité de la Communauté
- Liste d'attente avec promotion automatique sur désistement
- Fil de commentaires (pas de forum) sur chaque événement

## Principes structurants

- Multi-tenant dès le départ
- Architecture hexagonale obligatoire
- **Design premium par défaut** — chaque page événement doit être belle sans effort de l'Organisateur
- **Mobile-first** — le parcours Participant est optimisé pour mobile (lien partagé via WhatsApp/Instagram/Slack → toujours sur mobile)
- **Marque visible mais discrète** — "Powered by The Playground" en footer, couleur accent reconnaissable, mais l'Organisateur et sa Communauté restent au premier plan. On construit de la notoriété sans cannibaliser l'identité des communautés
- Données exportables (export complet : membres, événements, historique)
- Pas d'algorithme de ranking global
- Pas de feed social
- Pas de marketplace (mais Découvrir : annuaire simple de Communautés publiques, filtrable par thème/localisation)
- Ownership des données pour les Circles
- **Distribution par les Organisateurs** — pas d'algo de distribution, la viralité vient des liens partageables + intégration calendrier + export. L'Organisateur génère la distribution, pas la plateforme
- Architecture notifications **multi-canal dès la conception** (V1 = email, puis SMS/push/WhatsApp)
- **UI bilingue dès V1** (FR/EN) avec architecture i18n native pour ajout de langues futur

## Principes UX — Benchmark Luma + Meetup

> L'UI/UX est calquée sur Luma (lu.ma) pour le design premium. Le modèle fonctionnel s'inspire de Meetup pour la couche communautaire. On systématiquement challenge le design Luma : si on peut faire mieux, on propose l'alternative.

### La page événement = porte d'entrée virale (benchmark Luma)

La page événement est la première chose que voit un Participant. Design premium, inspiration directe Luma :
- **Titre clair** — immédiatement lisible
- **Date visible immédiatement** — pas cachée dans un détail
- **Lieu explicite** — adresse ou "En ligne"
- **CTA évident** — bouton d'inscription dominant, au-dessus de la ligne de flottaison
- **Social proof** — liste des inscrits avec avatars/initiales, nombre de places restantes
- **Lien vers le Circle** — visible sur la page événement, invitation à explorer la communauté

### La page Circle = couche de rétention (ce que Luma n'a pas)

C'est l'avantage structurel de The Playground. La page Circle montre :
- Les **prochains événements** de la Communauté
- Les **événements passés** (historique)
- Les **membres** du Circle
- L'**identité** de la Communauté (description, Organisateur)

> La page Circle n'existe pas chez Luma. C'est elle qui transforme des participants ponctuels en membres fidèles.

### Friction zéro à l'inscription (benchmark Luma)

- Magic link / OAuth — pas de création de compte lourde avant inscription
- Minimum d'étapes entre "je vois l'événement" et "je suis inscrit"
- L'inscription au Circle est transparente (pas de popup ni de validation supplémentaire)

### Minimalisme du formulaire de création (benchmark Luma)

- L'Organisateur ne remplit que l'essentiel : **titre, date, lieu, description**
- Tout le reste (capacité, prix, paramètres avancés) est masqué dans des options secondaires
- Moins de réglages = meilleure adoption

### Ce qu'on ne copie PAS de Luma

- La neutralité totale — on construit une marque (branding discret mais présent)
- Le modèle commission — on reste 100% gratuit
- **L'absence de couche communautaire** — notre Circle est structurant, c'est la différence fondamentale
- L'absence d'IA — c'est notre levier de différenciation

### Ce qu'on ne copie PAS de Meetup

- Le design daté — on vise le niveau Luma en qualité visuelle
- Le paywall organisateur — 100% gratuit
- L'UX lourde (compte obligatoire, formulaires longs) — friction zéro

## Design system — Règles des boutons

> **Ces règles sont normatives.** Tout bouton ajouté ou modifié DOIT les respecter.

### Hiérarchie des variants

| Variant | Rôle | Quand l'utiliser |
|---|---|---|
| `default` (rose/primary) | **Action principale** de la page ou du contexte | CTA S'inscrire, Créer un événement, Modifier, Enregistrer |
| `outline` | **Action secondaire** | Créer une Communauté (quand Créer un événement est le primary), Annuler, actions de navigation secondaires |
| `ghost` | **Action tertiaire / utilitaire** | Copier, Voir (dans une toolbar), Se déconnecter, toggles UI |
| `destructive` | **Jamais utilisé comme trigger visible** | Réservé aux `AlertDialogAction` de confirmation (dans la modale) |

> **Règle d'or** : sur chaque page ou section, il ne doit y avoir qu'**un seul bouton `default`**. Si deux boutons sont en compétition, le moins important passe en `outline`.

### Actions destructives (Supprimer)

Le trigger du dialogue de suppression utilise **toujours** `variant="outline" size="sm"` avec les classes destructive :
```tsx
<Button
  variant="outline"
  size="sm"
  className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
>
  Supprimer
</Button>
```
L'`AlertDialogAction` dans la modale de confirmation utilise `className="bg-destructive text-white hover:bg-destructive/90"`.

### Tailles

- **Pages et headers** : `size="sm"` pour les boutons d'action en haut de page
- **Formulaires** : `size` non spécifié (default) pour Submit et Cancel
- **CTAs fullwidth** (page publique événement, S'inscrire) : `size="lg"` avec `w-full`
- **Utilitaires inline** (toolbar, copy) : `size="sm"` ou taille custom via className

### Règle anti-doublon

Ne jamais avoir deux boutons qui déclenchent la même action sur la même page. Si une action est déjà accessible via un élément UI (lien, icône), ne pas ajouter un bouton redondant.

## Monétisation

- **100% gratuit** — aucune commission plateforme, aucun abonnement requis
- Seuls les frais Stripe (~2.9% + 0.30$) sur les événements payants
- The Playground ne prend aucune marge sur les transactions
- Évolution future : Plan Pro (analytics, branding, IA avancée, API, multi-canal)

## MVP V1 — Périmètre

### Organisateur
- CRUD Circle / Moment (Track en Phase 2)
- Pages Moment autonomes et partageables (URL propre `/m/[slug]`)
- Formulaire de création minimaliste (titre, date, lieu, description) — options avancées (capacité, prix) masquées par défaut
- Liste d'attente
- Check-in, export CSV, communication directe avec les Participants
- Assistant IA basique (description événement, email invitation, suggestions Communauté)

### Participant
- Découverte d'événement via lien partagé
- S'inscrire à un événement = inscription à la Communauté automatique
- Social proof sur la page événement : liste des inscrits (avatars/initiales), nombre de places restantes
- Bouton "Ajouter à mon calendrier" après inscription (Google Calendar, Apple Calendar, ICS)
- Paiement Stripe si nécessaire
- Notifications email (confirmation, rappels 24h/1h, changements, annulations)
- Fil de commentaires sur l'événement

### Plateforme
- Découvrir : répertoire public de Communautés (filtrable thème/localisation, sans ranking)
- Stripe Connect pour événements payants

## Stack technique

### Core
- **Framework** : Next.js 16 (App Router) — SSR pour les pages Moment, API Routes, i18n
- **Langage** : TypeScript (strict) — types partagés front/back
- **ORM** : Prisma — schema déclaratif, migrations
- **Base de données** : PostgreSQL — multi-tenant
- **Auth** : Auth.js (NextAuth v5) — magic link + OAuth (Google, GitHub), self-hosted
- **Paiements** : Stripe Connect — reversement aux Organisateurs

### UI / Design
- **Styling** : Tailwind CSS 4
- **Composants** : shadcn/ui — design premium, composants copiés (pas de dépendance)
- **i18n** : next-intl — FR/EN natif

### Services
- **Email** : Resend + react-email (templates React)
- **IA** : SDK Anthropic (Claude) — appels API directs
- **File storage** : Uploadthing ou S3-compatible

### Infrastructure
- **Hosting app** : Vercel (région EU)
- **Hosting DB** : Neon PostgreSQL serverless (région EU), branching dev/prod
- **Monorepo** : Turborepo si packages partagés nécessaires

### Base de données — Branching Neon

| Branche | Usage | Endpoint |
|---------|-------|----------|
| `production` | Vercel prod | `ep-cool-bread-alja3wbs-pooler` |
| `dev` | Développement local | `ep-still-boat-alw4v956-pooler` |

- `.env.local` pointe vers la branche `dev` (utilisé en local)
- Les variables Vercel pointent vers `production`
- `pnpm db:dev:reset` recrée la branche `dev` depuis un snapshot frais de production
- `pnpm db:push` applique le schema sur la branche dev (pointée par `DATABASE_URL` dans `.env.local`)
- `pnpm db:push:prod` applique le schema sur la branche production (avec confirmation)
- **IMPORTANT** : à chaque modification du schema Prisma, toujours pousser sur les DEUX branches : `pnpm db:push` (dev) puis `pnpm db:push:prod` (prod)

### Dev tooling
- **Package manager** : pnpm
- **Linting** : ESLint + Prettier
- **Tests unitaires** : Vitest
- **Tests E2E** : Playwright
- **CI/CD** : GitHub Actions

### Scripts (`pnpm <script>`)

| Commande | Description |
| --- | --- |
| `pnpm test` | Lance tous les tests (unit + integration) une fois |
| `pnpm test:watch` | Lance les tests en mode watch (relance sur changement) |
| `pnpm test:unit` | Lance uniquement les tests unitaires |
| `pnpm test:integration` | Lance uniquement les tests d'intégration |
| `pnpm test:coverage` | Lance les tests avec rapport de couverture |
| `pnpm typecheck` | Vérifie les types TypeScript (sans émission) |
| `pnpm db:validate` | Valide le schema Prisma |
| `pnpm db:generate` | Génère le client Prisma |
| `pnpm db:migrate` | Crée et applique une migration Prisma |
| `pnpm db:push` | Push le schema vers la DB dev (sans migration) |
| `pnpm db:push:prod` | Push le schema vers la DB **production** (avec confirmation) |
| `pnpm db:studio` | Ouvre Prisma Studio (UI de visualisation DB) |
| `pnpm db:dev:reset` | Recrée la branche Neon dev depuis un snapshot frais de production |
| `pnpm db:seed-test-data` | Injecte des données de test réalistes (dev) — idempotent |
| `pnpm db:seed-test-data:prod` | Injecte des données de test en production (avec confirmation) |
| `pnpm db:cleanup-test-data` | Dry-run : affiche ce qui serait supprimé (@test.playground) |
| `pnpm db:cleanup-test-data --execute` | Supprime les données test (dev) — utilisateurs @test.playground + leur data |
| `pnpm db:cleanup-test-data:prod` | Supprime les données test en production (avec double confirmation) |
| `pnpm db:dev:wipe-user` | Supprime un utilisateur spécifique en dev (par email) |
| `pnpm db:dev:seed-test-users` | Injecte les 3 utilisateurs test minimaux (host, player1, player2 @test.playground) |
| `pnpm db:seed-demo-data` | Injecte les données de démo (6 Circles, 20 users @demo.playground, 30 événements) — idempotent |
| `pnpm db:seed-demo-data:prod` | Injecte les données de démo en production (avec confirmation) |
| `pnpm db:cleanup-demo-data` | Dry-run : affiche ce qui serait supprimé (@demo.playground) |
| `pnpm db:cleanup-demo-data:prod` | Supprime les données démo en production (avec double confirmation) |
| `pnpm db:backfill-notification-prefs` | Backfill des préférences de notifications (dev) — met à true pour les utilisateurs existants |
| `pnpm db:backfill-notification-prefs:prod` | Backfill des préférences de notifications en production (avec confirmation) |
| `pnpm db:export-brevo-contacts` | Exporte les utilisateurs réels vers un CSV prêt à importer dans Brevo (exclut test/démo) |
| `pnpm db:export-brevo-contacts:prod` | Exporte les contacts Brevo depuis la production (avec confirmation) |
| `pnpm db:seed-covers` | Dry-run : affiche les images de couverture à injecter |
| `pnpm db:seed-covers:execute` | Injecte les images de couverture en base |
| `pnpm db:seed-covers:prod` | Injecte les images de couverture en production (avec confirmation) |
| `pnpm test:e2e` | Lance les tests E2E Playwright |
| `pnpm test:e2e:setup-onboarding` | Génère le storage state d'auth pour l'onboarding E2E |
| `pnpm test:mobile` | Lance les tests mobile Playwright (config dédiée) |
| `pnpm test:mobile:setup` | Génère le storage state d'auth pour les tests mobile |

> **Note Claude** : ne pas lancer les tests automatiquement. Lancer uniquement quand l'utilisateur le demande explicitement.

## Architecture hexagonale — CONTRAT STRICT

> **Cette section est normative.** Tout code produit dans ce projet DOIT respecter ces règles. Aucune exception.

### Principe fondamental

L'architecture hexagonale (Ports & Adapters) sépare le code en 3 zones avec une **règle de dépendance unidirectionnelle** :

```
app/ (UI, routes) ──→ domain/ (métier pur) ←── infrastructure/ (adapters)
```

**Le domaine ne dépend de RIEN.** Ni de Prisma, ni de Next.js, ni de Stripe, ni d'aucune librairie externe. Le domaine est testable en isolation totale.

### Structure des dossiers

```
src/
  app/                    → Couche APPLICATION (Next.js App Router)
    (routes)/             → Pages et API routes
    actions/              → Server Actions (orchestrent les usecases)

  components/             → Composants React réutilisables (UI pure)

  domain/                 → Couche DOMAINE (logique métier pure)
    models/               → Entités et Value Objects
      user.ts             → Entité User
      circle.ts           → Entité Circle + CircleMembership
      moment.ts           → Entité Moment + LocationType + MomentStatus
      registration.ts     → Entité Registration + RegistrationStatus + PaymentStatus
      comment.ts          → Entité Comment
    ports/                → Interfaces (contrats abstraits)
      repositories/       → Interfaces des repositories (persistance)
      services/           → Interfaces des services externes (email, paiement, IA)
    usecases/             → Cas d'usage métier (logique applicative)
    errors/               → Erreurs métier typées

  infrastructure/         → Couche INFRASTRUCTURE (implémentations concrètes)
    repositories/         → Implémentations Prisma des ports/repositories
    services/             → Implémentations concrètes des ports/services
      stripe/             → Adapter Stripe Connect
      email/              → Adapter Resend
      ai/                 → Adapter Anthropic Claude
      storage/            → Adapter file storage
    auth/                 → Configuration Auth.js
    db/                   → Client Prisma, schema, migrations

  lib/                    → Utilitaires partagés (helpers purs, sans dépendance infra)
  i18n/                   → Messages FR/EN (next-intl)
```

### Règles strictes

#### 1. Le domaine est pur
- `domain/` ne contient **AUCUN import** de : Prisma, Next.js, Stripe, Resend, Anthropic, ou toute autre librairie externe
- `domain/` n'importe que depuis `domain/` et `lib/` (si lib est pur)
- Les entités dans `domain/models/` sont des classes ou types TypeScript purs, PAS des modèles Prisma
- Les erreurs métier dans `domain/errors/` sont des classes Error typées, pas des HTTP errors

#### 2. Les ports sont des interfaces TypeScript
- Chaque dépendance externe est abstraite par une interface dans `domain/ports/`
- Exemple : `CircleRepository` (port) → `PrismaCircleRepository` (adapter dans infrastructure/)
- Exemple : `PaymentService` (port) → `StripePaymentService` (adapter dans infrastructure/)
- Exemple : `EmailService` (port) → `ResendEmailService` (adapter dans infrastructure/)
- Exemple : `AIService` (port) → `ClaudeAIService` (adapter dans infrastructure/)

#### 3. Les usecases orchestrent la logique métier
- Un usecase reçoit ses dépendances par **injection** (paramètres du constructeur ou de la fonction)
- Un usecase ne connaît que les ports (interfaces), jamais les implémentations concrètes
- Un usecase retourne des entités du domaine ou des types du domaine, jamais des objets Prisma ou des Response HTTP
- Nommage : verbe + nom → `CreateMoment`, `JoinMoment`, `CancelRegistration`, etc.

#### 4. L'infrastructure implémente les ports
- `infrastructure/repositories/` contient les implémentations Prisma qui satisfont les interfaces de `domain/ports/repositories/`
- `infrastructure/services/` contient les implémentations concrètes (Stripe, Resend, Claude) qui satisfont les interfaces de `domain/ports/services/`
- Le mapping Prisma model ↔ Domain entity se fait dans les repositories (pas dans le domaine)

#### 5. La couche app orchestre le tout
- `app/` (routes, server actions) est le point d'entrée qui :
  1. Instancie les adapters concrets (repositories Prisma, services Stripe, etc.)
  2. Les injecte dans les usecases
  3. Appelle les usecases
  4. Transforme le résultat en réponse HTTP ou en props pour les composants
- Les composants React dans `components/` reçoivent des **données typées du domaine**, pas des objets Prisma

#### 6. Sens des imports — JAMAIS violer

| Depuis | Peut importer | NE PEUT PAS importer |
| --- | --- | --- |
| `domain/` | `domain/`, `lib/` (si pur) | `app/`, `infrastructure/`, `components/`, librairies externes |
| `infrastructure/` | `domain/`, `lib/`, librairies externes | `app/`, `components/` |
| `app/` | `domain/`, `infrastructure/`, `components/`, `lib/`, `i18n/` | — |
| `components/` | `domain/models/` (types only), `lib/`, `i18n/` | `infrastructure/`, `app/` |

### Exemple de flux : "Un Player s'inscrit à un Moment"

```
1. app/actions/joinMoment.ts (Server Action)
   → Instancie PrismaMomentRepository, PrismaPlayerRepository, ResendEmailService
   → Injecte dans JoinMomentUseCase
   → Appelle usecase.execute({ momentId, playerData })

2. domain/usecases/JoinMoment.ts
   → Utilise MomentRepository (port) pour charger le Moment
   → Vérifie la capacité, gère la liste d'attente (logique métier pure)
   → Utilise PlayerRepository (port) pour créer/lier le Player
   → Utilise EmailService (port) pour envoyer la confirmation
   → Retourne un résultat typé du domaine

3. infrastructure/repositories/PrismaMomentRepository.ts
   → Implémente MomentRepository
   → Traduit les appels en queries Prisma
   → Mappe les résultats Prisma → entités domaine
```

### Stratégie de tests — CONTRAT STRICT

> **Cette section est normative.** Tout code produit DOIT être accompagné de tests. Les tests sont maintenus tout au long du projet.

#### Méthodologie : BDD lightweight + Specification by Example

- **BDD sans Gherkin** : philosophie Given/When/Then dans les `describe`/`it` Vitest natifs, sans fichiers `.feature` ni step definitions
- **Specification by Example** : cas limites encodés en tables de données (`test.each` / `describe.each`)
- **Langage métier** : les noms de tests utilisent le vocabulaire domaine (Circle, Moment, Player, Host, Registration)

#### 3 niveaux de tests

| Niveau | Outil | Cible | Style |
| --- | --- | --- | --- |
| **Unitaire domaine** | Vitest | Models, usecases, logique métier pure | Given/When/Then dans `describe`/`it`, `test.each` pour spec by example. Mocks des ports. Pas de DB, pas de réseau. |
| **Intégration** | Vitest + DB test | Repositories, services (adapters) | Vérifient le contrat ports/adapters avec une vraie DB PostgreSQL de test |
| **E2E fonctionnel** | Playwright | Parcours utilisateur complets | Scénarios nommés en langage métier, couvrent les flux critiques |

#### Règles

1. **Tout usecase a ses tests unitaires** — les ports sont mockés, la logique métier est testée en isolation
2. **Tout adapter a ses tests d'intégration** — vérification que l'implémentation respecte le contrat du port
3. **Tout parcours critique a un test E2E** — inscription Moment, paiement, liste d'attente, etc.
4. **Les tests documentent le comportement** — un nouveau développeur doit comprendre les règles métier en lisant les tests
5. **Pas de test sans assertion** — chaque `it()` vérifie un comportement précis
6. **Les tests sont maintenus à chaque changement** — code modifié = tests mis à jour

#### Convention de nommage des tests

```
describe("[UseCaseName]", () => {
  describe("given [contexte initial]", () => {
    it("should [comportement attendu]", ...)
  })
})
```

#### Structure des fichiers de test

```
src/
  domain/
    usecases/
      __tests__/           → Tests unitaires des usecases
    models/
      __tests__/           → Tests unitaires des models (si logique)
  infrastructure/
    repositories/
      __tests__/           → Tests d'intégration repositories
    services/
      __tests__/           → Tests d'intégration services
tests/
  e2e/                     → Tests Playwright (parcours utilisateur)
```

#### Tests complémentaires

##### Autorisation (sécurité)

Tests Vitest dédiés vérifiant l'isolation multi-tenant et les contrôles d'accès :
- Un Player ne peut pas accéder aux données d'un Circle dont il n'est pas membre
- Un non-Host ne peut pas modifier/supprimer un Moment
- Un User ne peut pas voir les inscriptions d'un Moment d'un autre Circle
- Ces tests sont intégrés dans les tests unitaires des usecases (pas un outil séparé)

##### Dépendances (sécurité)

- `pnpm audit` en CI — détection des vulnérabilités dans les dépendances

##### Performance pages

- **Lighthouse CI** sur les pages événement (unité virale, doit être rapide) — à intégrer en CI avec les tests E2E
- **Détection N+1 queries** dans les tests d'intégration des repositories
- **Load testing** (k6/Artillery) : uniquement en phase pré-lancement, pas dans le MVP

##### Accessibilité (a11y)

- **axe-core** intégré dans les tests Playwright E2E — détecte les erreurs de contraste, labels manquants, navigation clavier

##### Hors scope MVP

- Visual regression testing (Chromatic/Percy) → post-MVP si nécessaire
- SAST/DAST complet (Snyk/SonarCloud) → quand CI en place
- Pentest externe → pré-lancement
- Chaos engineering → sans objet (pas de microservices)

#### Roadmap qualité

| Type | MVP V1 | Pré-lancement | Post-lancement |
| --- | --- | --- | --- |
| Unitaire + fonctionnel | Vitest BDD | — | — |
| E2E | Playwright | — | — |
| Autorisation (sécu) | Tests Vitest dédiés | — | — |
| Dépendances (sécu) | `pnpm audit` en CI | — | — |
| Performance pages | Lighthouse CI | Load testing basique | Monitoring APM |
| Accessibilité | axe-core dans Playwright | Audit a11y manuel | — |
| Pentest | — | Pentest externe | Récurrent |

## Data Model

### Entités domaine (`src/domain/models/`)

Types TypeScript purs — aucune dépendance externe. Le mapping Prisma ↔ domaine se fait dans les repositories (infrastructure).

| Entité | Fichier | Description |
| --- | --- | --- |
| User | `user.ts` | Utilisateur plateforme (peut être Host et/ou Player selon les Circles) |
| Circle | `circle.ts` | Communauté autonome, tenant principal multi-tenant |
| CircleMembership | `circle.ts` | Relation User ↔ Circle avec rôle (HOST / PLAYER) |
| Moment | `moment.ts` | Événement individuel, page autonome partageable |
| Registration | `registration.ts` | Inscription User à un Moment (+ liste d'attente, check-in, paiement) |
| Comment | `comment.ts` | Commentaire sur un Moment |

### Schema Prisma (`prisma/schema.prisma`)

Inclut les modèles domaine + modèles Auth.js (Account, Session, VerificationToken). Tables en snake_case via `@@map`.

### Règles encodées dans le modèle

- **Prix en centimes** (int) — convention Stripe, pas de floating point. 1500 = 15,00€
- **Slug global pour Moments** — URL courte `/m/[slug]`, pas scoped au Circle
- **Contrainte unique (userId, circleId)** — une seule membership par User/Circle, le rôle HOST implique PLAYER
- **Contrainte unique (momentId, userId)** — un User ne peut s'inscrire qu'une fois à un Moment
- **Inscription auto au Circle** — logique dans le usecase, pas dans le schema

## Décisions prises

| Date | Décision |
| --- | --- |
| 2026-02-19 | L'Escale est l'unité virale, page autonome partageable (inspiration Luma) |
| 2026-02-19 | Rejoindre une Escale = inscription automatique au Cercle (pas de friction) |
| 2026-02-19 | Design-first comme principe structurant (Luma = benchmark UX) |
| 2026-02-19 | 100% gratuit, 0% commission plateforme, seuls frais Stripe |
| 2026-02-19 | IA basique dès le MVP (descriptions, emails, suggestions) |
| 2026-02-19 | Liste d'attente dans le MVP (pas en Phase 2) |
| 2026-02-19 | Notifications multi-canal en architecture, email-only en V1 |
| 2026-02-19 | La Carte : répertoire public de Circles (annuaire simple, pas de marketplace) |
| 2026-02-19 | On garde le nom "Circle" malgré la collision avec Circle.so |
| 2026-02-19 | Fil de commentaires sur Escale (pas de forum complet) |
| 2026-02-19 | Mobile-first pour le parcours Participant |
| 2026-02-19 | Export données ambitieux (CSV + JSON + API Pro) |
| 2026-02-19 | UI bilingue FR/EN dès V1, architecture i18n native pour multi-langue futur |
| 2026-02-19 | Lancement France d'abord, puis expansion européenne et internationale |
| 2026-02-19 | Stack technique : TypeScript full-stack (Next.js 16, Prisma, PostgreSQL, Auth.js, Stripe Connect, Tailwind + shadcn/ui, Resend, Anthropic SDK, Vercel + Neon/Supabase) |
| 2026-02-19 | Architecture hexagonale : domain/ (models, ports, usecases) + infrastructure/ (repositories, services) + app/ (routes Next.js) |
| 2026-02-19 | Questions ouvertes résolues : découverte publique = oui, freemium = non, langue = bilingue FR/EN, géo = France d'abord |
| 2026-02-19 | Track retiré du MVP V1 → Phase 2. MVP se concentre sur Circle + Escale |
| 2026-02-19 | Auth : Magic link + OAuth (Google, GitHub) via Auth.js v5 |
| 2026-02-19 | Data model V1 : User, Circle, CircleMembership, Moment, Registration, Comment |
| 2026-02-19 | Modèle User unique (pas d'entités Host/Player séparées) — rôle via CircleMembership |
| 2026-02-19 | Prix en centimes (int) — convention Stripe, pas de floating point |
| 2026-02-19 | Tests : BDD lightweight (Given/When/Then natif Vitest) + Specification by Example (test.each), pas de Gherkin/Cucumber |
| 2026-02-19 | Sécu MVP : tests d'autorisation multi-tenant dans Vitest + pnpm audit en CI. Pentest → pré-lancement |
| 2026-02-19 | Perf MVP : Lighthouse CI sur pages Escale + détection N+1. Load testing → pré-lancement |
| 2026-02-19 | A11y : axe-core intégré dans tests Playwright E2E |
| 2026-02-19 | Benchmark Luma intégré : page Escale = 80% de la valeur (titre, date, lieu, CTA, social proof) |
| 2026-02-19 | Social proof MVP : liste inscrits avec avatars/initiales + places restantes sur page Escale |
| 2026-02-19 | Ajout calendrier natif post-inscription (Google Calendar, Apple Calendar, ICS) |
| 2026-02-19 | Formulaire création Escale minimaliste : titre/date/lieu/description, options avancées masquées |
| 2026-02-19 | Branding : marque visible mais discrète — "Powered by The Playground" en footer, Organisateur au premier plan |
| 2026-02-19 | Distribution par les Organisateurs (liens partageables + calendrier), pas d'algo de distribution plateforme |
| 2026-02-19 | Traductions FR : Circle → Cercle, Moment → Escale, Host → Organisateur, Player → Participant. Termes EN conservés dans le code. |
| 2026-02-19 | Tagline officielle : "Lancez votre communauté. Organisez vos événements. Animez votre réseau." |
| 2026-02-20 | Positionnement clarifié : community-centric (Meetup) + UX premium (Luma) + 100% gratuit. Circle = entité centrale, Escale = porte d'entrée virale, la page Cercle est la couche de rétention absente chez Luma |
| 2026-02-21 | Dashboard redesigné : pill tabs (Mes Escales / Mes Cercles), timeline unifiée (upcoming + past), empty states avec CTA. Pas de CTAs dans les tab headers. |
| 2026-02-21 | CircleAvatar : composant réutilisable (gradient + initial), prêt pour future prop `image` (avatar Circle personnalisé) |
| 2026-02-21 | CircleMembersList : liste des membres sur page Circle, Organisateurs d'abord (Crown), emails visibles uniquement pour les Organisateurs (prop `variant`) |
| 2026-02-21 | Terminologie FR renommée : Moment → **Escale** (féminin), S'inscrire → **Rejoindre**, Dashboard → **Mon Playground**. Code/clés JSON inchangés. |
| 2026-02-21 | Terminologie EN renommée : Player → **Member**, Register → **Join**, Dashboard → **My Playground**. Moment reste "Moment" en EN. |
| 2026-02-23 | Terminologie EN alignée sur FR : Circle → **Community**, Moment → **Event**, My Playground → **Dashboard**. Code/clés JSON inchangés. FR inchangé. |
| 2026-02-21 | Le Répertoire renommé **La Carte** (FR) / **Explore** (EN). Route `/explorer` et clé i18n `Explorer` inchangées. La Boussole réservée pour l'assistant IA (futur). |
| 2026-02-22 | Terminologie FR simplifiée pour accessibilité : Cercle → **Communauté**, Escale → **événement** (masculin : Publié, Annulé, Passé), Mon Playground → **Mon espace**, La Carte → **Découvrir**, Rejoindre → **S'inscrire**. Code/clés JSON inchangés. EN inchangé. |
