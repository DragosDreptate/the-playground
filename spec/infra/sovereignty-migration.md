# Migration de souveraineté : quitter les fournisseurs américains

> Audit et plan de migration pour rendre The Playground souverain vis-à-vis des
> fournisseurs américains (Vercel, Neon, Resend, Sentry, PostHog), en les
> remplaçant par des équivalents européens.
>
> Statut : audit réalisé, aucune migration lancée. Document de référence à raffiner.
> Date de l'audit : 2026-06-03.

## Recadrage essentiel : résidence des données vs souveraineté juridique

Les cinq services tournent **déjà sur des datacenters européens** :

| Service | Localisation actuelle |
|---|---|
| Neon | `eu-central-1` (AWS Francfort) |
| Sentry | `de.sentry.io` (région Allemagne) |
| PostHog | `eu.posthog.com` + `eu-assets` (région UE) |
| Vercel | domaine custom, région EU configurable |
| Resend | UE par défaut |

Le sujet n'est donc **pas la résidence des données** (déjà conforme RGPD), mais la
**souveraineté juridique** : ces cinq entreprises sont américaines, donc soumises
au CLOUD Act et à FISA 702, peu importe la localisation physique des serveurs. Un
hébergement « EU » d'une société américaine ne protège pas de l'extraterritorialité.

### Trois niveaux de souveraineté

1. **Entreprise européenne** (peu importe son infra sous-jacente). Ex : Aiven
   (Finlande), parfois hébergé sur AWS. Souveraineté juridique oui, technique partielle.
2. **Souverain de bout en bout** : entreprise ET infra européennes (Scaleway,
   OVHcloud, Clever Cloud). Vraie indépendance technique et juridique.
3. **Self-host open source** sur infra souveraine. Contrôle total, charge ops importante.

**Niveau retenu : niveau 1 (entreprise européenne).** Pragmatique, souverain
juridiquement, sans porter l'ops d'un self-host lourd. Exception : Sentry, faute
de SaaS Sentry-compatible européen clé en main (self-host GlitchTip recommandé).

## Atout de départ : l'architecture hexagonale a déjà fait 60% du travail

Email et storage sont derrière des interfaces (`EmailService`, `StorageService`),
les templates email sont découplés de Resend (react-email rend du HTML standard),
et le driver DB peut basculer sans toucher au schéma. Les vrais points durs ne sont
pas dans le code applicatif, mais dans **l'outillage** (scripts Neon) et **l'infra** (Vercel).

## Synthèse : couplage, risque, effort par service

| Service | Couplage code | Risque migration | Effort | Cible européenne |
|---|---|---|---|---|
| **PostHog** | Faible (passif, 0 feature flag) | Très bas | 3 à 5 j | Plausible (Estonie) ou Matomo Cloud (Allemagne) |
| **Sentry** | Moyen (60 call-sites, SDK abstraitisable) | Bas | 3 à 5 j | GlitchTip self-hosté (API Sentry-compatible) |
| **Resend** | Faible (interface `EmailService` propre) | Moyen (deliverability) | 5 à 8 j | Scaleway TEM ou Brevo (France) |
| **Neon** | Faible côté app, fort côté scripts | Élevé (prod data, pooling) | 5,5 à 7 j | Aiven (FI) ou Scaleway/OVH/Clever (FR) |
| **Vercel** | Plateforme entière | Le plus élevé | 10 à 20 j | Clever Cloud ou Scaleway (Koyeb aussi) |

## Détail par service

### PostHog (analytics)

- **Pertinence** : élevée. Purement passif, **zéro feature flag**, aucune logique
  métier n'en dépend. Si PostHog tombe, l'app fonctionne à 100%.
- **Surface** : 13 events custom dans 13 fichiers, 2 events serveur, identification
  user, 2 crons de reporting qui lisent un dashboard via l'API (project ID `134622`).
