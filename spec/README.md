# The Playground

**Lancez votre communauté. Organisez vos événements. Animez votre réseau.**

→ [the-playground.fr](https://the-playground.fr)

---

## Le problème

Ça fait des années que j'organise des événements communautaires. Et depuis des années, je me heurte au même mur.

Il n'existe pas d'outil qui fait à la fois **communauté + événements + gratuit + UX correcte + maîtrise de son audience**.

| Outil | Problème |
|---|---|
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
- Créer et gérer sa communauté (Circle)
- Créer des événements avec une page autonome et partageable
- Gérer ses participants de façon persistante (pas événement par événement)
- Broadcast email à toute sa communauté
- Check-in, export CSV, liste d'attente automatique
- Assistant IA (descriptions, emails, suggestions)

**Pour le participant**
- Découverte via lien partagé (mobile-first)
- Inscription en quelques secondes — magic link, pas de compte requis
- Devient automatiquement membre de la communauté
- Notifications email (confirmation, rappels, changements)
- Page communauté : prochains événements, membres, historique

**Plateforme**
- Répertoire public de communautés ([Découvrir](https://the-playground.fr/explorer))
- Bilingue FR / EN
- 100% gratuit — seuls les frais Stripe (~2,9% + 0,30€) sur les événements payants

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, SSR) |
| **Langage** | TypeScript strict, full-stack |
| **Base de données** | PostgreSQL · Neon serverless (EU) |
| **ORM** | Prisma |
| **Auth** | Auth.js v5 · Magic link + OAuth (Google, GitHub) |
| **UI** | Tailwind CSS 4 + shadcn/ui |
| **Email** | Resend + react-email |
| **Analytics** | PostHog |
| **IA** | Anthropic SDK (Claude) |
| **Paiements** | Stripe Connect |
| **Déploiement** | Vercel (EU) |

Construit en moins d'une semaine avec [Claude Code](https://claude.ai/claude-code) (Anthropic). Architecture hexagonale, TypeScript strict, tout déployé en Europe.

## Architecture

Architecture hexagonale (Ports & Adapters) — domaine métier pur, découplé de l'infrastructure :

```
src/
  domain/          → Logique métier pure (models, ports, usecases)
  infrastructure/  → Adapters (Prisma, Resend, Stripe, Claude)
  app/             → Next.js App Router (routes, server actions)
  components/      → Composants React réutilisables
```

## Développement

```bash
pnpm install
pnpm dev          # Démarre le serveur de développement
pnpm test         # Lance les tests (unit + integration)
pnpm test:e2e     # Tests E2E Playwright
pnpm typecheck    # Vérifie les types TypeScript
```

Variables d'environnement requises : voir `.env.example`.

## Auteur

Projet de [Dragos Dreptate](https://www.linkedin.com/in/dragosdreptate/) — dirigeant, entrepreneur et coach, 25 ans dans la tech, basé à Paris. Fondateur de [The Spark](https://thespark.fr), cabinet de conseil en IA, Produit et Innovation.

---

*Une expérience [Claude Code](https://claude.ai/claude-code) · Anthropic*
