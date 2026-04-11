# The Playground

**Lancez votre communauté. Organisez vos événements. Animez votre réseau.**

→ [the-playground.fr](https://the-playground.fr) · [Changelog](https://the-playground.fr/changelog) · [À propos](https://the-playground.fr/about)

---

## Le problème

Ça fait des années que j'organise des événements communautaires. Et depuis des années, je me heurte au même mur.

Il n'existe pas d'outil qui fait à la fois **communauté + événements + gratuit + UX correcte + maîtrise de son audience**.

| Outil | Problème |
| --- | --- |
| **Meetup** | Modèle communautaire intéressant, mais UX datée et paywall organisateur |
| **Luma** | Expérience propre, pages événement belles — mais chaque événement est une île, aucune rétention |
| **Le bricolage** | Google Forms + Eventbrite + WhatsApp + tableurs. On se débrouille, on perd son audience |

## La réponse

The Playground part d'une idée simple :

- La **communauté** est l'entité centrale — pas l'événement
- L'**événement** est une porte d'entrée virale
- S'inscrire à un événement rend **automatiquement** membre de la communauté
- La **communauté persiste** entre les événements

Le modèle communautaire de Meetup + l'expérience de Luma + 100% gratuit. Pas d'abonnement, pas de commission plateforme.

## Fonctionnalités

**Pour l'organisateur**
- Créer et gérer sa communauté — privée ou publique, avec invitations par lien
- Créer des événements avec une page autonome et partageable
- **Billetterie intégrée** via Stripe Connect — 0% commission plateforme
- **Inscriptions sur validation** pour filtrer les participants si besoin
- Gérer ses participants de façon persistante (pas événement par événement)
- **Broadcast email** à toute sa communauté
- Check-in, export CSV, liste d'attente automatique
- **Radar IA** — détection des événements similaires à venir (via Claude)
- Assistant IA pour les descriptions, emails, suggestions

**Pour le participant**
- Découverte via lien partagé (mobile-first)
- Inscription en quelques secondes — magic link, pas de compte requis
- Devient automatiquement membre de la communauté
- **Profil public** avec bio, ville, liens sociaux
- Notifications email (confirmation, rappels 24h et 1h, changements, annulations)
- Page communauté : prochains événements, membres, historique
- Fil de commentaires sur chaque événement

**Plateforme**
- [Explorer](https://the-playground.fr/explorer) — répertoire public de communautés avec tri, filtres et section À la une
- **Réseaux** — regrouper plusieurs communautés sous une vitrine commune (fédérations, collectifs, marques)
- **Blog** — articles de fond sur la philosophie et les choix du produit
- Bilingue FR / EN avec URLs propres
- 100% gratuit — seuls les frais Stripe (~2,9% + 0,30€) sur les événements payants

## Stack

| | |
| --- | --- |
| **Framework** | Next.js 16 (App Router, SSR) |
| **Langage** | TypeScript strict, full-stack |
| **Base de données** | PostgreSQL · Neon serverless (EU) |
| **ORM** | Prisma |
| **Auth** | Auth.js v5 · Magic link + OAuth (Google, GitHub) |
| **UI** | Tailwind CSS 4 + shadcn/ui |
| **Email** | Resend + react-email |
| **IA** | Anthropic SDK (Claude) |
| **Paiements** | Stripe Connect |
| **Analytics** | PostHog |
| **Monitoring** | Sentry |
| **Déploiement** | Vercel (EU) |

Architecture hexagonale (Ports & Adapters), TypeScript strict, tout déployé en Europe. Développé avec [Claude Code](https://claude.ai/claude-code) (Anthropic) — quelques jours pour le MVP, quelques semaines pour une plateforme complète en production.

## En chiffres

| | |
| --- | --- |
| **1 400+** | commits |
| **300+** | pull requests |
| **65** | cas d'usage (domain usecases) |
| **880+** | tests (unit + integration + E2E) |

## Architecture

Architecture hexagonale (Ports & Adapters) — domaine métier pur, découplé de l'infrastructure :

```
src/
  domain/          → Logique métier pure (models, ports, usecases)
  infrastructure/  → Adapters (Prisma, Resend, Stripe, Claude)
  app/             → Next.js App Router (routes, server actions)
  components/      → Composants React réutilisables
```

Voir `CLAUDE.md` pour le contrat strict d'architecture et les règles de dépendance.

## Développement

```bash
pnpm install
pnpm dev              # Démarre le serveur de développement
pnpm test             # Lance les tests (unit + integration)
pnpm test:e2e         # Tests E2E Playwright
pnpm typecheck        # Vérifie les types TypeScript
pnpm db:push          # Applique le schema sur la DB dev
```

Variables d'environnement requises : voir `.env.example`.

## Versions récentes

Les 3 dernières versions majeures (voir le [changelog complet](https://the-playground.fr/changelog)) :

- **v2.6.0** — Réseaux de communautés, profils enrichis, site web des communautés
- **v2.5.0** — Blog et landing page enrichis
- **v2.0.0** — Événements payants et billetterie intégrée (Stripe Connect)

## Auteur

Projet de [Dragos Dreptate](https://www.linkedin.com/in/dragosdreptate/) — dirigeant, entrepreneur et coach, 25 ans dans la tech, basé à Paris. Fondateur de [The Spark](https://thespark.fr), cabinet de conseil en IA, Produit et Innovation.

---

*Une expérience [Claude Code](https://claude.ai/claude-code) · Anthropic*
