# Plan — Blocages anti-abus instantanés via Edge Config

## Objectif
Bloquer un email / domaine jetable / identité OAuth en quelques secondes via une
commande CLI, sans PR ni build, en réutilisant l'infra Edge Config déjà en place
(mode maintenance, store `ecfg_290ik5kuib6seqd7pz7hkoibuhaf`).

## Principe
- **Code = baseline statique** (filet fail-open) : on conserve le package
  `disposable-email-domains` (~120k) + le noyau de `sign-in-blocklist.ts`.
- **Edge Config = surcouche dynamique** : une clé unique `signInBlocklist` de
  forme `{ emails: string[], oauthIds: string[], domains: string[] }`, éditable
  à chaud sans rebuild.
- À chaque sign-in : `bloqué_statique OU bloqué_dynamique`. Si la lecture Edge
  Config échoue ou si `EDGE_CONFIG` est absent → fallback statique
  (jamais de lock-out global).
- **Pas de cache** : volontaire, pour garantir l'effet « instantané » (le
  sign-in est peu fréquent, le read Edge Config est négligeable).

## Changements

### 1. Nouveau module `src/infrastructure/auth/dynamic-blocklist.ts`
> Placement en `infrastructure/` (et non `lib/`) : le module dépend d'un service
> externe (Edge Config) et importe `infrastructure/auth/sign-in-blocklist`.
> `lib/` doit rester pur sans dépendance infra (CLAUDE.md). Co-localisé avec
> `sign-in-blocklist.ts`.

- `readDynamic()` : lit la clé `signInBlocklist` via `@vercel/edge-config`
  `get()`, fail-open `{ emails: [], oauthIds: [], domains: [] }` si pas
  d'`EDGE_CONFIG` ou erreur.
- `isBlockedSignIn(email, oauthId)` (async) : statique OU dynamique.
- `isDisposableEmailDomain(email)` (async) : statique OU dynamique (voir §3
  pour le matching domaine par suffix-walk partagé).
- `matchesIdentityBlocklist(data, { email, oauthId })` : **fonction pure**
  isolée, testable unitairement (match email insensible à la casse, oauthId,
  no-match). Le matching domaine n'est PAS dupliqué ici : il est délégué à
  `isDisposableEmailDomainWith` (§3).
- Tests dans `src/infrastructure/auth/__tests__/`.

### 2. Câblage (2 call sites, déjà `async`)
- `src/infrastructure/auth/auth.config.ts` (callback `signIn`, l.178/190) :
  `await` les versions dynamiques à la place des imports statiques actuels.
- `src/app/actions/auth.ts` (l.85, `signInWithEmail`) :
  `await isDisposableEmailDomain`.

### 2b. Logique domaine partagée (`src/lib/email/disposable-domains.ts`)
> `isDisposableEmailDomain` fait un **suffix-walk** (matche les sous-domaines :
> `x.ibymail.com`). Un `includes` plat sur les domaines dynamiques raterait
> `sub.mailsecondary.com`. On garde donc toute la logique domaine au même
> endroit, DRY.

- Export de `extractDomain` (aujourd'hui privé) pour réutilisation.
- Nouvelle fonction `isDisposableEmailDomainWith(email, extraDomains)` :
  injecte les domaines dynamiques dans le **même** suffix-walk que la baseline
  statique (builtin + custom + extra).
- `isDisposableEmailDomain(email)` (sync, baseline) **inchangée** : reste
  exportée et testée, et devient un cas particulier (`extraDomains = []`).
- Le module dynamique (§1) appelle `isDisposableEmailDomainWith` avec les
  domaines lus dans Edge Config.

### 3. Script CLI `scripts/blocklist-edit.ts`
Calqué sur `scripts/maintenance-toggle.ts` (mêmes env `VERCEL_TOKEN`,
`EDGE_CONFIG_ID` défaut store prod, `VERCEL_TEAM_ID`).
- `pnpm block <email>` / `pnpm block domain:<d>` / `pnpm block oauth:<id>`
- `pnpm unblock <même syntaxe>`
- `pnpm blocklist` : affiche l'état courant
- Lecture de l'item `signInBlocklist`, mutation du tableau concerné (dédup),
  upsert `PATCH /v1/edge-config/{id}/items`.

### 4. `package.json`
Scripts `block`, `unblock`, `blocklist`.

### 5. Tests
- `src/infrastructure/auth/__tests__/dynamic-blocklist.test.ts` sur
  `matchesIdentityBlocklist` (pur) : email insensible à la casse, oauthId,
  no-match.
- Cas ajoutés à `disposable-domains.test.ts` pour `isDisposableEmailDomainWith`
  (domaine dynamique exact + sous-domaine via suffix-walk).

### 6. `spec/decisions.md`
Consigner la décision : Edge Config pour l'anti-abus dynamique ; alternative
DB + UI admin (#533) écartée pour l'instant (chantier, pas quick win).

## Vérification
- `EDGE_CONFIG` (connection string de **lecture**) n'est pas dans `.env.local` :
  en local le chemin dynamique fail-open vers le statique. Le script d'écriture
  vise le store **prod**. La vérif bout-en-bout se fait donc en **preview/prod**
  (ou en ajoutant ponctuellement `EDGE_CONFIG=...` en local). Comportement
  identique à celui de la maintenance.

## Hors scope (assumé)
- La baseline statique actuelle (`ln941535@mailsecondary.com` + domaine
  `mailsecondary.com`) reste en code, pas de migration vers Edge Config.
- Pas d'UI admin ni d'audit (qui/quand/pourquoi) : c'est l'option DB #533,
  phase ultérieure.