- **Cibles** : Plausible (Estonie, simple, léger) ou Matomo Cloud (Allemagne, riche).
- **À faire** : remplacer les 13 `posthog.capture()` (un wrapper `track()` maison
  découplerait pour l'avenir), réécrire les 2 crons de reporting (pas d'équivalent
  direct à l'API dashboard PostHog), retirer le provider et les tunnels `/ingest`,
  mettre à jour la page confidentialité et le lien admin « person ».

### Sentry (error monitoring)

- **Pertinence** : élevée mais nuancée. 60 call-sites (47 `captureException`, 13
  `captureMessage`), alerting via webhook + analyse Claude + Slack, mais **zéro
  impact utilisateur** (tout est fire-and-forget).
- **Astuce clé** : le SDK `@sentry/nextjs` est compatible **GlitchTip** (backend
  open source qui parle le protocole Sentry). On **ne touche pas** aux 60 call-sites
  ni à `global-error.tsx`. On change juste le DSN.
- **À faire** : déployer GlitchTip sur infra EU souveraine, changer
  `NEXT_PUBLIC_SENTRY_DSN`, vérifier l'upload des source maps (supporté par GlitchTip),
  réadapter le pipeline maison (webhook `/api/sentry/webhook`, `analyze-issue.ts`,
  appels API qui ciblent `de.sentry.io`).
- **Note** : pas de SaaS Sentry-compatible européen clé en main. Sentry impose donc
  un peu de self-host, ou de rester sur Sentry région EU (niveau de souveraineté le plus faible).

### Resend (email)

- **Pertinence** : élevée (transactionnel critique : confirmations, magic links).
- **Bonne nouvelle** : interface `EmailService` (28 méthodes) propre, zéro référence
  Resend. **react-email n'est PAS couplé à Resend** : `render()` produit du HTML que
  n'importe quel transport (SMTP ou API) envoie. Les 25 templates sont réutilisables tels quels.
- **Fuites de couplage à colmater** :
  - Auth.js utilise `ResendProvider` pour le magic link. Remplacer par un provider
    SMTP générique (Nodemailer) vers le fournisseur EU.
  - 6 appels directs hors interface (`contact.ts`, `analyze-issue.ts`, 2 crons PostHog).
  - 3 scripts one-shot font `new Resend()` sans le wrapper de sécurité.
  - Le monitoring de quota lit le header `x-resend-daily-quota` (spécifique Resend),
    chunking calé sur la limite Resend de 100. À ré-adapter.
- **Cibles** : Scaleway Transactional Email (souverain) ou Brevo (France, deliverability
  établie). Mailjet (groupe Sinch, suédois) en option.
- **Vrai risque : la deliverability.** Nouveau domaine/IP à réchauffer, SPF/DKIM/DMARC
  à reconfigurer. Mal géré, les emails partent en spam.

### Neon (base de données)

Voir le deep-dive détaillé plus bas.

### Vercel (hosting)

Vercel n'est pas un service mais **la plateforme entière** : hosting Next.js +
build/deploy + 7 crons + Blob storage + image optimization + Speed Insights.

- **Blob storage** : interface `StorageService` déjà abstraite, usages simples
  (`put`/`del`), S3-compatible. **Migrable indépendamment et tôt** vers Scaleway
  Object Storage ou OVH Object Storage. Le sous-chantier le plus facile des cinq services.
- **7 crons Vercel** (`vercel.json`) : reminders, transitions, scores, reports, cleanup.
  À redéployer sur un scheduler souverain (Scaleway Serverless Jobs, Clever Cloud cron, node-cron).
- **Hosting** : Next.js s'auto-héberge bien (`output: standalone`). Middleware déjà
  en **runtime Node, pas Edge** : aucun lock-in edge. Image optimization fonctionne sur Node (sharp).
- **Speed Insights** : pure télémétrie Vercel, à retirer. `@vercel/analytics` est une
  **dépendance morte** (installée, jamais importée) : suppression immédiate.
- **CSP + `next.config.ts`** : domaines Blob hardcodés à mettre à jour, guards
  `VERCEL_ENV` à remplacer par une variable custom (`APP_ENV`).
- **Build/deploy** : aujourd'hui webhook automatique Vercel. À reconstruire :
  Dockerfile + pipeline CI/CD, ou git-push-to-deploy (Clever Cloud, Koyeb).
- **Cibles** : Clever Cloud (DX proche de Vercel, crons natifs), Scaleway (stack la
  plus complète : hosting + cron + blob + db + email d'un coup), Koyeb (serverless français Vercel-like).

## Ordre de migration recommandé

Du plus simple au plus complexe, pour livrer de la souveraineté tôt avec un risque croissant.

- **Étape 0 (préalable, 0 risque)** : retirer `@vercel/analytics` (morte) et `@vercel/speed-insights`.
- **Étape 1 : PostHog → Plausible/Matomo.** Risque le plus bas, passif. Rode le processus.
- **Étape 2 : Sentry → GlitchTip.** Code quasi intact (SDK compatible). Valide la capacité à self-host EU.
- **Étape 3 : Vercel Blob → Scaleway/OVH Object Storage.** Sous-chantier détachable, S3-compatible. Quick win.
- **Étape 4 : Resend → Scaleway TEM/Brevo.** Premier risque moyen (deliverability). Phase de réchauffe domaine.
- **Étape 5 : Neon → Postgres managé souverain.** Risque élevé (données prod), code simple. Fenêtre de bascule planifiée.
- **Étape 6 : Vercel (hosting + crons + deploy) → Clever Cloud/Scaleway.** Le plus lourd, en dernier.

Logique : commencer par le passif et le réversible (1, 2, 3), enchaîner sur le
critique mais abstrait (4, 5), terminer par la plateforme (6) quand ses briques
satellites ont déjà migré.

---

## Deep-dive : Neon → Postgres managé souverain

### Comparatif des cibles (niveau « entreprise européenne »)

| Critère | Aiven (Finlande) | Scaleway (France) | OVHcloud (France) | Clever Cloud (France) |
|---|---|---|---|---|
| Souveraineté | Entreprise FI, infra au choix. Choisir **UpCloud** pour 100% EU | De bout en bout (groupe Iliad) | De bout en bout | De bout en bout (Nantes) |
| Équivalent branching Neon | **Oui (forks de DB)**, le plus proche | Non (snapshots manuels) | Non (snapshots/PITR) | Non |
| Pooling | PgBouncer managé intégré | Connection Pooling (PgBouncer) | Pooling managé | Pooling add-on |
| PITR / snapshots | Oui | Oui | Oui (PITR) | Backups |
| Scale-to-zero | Non (always-on) | Non | Non | Non |
| Atout | DX le plus proche de Neon | Consolidation (si migration Vercel/Blob/email aussi) | Robuste, gros volumes | Simple, couplé au hosting Clever |
| Bémol | Souveraineté dépend du cloud choisi | DX console correcte sans plus | Console/DX datée | Moins de features avancées |

**Deux finalistes** :

- **Aiven** si on veut **préserver le branching** (`db:dev:reset`). Ses forks
  reproduisent quasiment l'expérience Neon. À déployer sur UpCloud (pas AWS EU) pour une souveraineté propre.
- **Scaleway** pour la **cohérence de la migration globale**. Tout regrouper chez un
  acteur souverain français simplifie facturation, réseau et ops. En échange, reconstruire le branching via snapshots.

**Coût à anticiper** : perte du **scale-to-zero** de Neon. Un Postgres managé
classique est always-on, donc coût fixe mensuel par environnement (prod + staging + dev).

### Facile vs dur

**Facile (code applicatif, ~0,5 j)**
- `@prisma/adapter-pg` **déjà installé**. Swap dans `src/infrastructure/db/prisma.ts` = quelques lignes.
- Schéma Prisma en `postgresql` standard, aucune extension Neon. Zéro changement de modèle.

**Dur (outillage + données, ~4 à 7 j)**
- 20+ scripts shell couplés à l'API Neon v2 (`console.neon.tech/api/v2`).
- 37 fichiers TS qui instancient `PrismaNeon` en dur.
- La migration des données de prod (fenêtre de bascule).
- Le pooling et le SSL à reconfigurer (Neon masquait ces détails).

### Plan pas à pas

#### Phase A — Découpler le driver (sans rien migrer)

1. **Rendre le driver paramétrable** dans `src/infrastructure/db/prisma.ts` (var
   `DB_DRIVER=neon|pg`). Garder `PrismaNeon` en parallèle pour rollback. La config
   `PrismaPg` accepte la même forme (`{ connectionString, max: 10, idleTimeoutMillis, connectionTimeoutMillis }`),
   donc `onPoolError` et timeouts conservés.
2. **Adapter `retry-policy.ts`** : les patterns `"Control plane"`, `"websocket_error_event"`,
   `"WebSocket"` sont propres à Neon. Avec `node-postgres`, intercepter : `ECONNRESET`,
   `ETIMEDOUT`, `"Connection terminated"`, `"server closed the connection"`, codes Postgres
   `57P01`, `08006`/`08001`/`08004`. Garder codes Prisma `P1008`/`P1017`/`P2024` et le retry-sur-reads (backoff 100/200/400ms).
3. **Centraliser l'instanciation des scripts** : les 37 fichiers (`new PrismaClient({ adapter: new PrismaNeon })`)
   passent par un helper commun (`scripts/lib/prisma-script.ts`). Inclut les tests E2E (`global-setup.ts`, `global-teardown.ts`).

#### Phase B — Provisionner la cible

4. **Créer l'instance**, région UE, **activer le pooling** (PgBouncer). Récupérer endpoint pooled + direct.
5. **Séparer `DATABASE_URL` (pooled) et `DIRECT_URL` (direct)**. Changement clé : avec
   PgBouncer en mode transaction, `prisma db push`/migrate **doivent** passer par la
   connexion directe. Ajouter `directUrl` dans le bloc `datasource`.
6. **Configurer le SSL explicitement** : `node-postgres` ne lit pas toujours `sslmode`
   depuis l'URL. Passer `ssl: { rejectUnauthorized: true, ca: <CA du provider> }` dans la config du pool.

#### Phase C — Migrer les données

7. **Stratégie de bascule** (pour le volume actuel, le simple suffit) :
   - **Downtime court (recommandé)** : maintenance, `pg_dump` depuis Neon via connexion
     **directe**, `pg_restore` vers la cible, bascule des env vars, redéploiement. Fenêtre de minutes à dizaines de minutes.
   - **Zéro downtime** : réplication logique Postgres (publication/subscription). Probablement surdimensionné.
8. **Précautions** : `pg_dump --no-owner --no-privileges` (le rôle `neondb_owner`
   n'existe pas sur la cible). Après restore : vérifier séquences (`setval`), counts par
   table, absence d'extension manquante.

#### Phase D — Basculer

9. Geler les écritures (maintenance), dump/restore final, basculer `DATABASE_URL` +
   `DIRECT_URL` en prod, redéployer, surveiller connexions/pool/latence. La retry-policy adaptée absorbe les hiccups.

#### Phase E — Réécrire l'outillage (le gros du travail)

10. **`db-dev-reset.sh`** : remplacer le branching Neon par `pg_dump` prod → `pg_restore`
    dev, ou un fork (si Aiven). Avec Scaleway, reset plus lent mais fonctionnel.
11. **`db-push-prod.sh`** : remplacer le `snapshot` Neon par `pg_dump` de sauvegarde, ou snapshot via l'API du provider.
12. **`db-studio-prod/staging.sh`** et autres : changer la source de l'URL (plus d'appel `console.neon.tech/api/v2`).
13. **Remplacer les variables `NEON_*`** (`NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_PROD_BRANCH_ID`, `NEON_STAGING_BRANCH_ID`).

#### Phase F — Nettoyer

14. Retirer `@neondatabase/serverless` et `@prisma/adapter-neon` du `package.json`,
    supprimer le fallback de driver, mettre à jour `CLAUDE.md` (section « Branching Neon ») et la mémoire.

### Points de vigilance

- **`directUrl` obligatoire** avec PgBouncer en mode transaction (sinon migrations cassées).
- **Prepared statements + PgBouncer transaction mode** : `@prisma/adapter-pg` gère, mais valider en staging.
- **Coût always-on** : budgéter les trois environnements vs scale-to-zero gratuit de Neon en dev.
- **Bug enum connu** (`db push` ne pousse pas fiablement les valeurs d'enum, à forcer
  en `ALTER TYPE ... ADD VALUE`) : **persiste**, lié à Prisma, pas à Neon.

### Effort affiné

| Phase | Effort |
|---|---|
| A. Découpler le driver + retry-policy + centraliser scripts | 1 à 1,5 j |
| B. Provisionner cible + pooling + SSL + directUrl | 0,5 j |
| C. Migration données (dump/restore + vérifs) | 1 j |
| D. Bascule prod + surveillance | 0,5 j |
| E. Réécriture des 20+ scripts shell | 2 à 3 j |
| F. Nettoyage + doc | 0,5 j |
| **Total** | **5,5 à 7 j** |

La Phase E (outillage) domine. Choisir **Aiven** (forks) réduit E de presque une
journée en gardant un `db:dev:reset` proche de l'existant.

## Documents liés

- `spec/infra/email-service-alternatives.md` : alternatives email (contexte Resend).
- `spec/infra/neon-websocket-timeouts.md` : timeouts WebSocket Neon (contexte couplage actuel).
- `spec/infra/db-migration-rollback-strategy.md` : stratégie de rollback migrations.
