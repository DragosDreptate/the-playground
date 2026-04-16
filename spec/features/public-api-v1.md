# API publique v1 — Mini-spec

> **Date** : 2026-04-13
> **Statut** : Phase 2 (post-MVP)
> **Motivation** : retour d'un organisateur actif sur Luma (~800 membres) qui automatise ses événements via l'API Luma. L'absence d'API est un frein bloquant à la migration. Voir `spec/mkt/activation/retour-dev-with-ai.md`.

---

## Objectif

Permettre aux Organisateurs d'automatiser la gestion de leurs événements et de brancher The Playground sur leurs outils internes (CRM, bots, dashboards, sites web).

---

## Pourquoi c'est faisable rapidement

L'architecture hexagonale sépare déjà la logique métier (usecases) du transport (server actions, crons). Un endpoint API c'est :

```
API Route (auth API key) → usecase existant → repository existant → réponse JSON
```

Pas de réécriture de logique métier. Les 73 usecases sont réutilisables tels quels.

---

## Briques existantes réutilisables

| Brique | Statut |
|--------|--------|
| Usecases domaine (73 usecases) | Prêts, découplés du transport |
| Rate limiting (Prisma + port `RateLimiter`) | En production (contact form) |
| Webhooks entrants (Stripe, Sentry) | Pattern validé, signature HMAC |
| API routes Next.js | 18 routes existantes |

---

## Ce qu'il faut construire

### 1. Authentification par API key

- Nouveau modèle Prisma `ApiKey` (userId, key, name, scopes, rateLimit, lastUsedAt, expiresAt)
- Middleware Next.js qui valide le header `Authorization: Bearer <api_key>`
- Résolution de l'utilisateur + vérification des scopes
- Rate limiting par API key (infrastructure existante)

### 2. Endpoints REST — scope v1

**Lecture :**

| Endpoint | Usecase existant | Description |
|----------|-----------------|-------------|
| `GET /api/v1/circles` | `get-user-circles` | Lister ses Communautés |
| `GET /api/v1/circles/:slug` | `get-circle` | Détail d'une Communauté |
| `GET /api/v1/circles/:slug/members` | `get-circle` (inclut membres) | Lister les membres |
| `GET /api/v1/circles/:slug/moments` | `get-circle-moments` | Événements d'une Communauté |
| `GET /api/v1/moments/:slug` | `get-moment` | Détail d'un événement |
| `GET /api/v1/moments/:slug/registrations` | `get-moment-registrations` | Lister les inscrits |

**Écriture :**

| Endpoint | Usecase existant | Description |
|----------|-----------------|-------------|
| `POST /api/v1/moments` | `create-moment` | Créer un événement (brouillon) |
| `POST /api/v1/moments/:id/publish` | `publish-moment` | Publier un événement |
| `PATCH /api/v1/moments/:id` | `update-moment` | Modifier un événement |
| `DELETE /api/v1/moments/:id` | `delete-moment` | Supprimer un événement |

### 3. Webhooks sortants

Notifier les intégrateurs quand un événement se produit dans leur Communauté.

**Événements v1 :**

| Événement | Déclencheur |
|-----------|------------|
| `registration.created` | Participant s'inscrit |
| `registration.cancelled` | Participant se désinscrit |
| `moment.published` | Événement publié |
| `comment.created` | Nouveau commentaire |

**Infrastructure nécessaire :**
- Modèle Prisma `WebhookEndpoint` (userId, url, secret, events[], active)
- Table `WebhookDelivery` (endpointId, event, payload, status, attempts, lastAttemptAt)
- Signature HMAC-SHA256 (même pattern que Stripe/Sentry)
- Retry avec backoff exponentiel (cron ou background job)

### 4. UI de gestion

- Page dans le dashboard Organisateur : "Clés API"
- Créer / révoquer des clés
- Configurer les webhooks (URL, événements, tester)
- Historique des appels (dernière utilisation, volume)

### 5. Documentation

- Page `/developers` ou `/api-docs` sur le site
- Spec OpenAPI auto-générée ou page Markdown avec exemples curl
- Exemples Node.js / Python pour les cas d'usage courants

---

## Estimation d'effort

| Scope | Effort | Ce que ça couvre |
|-------|--------|-----------------|
| **API v1 lecture seule** | ~1 semaine | Lister Communautés, événements, inscrits. Dashboards externes. |
| **API v1 lecture + écriture** | ~2 semaines | + Créer/publier événements. Couvre l'automatisation (cas Dev With AI). |
| **API v1 complète + webhooks** | ~3 semaines | + Webhooks sortants. Couvre le "branchement système interne" complet. |

---

## Scope v1 minimal (recommandé pour lancer)

Cibler le cas d'usage "Dev With AI" — un organisateur qui veut :
1. **Créer des événements automatiquement** → `POST /api/v1/moments` + `POST .../publish`
2. **Récupérer les inscrits** → `GET /api/v1/moments/:slug/registrations`
3. **Être notifié des inscriptions** → webhook `registration.created`

5 endpoints + 1 webhook = scope minimal pour débloquer les premiers intégrateurs.

---

## Sécurité

- API keys hashées en base (SHA-256), jamais stockées en clair
- Scopes par clé (lecture seule vs lecture/écriture)
- Rate limiting par clé (configurable, défaut 1 000 req/heure)
- Les clés API donnent accès uniquement aux Communautés dont l'utilisateur est Organisateur (isolation multi-tenant native via les usecases)
- Webhooks signés (HMAC-SHA256 avec secret par endpoint)
- Logs d'audit (qui a fait quoi, quand)

---

## Décisions à prendre

- [ ] L'API est-elle réservée au Plan Pro, ou disponible pour tous ?
- [ ] Limite de clés API par utilisateur ?
- [ ] Versioning : préfixe `/v1/` dès le départ (recommandé)
- [ ] Format de réponse : JSON:API, ou JSON simple avec pagination curseur ?
