# Timeouts Neon / WebSocket — analyse consolidée & plan pérenne

> **Statut** : analyse de référence (2026-06-03). Base unique pour régler le problème de manière fiable et durable.
> **Consolide** : les issues Sentry actives, l'historique git des mitigations, le code actuel, **et surtout deux sessions d'analyse approfondie jamais persistées** (23 mai et 1er juin 2026, voir [§11](#11-sources--sessions-danalyse)).
>
> **Périmètre** : couche d'accès DB (`src/infrastructure/db/`), driver Neon serverless, pages et crons qui plantent sur hoquet DB. Complète la section 3 du [runbook d'urgence](./incident-runbook.md).

---

## 1. Résumé exécutif

Depuis début mai 2026, des erreurs intermittentes de connexion à Neon font planter des pages publiques et des crons en production. Deux signatures, **une seule famille de cause** :

- `DriverAdapterError: Control plane request failed`
- `Error: [object ErrorEvent]`

**Mécanisme dominant : la « stale connection » (connexion fantôme).** L'app garde un pool de connexions **WebSocket** persistantes vers Neon (`@neondatabase/serverless` via `@prisma/adapter-neon`). Quand une lambda Vercel reste « tiède » sans parler à la DB pendant quelques minutes, ses connexions WebSocket meurent côté réseau/Neon **sans que personne ne prévienne le pool**. La requête suivante tire une connexion fantôme, n'obtient jamais de réponse, et timeout. C'est un grand classique du WebSocket en serverless. Un cold start du compute Neon (`scale-to-zero`) est un second mécanisme, secondaire.

**Pourquoi le WebSocket et pas le TCP** : le mode TCP/HTTP a été essayé puis **abandonné pour raisons de performance** (~120 ms d'overhead par requête contre ~15 ms en connexion persistante). **Repasser en TCP est exclu** ([§9](#9-décision-verrouillée--pas-de-retour-au-tcp)).

**Impact réel** : faible en volume (quelques occurrences/semaine, `userCount: 0` sur la plupart — crawlers et crons), mais **non maîtrisé** et **récurrent malgré 9 itérations**. Le retry actuel (backoff max ~400 ms, timeout 15 s/tentative) re-tente sur le même pool fantôme et perd 30 à 185 s avant d'abandonner.

**Direction recommandée** : un **quick win de config pure** (zéro risque, 15 min) attaque directement la stale connection ; les leviers structurants (auto-réparation du pool) sont analysés mais **lourds et risqués**, à ne sortir que sur récidive. Voir [§7](#7-plan-daction-priorisé).

---

## 2. Inventaire des incidents Sentry

Org `the-playground-id`, projet `the-playground` (id `4510940226650192`). Relevé 2026-06-03.

| ShortID | Sentry ID | Signature | Surface (`culprit`) | Occ. | First | Last |
|---|---|---|---|---|---|---|
| `THE-PLAYGROUND-1C` | 118738756 | `DriverAdapterError: Control plane request failed` | `GET /api/cron/transition-past-moments` | 15 | 2026-05-09 | 2026-05-26 |
| `THE-PLAYGROUND-18` | 113675721 | `DriverAdapterError: Control plane request failed` | `/[locale]/m/[slug]/opengraph-image` | 5 | 2026-05-10 | 2026-06-01 |
| `THE-PLAYGROUND-1F` | 122025071 | `Error: [object ErrorEvent]` | `/[locale]/m/[slug]` (page événement) | 4 | 2026-05-23 | 2026-06-03 |
| `THE-PLAYGROUND-1D` | 118803150 | `DriverAdapterError: Control plane request failed` | `GET /api/cron/send-reminders` | 1 | 2026-05-10 | 2026-05-10 |
| `THE-PLAYGROUND-1J` | 124031287 | `<anonymous>` (ErrorEvent non wrappé) | `POST /m/soiree-tremplin-...` (inscription) | 1 | 2026-06-01 | 2026-06-01 |
| `THE-PLAYGROUND-11` | *(résolue)* | `Connection terminated unexpectedly` | déploiements Vercel | — | — | réf. commit `50ba3fa` |

> `THE-PLAYGROUND-1G` (N+1 Query sur la page Communauté) a longtemps été suspecté de **causer** 1F. **Faux** : l'analyse du 23 mai a montré que le N+1 et l'incident infra Neon sont **décorrélés** (fenêtres horaires distinctes, modèles incriminés différents). Le N+1 est une dette de perf propre, sans lien causal avec les timeouts WebSocket. Ne pas confondre les deux.

**Surfaces touchées** : pages publiques `/m/[slug]` (+ OG image, fort trafic crawler), inscription (`POST /m/...`), et crons (`transition-past-moments`, `send-reminders`). Point commun : chemins qui utilisent une connexion DB **après une période d'inactivité de la lambda**.

---

## 3. Anatomie de la défaillance

```
Requête Next.js (page /m/[slug], inscription, ou cron)
   │
   ▼
Prisma Client ($extends : retry lectures + log slow query)
   │
   ▼
@prisma/adapter-neon  ──►  @neondatabase/serverless (WebSocket Pool, pg-pool)
   │
   ▼
Pool de ≤10 connexions WebSocket persistantes ──► Neon (control plane → Postgres)
        │
        └── pendant l'inactivité de la lambda : les WS meurent silencieusement
                 │
                 ▼
        la requête suivante tire une connexion FANTÔME → pas de réponse → timeout 15 s
                 │
        retry immédiat → souvent une autre connexion fantôme du même pool → re-timeout
                 │
              ┌──┴───────────────────────────┐
              ▼                               ▼
  l'erreur passe par Prisma         l'ErrorEvent DOM remonte brut
  → DriverAdapterError:             (OG image, sérialisation, hors $extends)
    "Control plane request failed"  → "Error: [object ErrorEvent]" (.message vide)
```

### Les deux signatures = une seule panne

| Signature | Quand | Mécanisme |
|---|---|---|
| `DriverAdapterError: Control plane request failed` | L'erreur passe par le query engine Prisma | Prisma wrappe proprement l'échec du driver |
| `Error: [object ErrorEvent]` | L'erreur remonte **hors** du hook `$extends` (rendu OG image, code hors `query()`) | L'`ErrorEvent` DOM brut (`.message === ""`, `.type === "error"`) est stringifié par Sentry → `[object ErrorEvent]` |

---

## 4. Diagnostic « stale connection » — reconstitution (issue 1J, 1er juin)

Timeline reconstruite depuis les breadcrumbs de l'inscription qui a échoué le 2026-06-01 :

| Heure UTC | Événement |
|---|---|
| 07:44:41 | Première activité lambda (`slow query Moment.findUnique`) |
| 07:44:43 | 3 GET vers le cache Vercel |
| **07:44:43 → 07:47:51** | **3 minutes de silence** — la lambda reste tiède, ne touche pas la DB |
| 07:47:51 | Cache invalidé + `Circle.findUnique` → emails Resend OK |
| 07:48:46 | **Échec du `count` Registration après 54,6 s** |

**Lecture** : pendant les 3 minutes de silence, les connexions du pool sont mortes côté réseau/Neon. Le pool « croit » toujours avoir 10 tuyaux ouverts. Le `count` tire un tuyau fantôme → 4 tentatives × ~13-15 s ≈ 54 s avant d'abandonner.

**Pourquoi le `count` est la première victime** : les requêtes précédentes (`findOrganizers`, etc.) ont réussi parce qu'un pool peut contenir un **mix** de connexions vivantes et fantômes ; selon celle qu'on tire, ça passe ou pas. C'est la signature exacte de la « stale connection ».

> Des durées bien pires ont été observées sur d'autres incidents : **185 s** (issue 18, OG image) et même **6 à 22 minutes** (incident nocturne du 23 mai, control plane / pool wedgé). Le temps n'est pas dans le backoff (max 400 ms) mais dans les connexions fantômes qui restent pendantes.

---

## 5. État actuel du dispositif (code)

### 5.1 Driver & pool — `src/infrastructure/db/prisma.ts`
```ts
new PrismaNeon(
  { connectionString: process.env.DATABASE_URL!,
    max: 10,                       // 5 → 10 (commit 2f60005)
    idleTimeoutMillis: 30_000,     // ⚠️ trop long : laisse les WS devenir fantômes
    connectionTimeoutMillis: 15_000 }, // ⚠️ trop long : 4 × 15 s = 54 s perdues
  { onPoolError: (err) => /* log structuré pool_error, mais AUCUNE réaction */ }
);
```
Mode = **WebSocket Pool**. `@neondatabase/serverless` v1.0.2, `@prisma/adapter-neon` v7.4.1, endpoint Neon **pooled** (`-pooler`).

### 5.2 Retry — `src/infrastructure/db/retry-policy.ts`
- `MAX_RETRIES = 3`, `BASE_DELAY_MS = 100` → délais **100 / 200 / 400 ms**.
- Retry **lectures uniquement** (`READ_OPERATIONS`).
- `isTransientError` matche : patterns texte (`Control plane`, `websocket_error_event`, `WebSocket`, `Connection terminated`, `ECONNRESET`, `ETIMEDOUT`…) + codes Prisma (`P1008/P1011/P1015/P1017/P2024`).
- `describeDbError` produit la sentinelle `websocket_error_event` pour les `ErrorEvent` au `.message` vide. Bien testé (`__tests__/retry-policy.test.ts`).

### 5.3 Confinement — `src/lib/degraded-query.ts`
`degradedQuery(promise, fallback, tag)` : rend un fallback + `noStore()` (opt-out ISR) + `Sentry.captureException` si un bloc **décoratif** échoue. **Utilisé uniquement sur la page Communauté** (`circles/[slug]`), **pas sur la page événement** `/m/[slug]`.

### 5.4 Instrumentation — `src/sentry.server.config.ts`
`tracesSampleRate: 0.1` en prod. **Aucun `beforeSend` ni `ignoreErrors`** : les `[object ErrorEvent]` ne sont ni regroupés ni normalisés.

### 5.5 Lacunes
1. **Retry inadapté à la stale connection** : il re-tente sur le **même pool** fantôme. Sans invalidation du pool, les retries sont quasi inutiles.
2. **Timeouts trop longs** : `idle 30 s` laisse les WS pourrir ; `connectionTimeout 15 s` × 4 = 54 s perdues.
3. **`onPoolError` ne réagit pas** : il logge mais ne reconstruit rien.
4. **Page événement non protégée** par `degradedQuery` (issues 1F, 1J).
5. **Crons fragiles** : un échec n'est pas explicitement rattrapé.
6. **Bruit Sentry** : `[object ErrorEvent]` non fingerprinté.

---

## 6. Causes racines

| # | Cause | Niveau | Statut |
|---|---|---|---|
| R1 | **Stale connection** : WS du pool mortes pendant l'inactivité lambda, non détectées | **Mécanisme dominant** | Confirmé (timeline 1J) |
| R2 | Cold start du compute Neon (`scale-to-zero`) → control plane lent | Mécanisme secondaire | **Confirmé** — `scale-to-zero` actif sur `production`, délai **5 min** (`suspend_timeout_seconds=300`, endpoint `ep-cool-bread-alja3wbs`), relevé API 2026-06-03 |
| R3 | Retry re-tente sur le pool fantôme sans l'invalider ; timeouts trop longs | Mitigation insuffisante | Confirmé (54 s / 185 s) |
| R4 | Rayon de blast non confiné (page événement, inscription, crons) | Résilience | Confirmé |

---

## 7. Plan d'action priorisé

> Principe : **commencer par ce qui ne coûte rien et ne risque rien** (config pure), puis monter en complexité **seulement si la récidive le justifie**.

### Tier 0 — Confirmer (préalable, ~30 min, sans déploiement)
- [x] **`scale-to-zero` actif sur `production` : OUI, délai 5 min** (`suspend_timeout_seconds=300` sur l'endpoint `ep-cool-bread-alja3wbs`). Idem staging (300 s) et dev (0 = défaut 5 min). Relevé via API Neon le 2026-06-03 (voir [annexe C](#annexe-c--inspecter--régler-le-scale-to-zero-neon-api)). → **R2 confirmé.**
- [ ] Corréler finement les timestamps Sentry avec les cold starts compute Neon (optionnel).
- [ ] Mesurer le **temps d'une reconnexion WS fraîche** Vercel EU → Neon EU (calibre le Tier 1).

### Tier 1 — Quick win « piste hybride » (config pure, 15 min, ZÉRO risque) ⭐ RECOMMANDÉ EN PREMIER
Attaque directement R1/R3 sans toucher à la logique :
- [x] `idleTimeoutMillis: 30_000 → 8_000` : recycle les connexions inactives **avant** qu'elles ne deviennent fantômes.
- [x] `connectionTimeoutMillis: 15_000 → 5_000` : échoue vite quand une connexion ne répond pas (4 × 5 s = 20 s max au lieu de 54 s, et le retry a plus de chances d'obtenir une connexion fraîche).
- [ ] Observer Sentry 1 à 2 semaines après merge. Si la famille d'erreurs disparaît, **on s'arrête là**.

> **Statut : livré, en attente de merge — [PR #509](https://github.com/DragosDreptate/the-playground/pull/509)** (`fix/neon-stale-connection-timeouts`, commit `50dc380`). Réversible en remettant `30_000` / `15_000`. `/code-review` sauté (diff = 2 constantes, zéro logique).

**Coût/risque** : `idle` plus court = quelques cold starts de connexion en plus (latence +qq centaines de ms après une pause). Aucune régression fonctionnelle.

### Tier 2 — Réduire les cold starts à la source (R2 confirmé : scale-to-zero actif 5 min)
À n'activer **que si** le Tier 1 ne suffit pas (le scale-to-zero n'est que le mécanisme secondaire ; inutile de payer de l'always-on avant d'avoir mesuré l'effet du Tier 1).
- [ ] **Option A** : désactiver l'autosuspend sur `production` → `suspend_timeout_seconds: -1` via API ([annexe C](#annexe-c--inspecter--régler-le-scale-to-zero-neon-api)) ou console. Coût : compute always-on (~qq $/mois). ⚠️ **Piège console** : la modale « Change **default** compute settings » ne modifie que les **futurs** computes (« Modifying these defaults does not alter the settings of any existing computes »). Pour agir sur la prod existante, éditer **le compute de la branche production lui-même**, pas les défauts.
- [ ] **Option B (gratuite)** : cron keep-alive léger (`SELECT 1`) toutes les ~4 min. On a déjà l'infra cron. Ne couvre pas les rolling deploys Neon.

### Tier 3 — Levier C : auto-réparation du pool (ANALYSÉ, ABANDONNÉ — voir §8)
Solution structurante : sur détection d'une erreur fantôme, **détruire et reconstruire tout le pool** pour que le retry reparte sur du neuf. Puissant mais **4 à 7 h, risque réel** (le Proxy `PrismaClient`). **Décision du 1er juin : abandonné, trop risqué/complexe.** À ne reprendre que sur récidive fréquente, en privilégiant l'**alternative A** (redémarrage de lambda) qui évite le Proxy. Détail complet en [§8](#8-levier-c--auto-réparation-du-pool-analyse-détaillée).

### Tier 4 — Robustesse applicative & confinement (complémentaire, par incident)
- [ ] Étendre `degradedQuery` aux blocs **décoratifs** de la page événement `/m/[slug]` (compteurs, inscrits, commentaires). Garder titre/date/CTA en chemin non dégradé.
- [ ] Notifications découplées du chemin de requête : `Promise.allSettled` sur les envois, fallback i18n sans compteur, ou **outbox pattern** (ligne `NotificationOutbox` PENDING insérée dans la même transaction que la Registration, drainée par un cron at-least-once). Évite de perdre silencieusement la notif Host / Slack (cas 1J).
- [ ] Remonter le `count` d'inscrits depuis `joinMoment` (qui le connaît déjà) au lieu d'une requête `count` séparée fragile.
- [ ] **Crons** : garantir idempotence + rattrapage (un run échoué repris au suivant, sans double envoi).

### Tier 5 — Réduire le bruit & surveiller
- [ ] `beforeSend` Sentry : normaliser le fingerprint des `[object ErrorEvent]` pour les regrouper avec les `Control plane request failed`. **Ne pas masquer** (garder visible pour détecter une régression).
- [ ] Compteurs/alerte de récidive après correction.

---

## 8. Levier C — auto-réparation du pool (analyse détaillée)

> Issu de la session du 1er juin. **Conservé pour mémoire : analysé en profondeur puis abandonné** (« trop risqué et complexe »). Sert de base si on doit y revenir.

**Idée centrale** : dès qu'on détecte une connexion fantôme, on jette tout le pool et on en reconstruit un neuf, pour que le retry suivant ait une vraie chance.

### Ce que la doc du driver Neon permet (`@neondatabase/serverless` v1, `@prisma/adapter-neon@7.4.1`)
- Deux hooks d'erreur : `onPoolError` (déjà branché — clients **idle** qui meurent) et `onConnectionError` (**pas** branché — uniquement les **transactions**, via `pool.connect()`).
- `adapter.underlyingDriver(): Pool` (étend `pg-pool`) et `adapter.dispose(): Promise<void>` (ferme tout).
- **Pas d'API « soft reset »** (`recycle()`/`purge()`). Le seul outil pour tout jeter est `dispose()`, qui **détruit** le pool ; il faut ensuite recréer un `PrismaNeon` + reconnecter.
- Pour un `count` simple (non transactionnel), l'adapter fait `pool.query(...)` ; **`onConnectionError` n'est PAS appelé** dans ce flux. On doit donc agir dans la boucle de retry (`performIO`) ou via `onPoolError`.

### Les 6 chantiers
1. **Rendre le client remplaçable** — transformer l'export `prisma` en **Proxy** qui redirige vers l'instance courante (le code appelant ne change pas). *Chantier le plus risqué, voir pièges.*
2. **`rebuildClient()`** — créer un nouveau client/pool frais, basculer le Proxy dessus, **réappliquer le `$extends`** (retry + logs), abandonner l'ancien sans attendre ses requêtes.
3. **Détecter le bon moment** — réutiliser la sentinelle `websocket_error_event` de `describeDbError` ; déclencher `rebuildClient()` dans le `catch` du retry **avant** la tentative suivante (+ seconde ceinture via `onPoolError`).
4. **Single-flight** — un verrou (Promise) sérialise la reconstruction : la 1ʳᵉ reconstruit, les autres attendent puis réessaient. Relâcher le verrou si la reconstruction échoue (sinon blocage permanent).
5. **Transactions** — brancher `onConnectionError` pour déclencher la même reconstruction (le `count` fautif était hors transaction, mais l'app fait des transactions ailleurs).
6. **Vérifier** — test unitaire (faux client qui jette un `ErrorEvent` vide ; vérifier une seule reconstruction sur 5 erreurs concurrentes), test preview (attendre 3 min d'inactivité puis inscrire), monitoring (« rebuilds déclenchés / réussis »).

### Les 4 pièges du Proxy (chantier 1) — la raison de l'abandon
1. **Sous-objets autonomes** : `prisma.user` retourné pointe vers le client courant ; un repo caché en mémoire (`const r = prisma.user`) continue d'utiliser l'ancien après reconstruction. → le Proxy doit aussi intercepter les sous-objets en cascade.
2. **Transactions** : `tx` dans `$transaction(async tx => …)` n'est pas le client global ; une transaction démarrée juste avant une reconstruction peut écrire sur l'ancien pool mort. → ne pas reconstruire pendant une transaction, ou les laisser mourir avec leur pool.
3. **TypeScript à moitié protecteur** : caster le Proxy en `PrismaClient` (`as`) compile, mais les propriétés spéciales des extensions peuvent renvoyer `undefined` au runtime. → couverture d'intégration de **toutes** les méthodes Prisma utilisées.
4. **HMR dev** (`globalForPrisma`) : mal articulé avec le Proxy, le dev local plante au premier reload. → garder la **cible** en global, le Proxy stable.

**Verdict** : « un ensemble de petits risques invisibles » qui passent review et tests puis explosent sur un chemin rare en prod. ~150-250 lignes + tests, **4-7 h**, risque latent.

### Alternatives qui suppriment le Proxy (préférées si on reprend le sujet)
- **Alternative A — redémarrage de lambda** : sur erreur fantôme, lever une erreur qui termine la fonction Vercel ; la prochaine invocation recrée tout (lambdas stateless, vider `globalForPrisma`). Pas de Proxy. Coût : on perd la requête en cours + un cold start. **Jugée la meilleure** pour garder l'esprit du levier C sans son piège principal.
- **Alternative B — attendre puis retry** : sur erreur fantôme, attendre 1-2 s que `pg-pool` éjecte les connexions mortes, puis retry. Zéro Proxy, beaucoup moins maîtrisé.

---

## 9. Décision verrouillée — pas de retour au TCP

Le mode TCP (`@prisma/adapter-pg` via pooler) a été essayé (commits `66b7b8e`, `a6ea956`) puis **abandonné pour raisons de performance** : chaque requête = ~120 ms d'overhead (HTTP/TCP non persistant) contre ~15 ms en WebSocket persistant. Confirmé par l'utilisateur (1er juin) : « aujourd'hui on est en websocket car l'autre mode avait de gros soucis de performance ». **Toute solution doit rester en mode WebSocket Pool.** Ne pas reproposer le TCP.

---

## 10. Historique des mitigations (la « saga » git)

| Commit | Intention | Limite |
|---|---|---|
| `8625e0a` | Adopter `@prisma/adapter-neon` | Choix initial |
| `66b7b8e` | `@prisma/adapter-pg` pour TCP (Prisma 7 exige un adapter) | Tentative TCP |
| `a6ea956` | TCP via pooler, « éliminer HTTP adapter » (perf ~120→15 ms) | **Abandonné ensuite (perf), voir §9** |
| `5c76773` | **Retour WebSocket Pool** ; config `max/idle/onPoolError` ; suppr. branche TCP | Choix actuel verrouillé |
| `50ba3fa` | Retry + backoff (100/200/400 ms, 3 essais) | Corrige `THE-PLAYGROUND-11`. Inutile sur pool fantôme non invalidé |
| `06ac986` | Retry limité aux **lectures** + restaurer le log d'échec | — |
| `4adcab0` | `connectionTimeoutMillis` 5→15 s + pattern `timeout exceeded` | ⚠️ a **rallongé** le temps perdu sur stale connection |
| `5bcfa2f` | `Control plane` reconnu transitoire ; extraction `retry-policy.ts` | Retenté mais sans invalider le pool |
| `2f60005` | `describeDbError` gère les `ErrorEvent` vides ; pattern WS ; pool 5→10 ; `degradedQuery` sur page Communauté | Page événement **toujours exposée** |

**Bilan** : on a bien progressé sur la *détection* et un *confinement partiel* (page Communauté). R1 (stale connection) est désormais attaqué par le quick win config ([PR #509](https://github.com/DragosDreptate/the-playground/pull/509), en attente de merge) qui **annule l'effet pervers du commit `4adcab0`** (timeout ramené de 15 s à 5 s). L'invalidation du pool (levier C) reste non faite (abandonnée). Le commit `4adcab0` avait **aggravé** le temps perdu en passant le timeout à 15 s ; le quick win le corrige.

---

## 11. Sources — sessions d'analyse

Ces analyses n'avaient **jamais été persistées** (« rien n'a été écrit sur disque ni en mémoire ») ; reconstituées depuis les transcripts Claude Code.

| Date | Transcript (UUID) | Contenu |
|---|---|---|
| 2026-05-23 | `46ee6fb6-…` (`fix-circle-page-neon-resilience`) | Issues 1F/1G/1H ; décorrélation N+1 vs incident Neon ; pool 5→10 ; `degradedQuery` ; explication « lignes téléphoniques » du pool ; PR mergée (= `2f60005`) |
| 2026-06-01 | `eddfea35-…` | Issue 1J ; **diagnostic stale connection** ; **leviers A/B/C/D** ; doc driver Neon ; **6 chantiers + 4 pièges Proxy + alternatives A/B** ; abandon motivé ; confirmation « TCP exclu pour perf » |

Les sous-agents associés (dossiers `…--claude-worktrees-fix-neon-control-plane-retry/` et `…-fix-circle-page-neon-resilience/`) contiennent des reviews de code (`/code-review`), pas l'analyse de fond.

---

## 12. Questions ouvertes (mises à jour)

1. ~~Pourquoi le TCP a-t-il été abandonné ?~~ **Résolu** : performance (§9).
2. ~~`scale-to-zero` est-il actif sur `production` ?~~ **Résolu** : oui, 5 min (§6 R2, [annexe C](#annexe-c--inspecter--régler-le-scale-to-zero-neon-api)).
3. **Temps d'une reconnexion WS fraîche** Vercel EU → Neon EU ? Si ~50 ms, le Tier 1 (`idle` court) est gratuit ; si 2-3 s, le calibrer prudemment. À mesurer en observant l'effet de la PR #509.
4. Faut-il un **`statement_timeout` Postgres** pour borner les requêtes pendantes plutôt que les laisser traîner 185 s ?

---

## 13. Critères de succès

Sur **30 jours glissants** en production :
- **0 occurrence** de `DriverAdapterError: Control plane request failed` et de `[object ErrorEvent]`, **OU**
- si l'on conserve `scale-to-zero` : **100 % des hoquets absorbés** (un `db_retry` toujours suivi d'un succès, jamais de `slow_query_failed` définitif).
- Aucune page `/m/[slug]` ne renvoie 500 sur hoquet DB (au pire, mode dégradé).
- Aucune notification Host/Slack perdue silencieusement sur hoquet (cas 1J).
- Les crons rattrapent un run échoué sans perte ni double envoi.

---

## Annexe A — Investigation Sentry (API)

> Règle projet : toujours l'**API Sentry**, jamais l'UI. Token `SENTRY_AUTH_TOKEN` (`.env.local`), org `the-playground-id`, projet id `4510940226650192`.

```bash
set -a; source .env.local; set +a

# Rechercher une famille d'issues (statsPeriod max 14d ; start/end pour + long)
curl -s -G -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/organizations/$SENTRY_ORG/issues/" \
  --data-urlencode "project=4510940226650192" \
  --data-urlencode "start=2026-03-05T00:00:00" --data-urlencode "end=2026-06-03T23:59:59" \
  --data-urlencode "query=DriverAdapterError"   # ou: ErrorEvent, Control plane, Neon

# Détail d'un événement (les breadcrumbs = la clé du diagnostic)
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/organizations/$SENTRY_ORG/issues/<ISSUE_ID>/events/latest/"
```
Breadcrumbs maison (`src/infrastructure/db/prisma.ts`) : `slow_query`, `slow_query_failed`, `db_retry`, `pool_error`. `duration` en ms : un `slow_query_failed` ≥ ~30 000 ms = signature stale connection / hoquet control plane.

## Annexe B — Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/infrastructure/db/prisma.ts` | Client Prisma, adapter Neon, config pool, hook retry + logs |
| `src/infrastructure/db/retry-policy.ts` | Patterns transitoires, `describeDbError`, `isTransientError` |
| `src/infrastructure/db/__tests__/retry-policy.test.ts` | Tests de la policy de retry |
| `src/lib/degraded-query.ts` | Confinement des blocs décoratifs (mode dégradé) |
| `src/sentry.server.config.ts` | Config Sentry serveur (pas de `beforeSend` actuellement) |
| `spec/infra/incident-runbook.md` | Runbook d'urgence (section 3 : DB inaccessible) |

## Annexe C — Inspecter / régler le scale-to-zero (Neon API)

> Clé `NEON_API_KEY` + `NEON_PROJECT_ID` dans `.env.local`. `suspend_timeout_seconds` : `0` = défaut (5 min) · `> 0` = N secondes · `-1` = **désactivé (always-on)**.

```bash
set -a; source .env.local; set +a

# Lister branches + endpoints avec leur suspend_timeout (lecture seule)
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/endpoints" \
  | python3 -c "import sys,json;[print(e['id'],e['branch_id'],'suspend=',e.get('suspend_timeout_seconds')) for e in json.load(sys.stdin)['endpoints']]"

# Désactiver le scale-to-zero sur PROD (Tier 2 option A) — modif production, valider d'abord
curl -s -X PATCH -H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json" \
  "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/endpoints/ep-cool-bread-alja3wbs" \
  -d '{"endpoint":{"suspend_timeout_seconds":-1}}'
```

État au 2026-06-03 : prod `ep-cool-bread-alja3wbs` = 300 s · staging `ep-noisy-waterfall` = 300 s · dev `ep-quiet-salad` = 0 (défaut 5 min). Branche prod = `br-dawn-waterfall-aldvtglk`.

⚠️ La modale console « Change **default** compute settings » ne touche **pas** les computes existants — éditer le compute de la branche production directement.
