# Mode maintenance

> Issue #545. Permet de basculer le site en page « Site en maintenance » en quelques secondes lors d'un incident majeur (panne DB, bug critique en prod, build cassé), sans rebuild.

## Objectif

Un mécanisme activable en quelques secondes qui :

- est **indépendant de la DB** (utilisable même si l'incident vient de la DB) ;
- **survit à un build cassé** (le toggle ne déclenche pas de redéploiement) ;
- affiche une **landing statique** « Site en maintenance », belle et bilingue ;
- laisse une **porte de sortie** au maintainer pour vérifier le site pendant l'incident.

## Architecture

| Pièce | Fichier | Rôle |
| --- | --- | --- |
| Flag | Vercel Edge Config, clé `maintenance` (bool) | Source de vérité, propagée en secondes sans rebuild |
| Lecture + gate | `src/middleware.ts` (`isMaintenanceOn`) | Lit le flag (fail-open), rewrite vers `/maintenance` en 503 |
| Helpers purs | `src/lib/maintenance.ts` | Constantes + comparaison timing-safe du token de bypass |
| Page | `src/app/maintenance/{layout,page}.tsx` | Composant statique pur, bilingue FR/EN, zéro dépendance infra |
| Toggle | `scripts/maintenance-toggle.ts` | `pnpm maintenance:on \| off \| status` via l'API Vercel |

### Lecture du flag (fail-open)

1. `MAINTENANCE_MODE=true` → maintenance forcée (override local/dev, sans Edge Config).
2. Sinon, lecture de la clé `maintenance` dans Edge Config (`@vercel/edge-config`).
3. **Toute erreur de lecture → `false`** : on ne coupe jamais le site à cause du mécanisme lui-même.

### Comportement du middleware (maintenance ON)

- `?maintenance_bypass=<token>` valide → pose un cookie `maintenance_bypass` (httpOnly, 8h), nettoie le paramètre, redirige vers l'URL propre.
- Cookie de bypass valide → laisse passer la requête (le maintainer voit le site).
- Sinon → `rewrite` vers `/maintenance` en **HTTP 503 + `Retry-After: 3600`**.

La comparaison du token est **timing-safe** (`timingSafeEqual`, sans `node:crypto` pour rester portable sur tout runtime middleware).

### Ce qui reste vivant pendant la maintenance

`/api/*`, webhook Stripe, `_next`, `_vercel` : hors matcher du middleware → non affectés. La page `/maintenance` ne fait **aucun** appel DB / auth / service externe.

## Setup Vercel (manuel, préalable)

1. Créer un store **Edge Config** (`the-playground-edge-maintenance`).
2. Ajouter l'item `{ "maintenance": false }`.
3. **Connecter le store au projet** → injecte la variable `EDGE_CONFIG`.
4. Ajouter le secret **`MAINTENANCE_BYPASS_TOKEN`** (`openssl rand -hex 32`) au projet.

## Utilisation

```bash
pnpm maintenance:on       # active la maintenance (503 sous quelques secondes)
pnpm maintenance:off      # désactive
pnpm maintenance:status   # état courant
```

Le script utilise `VERCEL_TOKEN` (`.env.local`) et l'API Edge Config. Pendant la maintenance, vérifier le site via `https://the-playground.fr/?maintenance_bypass=<token>`.

### Tester en local

```bash
MAINTENANCE_MODE=true pnpm dev    # affiche la page /maintenance sans Edge Config
```

## Alternatives écartées

- **Variable d'env + redeploy** : trop lent, et inutilisable si le build est cassé.
- **Toggle en DB** : inutilisable si l'incident vient justement de la DB.

## Tests

- `src/lib/__tests__/maintenance.test.ts` — `timingSafeEqual` et `isBypassTokenValid` (token valide, invalide, secret vide/absent).
