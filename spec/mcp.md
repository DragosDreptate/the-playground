# MCP (Model Context Protocol) — Analyse et décisions

> **Statut : non implémenté — décision reportée à Phase 2**
> Analyse réalisée le 2026-02-27. Aucune implémentation à ce stade.

---

## Contexte de la décision

L'idée est de rendre The Playground **AI-native** via le Model Context Protocol d'Anthropic. MCP est un standard ouvert permettant à des clients IA (Claude Desktop, Claude Code, Cursor, etc.) de se connecter à des serveurs exposant des outils, ressources et prompts.

```
Client IA (Claude Desktop, Claude Code...)
        ↕ MCP Protocol
Serveur MCP (The Playground)
        ↕ Usecases existants
Base de données / Services
```

---

## Les deux scénarios identifiés

### Scénario 1 — The Playground comme serveur MCP (exposition externe)

The Playground exposerait un serveur MCP que tout client IA compatible pourrait utiliser. Exemples d'usage :
- *"Liste mes prochains événements"*
- *"Crée un événement React Paris Meetup dans ma Communauté Tech le 15 mars"*
- *"Envoie-moi le récap de ma Communauté cette semaine"*

**Valeur** : différenciateur fort vs Meetup/Luma (ni l'un ni l'autre n'a de MCP). Positionne The Playground comme AI-native dès le lancement.

### Scénario 2 — MCP dans les features IA internes (La Boussole)

Utiliser MCP comme couche de contexte pour l'assistant IA interne. Au lieu de passer le contexte manuellement dans les prompts Claude, l'IA ferait des appels MCP pour lire les données pertinentes (historique communauté, membres, événements passés, etc.).

**Valeur** : meilleure qualité de génération pour les features IA (descriptions, emails). Mais over-engineering pour le MVP — l'injection directe de contexte dans le prompt est suffisante à court terme.

---

## Faisabilité technique

### Fit architectural — excellent

L'architecture hexagonale en place est un **fit parfait** pour MCP. Le serveur MCP serait simplement un nouveau point d'entrée qui réutilise les 41 usecases existants. Aucune logique métier à dupliquer.

```
Aujourd'hui :
app/actions/ → usecases → repositories/services

Avec MCP :
app/actions/ ↘
               usecases → repositories/services
mcp/tools/   ↗
```

### État du codebase au moment de l'analyse

- ✅ 41 usecases structurés et testés (30 core + 11 admin)
- ✅ Pattern ports/adapters éprouvé (Email, Storage, Places)
- ✅ Pas d'AIService encore — ardoise vierge pour l'IA
- ✅ API routes minimales — aucun conflit
- ✅ Auth.js en place — peut être étendu pour générer des tokens OAuth

### Inventaire des usecases disponibles pour exposition MCP

**Read-only (bas risque) :**
- `GetPublicCirclesUsecase` — découverte publique
- `GetPublicUpcomingMomentsUsecase` — événements publics
- `GetMomentUsecase` — détail événement
- `GetCircleUsecase` — détail communauté
- `GetUserCirclesUsecase` — mes communautés (auth)
- `GetUserUpcomingMomentsUsecase` — mes prochains événements (auth)
- `GetUserPastMomentsUsecase` — mes événements passés (auth)
- `GetUserRegistrationUsecase` — mon inscription à un événement (auth)
- `GetMomentCommentsUsecase` — commentaires d'un événement
- `GetAdminStatsUsecase` — stats plateforme (admin)

**Write (risque plus élevé — Phase 2 MCP) :**
- `CreateMomentUsecase`, `UpdateMomentUsecase`, `DeleteMomentUsecase`
- `JoinMomentUsecase`, `CancelRegistrationUsecase`
- `CreateCircleUsecase`, `UpdateCircleUsecase`
- `AddCommentUsecase`, `DeleteCommentUsecase`

---

## Analyse des risques

| Risque | Niveau | Détail |
|---|---|---|
| **Auth OAuth** | Moyen | La partie complexe : OAuth 2.0 pour que les clients IA s'authentifient au nom des utilisateurs. Auth.js gère les sessions, pas les API tokens. Il faut implémenter PAT (Personal Access Tokens) ou OAuth flow complet. |
| **Surface d'attaque** | Moyen | Les write tools (create/join) peuvent être abusés. Rate limiting robuste obligatoire. Surtout risqué avant d'avoir des utilisateurs réels (pas de monitoring établi). |
| **Contrat API prématuré** | Moyen | Une fois le MCP publié et utilisé, c'est un contrat. Si le modèle de données évolue, les intégrations se cassent. Risque avant stabilisation du schéma. |
| **Focus MVP** | Élevé | Investir 2-3 semaines dans MCP avant d'avoir validé les parcours core retarde le lancement. |
| **Plomberie MCP** | Faible | `@modelcontextprotocol/sdk` TypeScript bien documenté. L'archi hexagonale rend l'implémentation propre. |
| **Read-only tools** | Faible | Aucun risque sécurité si bien scopés. |

---

## Architecture proposée pour quand on implémente

### Transport : Streamable HTTP

Intégrable directement comme route Next.js (`/api/mcp`), déployable sur Vercel sans infrastructure supplémentaire. Pas de processus séparé.

### Structure de fichiers

```
src/
  mcp/
    server.ts                    # Point d'entrée MCP + auth middleware
    tools/
      circles.ts                 # listCircles, getCircle, createCircle
      moments.ts                 # listMoments, getMoment, createMoment
      registrations.ts           # joinMoment, cancelRegistration, listRegistrants
      profile.ts                 # getProfile, updateProfile
    resources/
      moment.ts                  # moment://[slug] → données d'un événement
      circle.ts                  # circle://[id] → données d'une communauté
    prompts/
      generate-event.ts          # Template : génère une description d'événement
      invite-members.ts          # Template : génère un email d'invitation
```

### Outils MCP V1 (read-only + PAT)

| Outil MCP | Usecase réutilisé | Auth |
|---|---|---|
| `list_public_events` | `GetPublicUpcomingMomentsUsecase` | Non |
| `list_public_circles` | `GetPublicCirclesUsecase` | Non |
| `get_moment` | `GetMomentUsecase` | Non (public) |
| `get_circle` | `GetCircleUsecase` | Non (public) |
| `list_my_circles` | `GetUserCirclesUsecase` | PAT requis |
| `list_my_events` | `GetUserUpcomingMomentsUsecase` | PAT requis |
| `list_my_registrations` | `GetUserRegistrationUsecase` | PAT requis |

### Auth MCP V1 — Personal Access Tokens (PAT)

Approche simple pour V1 (pas OAuth complet) :
- Nouvelle table `UserApiToken` : `id`, `userId`, `token` (hash), `label`, `lastUsedAt`, `createdAt`
- Page settings profil : générer / révoquer des tokens
- Middleware MCP : header `Authorization: Bearer <token>` → lookup en DB → user context

OAuth 2.0 complet (pour que les clients tiers s'authentifient via UI The Playground) → Phase 2 MCP, après les PATs.

---

## Plan de déploiement recommandé

### Phase 2a — AIService interne (La Boussole) — implémenter en premier

Avant MCP, implémenter l'IA interne :
- Port `AIService` + adapter `ClaudeAIService`
- Features : génération description événement, email invitation, suggestions communauté
- Pas de MCP nécessaire à ce stade — injection de contexte direct dans les prompts

### Phase 2b — MCP V1 minimal (read-only + PAT)

- Server MCP Streamable HTTP sur `/api/mcp`
- 7 tools read-only listés ci-dessus
- Auth via PAT (pas OAuth)
- Tests : unit tests des tool handlers + test d'intégration end-to-end MCP
- Publier dans les répertoires de serveurs MCP (mcp.so, etc.)
- Durée estimée : 3-4 jours

### Phase 3 — MCP V2 (write tools + OAuth complet)

- Tools write : `create_moment`, `join_moment`, `create_circle`
- OAuth 2.0 authorization code flow
- Rate limiting par token
- Durée estimée : 1-2 semaines

---

## Positionnement stratégique

- **Meetup** : pas de MCP
- **Luma** : pas de MCP
- **The Playground avec MCP** : première plateforme communautaire AI-native

Avantage concret : les power users qui gèrent leurs communautés dans Claude Desktop / Claude Code peuvent interagir avec The Playground sans changer d'outil. Avec la montée en puissance des agents autonomes, c'est un différenciateur crédible.

---

## Décision finale

> **Implémenter MCP read-only V1 en Phase 2, après les features IA internes (La Boussole).**
>
> Ordre : MVP complet → AIService (La Boussole) → MCP V1 (read-only + PAT) → MCP V2 (write + OAuth)
>
> Ne pas implémenter MCP avant d'avoir des utilisateurs actifs (risque contrat prématuré + focus).
