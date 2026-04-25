# Tester les emails en local et en staging

Le projet utilise Resend pour tous les envois d'emails. Un wrapper `safe-resend.ts`
sert de garde-fou : il bloque les envois vers de vraies adresses dès qu'on n'est
pas en production. C'est ce qui empêche les tests E2E ou un dev local de spammer
de vrais utilisateurs (incident du 25 avril 2026 : ~15 emails admin envoyés en
boucle pendant un `playwright --repeat-each=5`).

## Logique du guard

Le guard est piloté par `VERCEL_ENV`, variable système définie automatiquement
par Vercel :

| Environnement | `VERCEL_ENV` | Guard | Comportement |
|---|---|---|---|
| Prod Vercel | `production` | inactif | tous les envois passent |
| Staging Vercel (branche staging) | `preview` | actif | filtré via allowlist |
| Preview Vercel (autres branches) | `preview` | actif | filtré via allowlist |
| Dev local (`pnpm dev` / `pnpm start`) | _undefined_ | actif | filtré via allowlist |
| CI GitHub Actions | _undefined_ | actif | filtré via allowlist |

Quand le guard est actif, il **bloque** tous les destinataires sauf :

1. Les emails listés dans `STAGING_EMAIL_ALLOWLIST` (séparés par virgule, case-insensitive)
2. Les emails se terminant par `@test.playground` (auto-whitelist comptes test)
3. Les emails se terminant par `@demo.playground` (auto-whitelist comptes démo)

Comportement **fail-closed** : si l'allowlist est vide, tout est bloqué par défaut.

## Workflow recommandé

### Cas 1 — Tester la logique sans envoi réel (local)

Suffisant pour vérifier que le code appelle Resend avec les bons arguments,
ou que la structure du template est OK.

1. Garder `AUTH_RESEND_KEY` commentée dans `.env`
2. Lancer le flow normalement
3. Le guard bloque tout. Vérifier les logs : `[staging-guard] Blocked email to N recipient(s)`

### Cas 2 — Recevoir l'email sur sa propre boîte (local)

Pour vérifier le rendu HTML, le subject, les liens, l'apparence sur Gmail/Outlook, etc.

1. Décommenter `AUTH_RESEND_KEY` dans `.env`
2. Ajouter dans `.env.local` :
   ```bash
   STAGING_EMAIL_ALLOWLIST="ton.email@gmail.com"
   ```
3. Trigger manuellement l'action (UI ou script — **jamais** un test E2E en boucle)
4. L'email arrive sur ton inbox ; tout autre destinataire est bloqué
5. Re-commenter `AUTH_RESEND_KEY` à la fin de la session

> **⚠️ Ne jamais oublier l'étape 5.** La clé active + une mauvaise whitelist =
> risque d'envoi à de vrais utilisateurs lors d'un test E2E ultérieur.

### Cas 3 — Tester en staging Vercel

Identique au cas 2 mais via le dashboard Vercel.

1. **Une seule fois** : configurer `STAGING_EMAIL_ALLOWLIST` dans le dashboard
   Vercel (Project Settings → Environment Variables → scope « Preview »)
2. Push sur la branche `staging`, attendre le déploiement
3. Trigger le flow depuis l'URL staging
4. L'email arrive sur ton inbox

`AUTH_RESEND_KEY` est déjà configurée côté Vercel (sinon les emails de prod ne
partiraient pas non plus). Pas besoin d'y toucher.

### Cas 4 — Tests E2E automatisés (Playwright)

Pas de configuration spéciale requise. Les comptes seed utilisent `@test.playground`
qui est auto-whitelisté. Les notifs admin (`notifyAdminEntityCreated`) qui partiraient
vers `ddreptate@gmail.com` sont **bloquées par le guard** car cette adresse n'est
pas dans `STAGING_EMAIL_ALLOWLIST` côté local/CI.

> **Si tu dois absolument vérifier un envoi à un vrai destinataire dans un test E2E**,
> ne mets pas l'adresse dans la whitelist : utilise un mock ou un compte
> `@test.playground` à la place.

## Symétrie avec Slack

Le service Slack (`slack-notification-service.ts`) suit la même logique : guard
actif dès que `VERCEL_ENV !== "production"`. Pas besoin d'allowlist côté Slack
(canal unique), tout est bloqué hors prod.

## Référence code

- `src/lib/email/safe-resend.ts` — wrapper Resend + guard + allowlist
- `src/lib/email/__tests__/safe-resend.test.ts` — 26 tests Vitest qui couvrent
  les cas (whitelist, fail-closed, batch, prod)
- `src/infrastructure/services/slack/slack-notification-service.ts` — guard Slack
