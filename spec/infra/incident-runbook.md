# Runbook d'urgence production

> **Objectif** : rétablir le service le plus vite possible. Diagnostiquer ensuite.
> **Règle d'or** : rollback d'abord, fix forward jamais en urgence.

---

## 1. App en erreur (500, pages blanches, crash)

**Cause probable** : code déployé cassé (merge récent, dépendance manquante).
**Temps de rétablissement** : ~2 min.

```bash
# Voir les déploiements récents
vercel ls --prod

# Rollback instantané vers le dernier déploiement stable
vercel rollback
```

Le rollback Vercel est atomique, zéro downtime. Tous les builds précédents sont conservés.

Si le problème vient d'un merge identifié :
```bash
git revert <commit-sha>
git push origin main
# Attendre le build Vercel (~2 min)
```

> **Préférer `vercel rollback`** au revert : c'est plus rapide et ne nécessite pas d'identifier le commit fautif.

---

## 2. Schema DB incompatible (après un `db:push:prod`)

**Cause probable** : `db:push:prod` a modifié le schema mais le code déployé attend l'ancien schema (ou inversement).
**Temps de rétablissement** : 5-15 min.

### Étape 1 : rollback l'app

```bash
vercel rollback
```

### Étape 2 : remettre la DB en cohérence

**Option A** : corriger le schema pour matcher l'ancien code.
```bash
# Remettre le schema Prisma dans l'état du code déployé (rollbacké)
git stash   # si des changements locaux
git checkout <commit-du-deploiement-stable> -- prisma/schema.prisma
pnpm db:push:prod
```

**Option B** : restaurer la DB depuis un snapshot Neon.
1. Aller sur [console.neon.tech](https://console.neon.tech)
2. Branche `production` > "Restore" > choisir un timestamp avant le push cassé
3. Neon restaure la branche (quelques secondes)
4. Vérifier que l'app fonctionne

> **Attention** : la restauration Neon est destructive pour les données écrites après le timestamp choisi.

---

## 3. DB inaccessible (timeout, pool saturé, Neon down)

**Symptôme** : erreurs Prisma P1008, P2024, "Connection timed out" dans les logs Sentry.

### Pool saturé

1. Aller sur [console.neon.tech](https://console.neon.tech)
2. Vérifier les connexions actives sur le compute endpoint `production`
3. Si saturé : "Restart compute" pour libérer les connexions
4. Le code a déjà un retry automatique (3 tentatives, backoff exponentiel) pour les lectures

### Neon complètement down

Rien à faire côté nous. Vérifier [neonstatus.com](https://neonstatus.com) pour l'ETA.
L'app affichera des erreurs 500 sur les pages nécessitant la DB, mais les assets statiques restent servis.

---

## 4. Perte de données (suppression accidentelle)

**Point-in-time recovery Neon** : restauration à la seconde près.

1. [console.neon.tech](https://console.neon.tech) > branche `production` > "Backup & Restore"
2. Choisir le timestamp juste avant la suppression
3. "Preview data" pour vérifier, puis "Restore to point in time"

**Fenêtre PITR actuelle : 1 jour** (configurable jusqu'à 7 jours via "Instant restore > Configure", mais augmente les coûts de stockage WAL).

**Snapshots** : aucun schedule automatique. Créer un snapshot **manuel** avant chaque changement de schema prod (bouton "Create snapshot" dans Backup & Restore).

Pour une restauration ciblée (une seule table) sans écraser les données récentes :
1. Créer une branche Neon depuis le point dans le temps voulu
2. Exporter les données de la branche snapshot
3. Les réimporter dans `production`

---

## 5. Auth cassée (magic links, OAuth)

**Symptôme** : les utilisateurs ne peuvent plus se connecter.

### Magic links ne s'envoient plus

1. Vérifier le dashboard [Resend](https://resend.com/emails) : emails envoyés ? bounces ?
2. Vérifier les variables Vercel : `RESEND_API_KEY`, `AUTH_RESEND_KEY`
3. Si Resend est down : pas de workaround immédiat (OAuth reste fonctionnel)

### OAuth échoue

1. Vérifier les logs Sentry pour l'erreur exacte
2. Vérifier que les callbacks URLs sont correctes dans Google Cloud Console / GitHub OAuth App
3. Variables Vercel : `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`

---

## 6. Stripe cassé (paiements échouent)

1. Vérifier le [dashboard Stripe](https://dashboard.stripe.com)
2. Vérifier les webhooks : Developers > Webhooks > événements récents
3. Variables Vercel : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

> Les événements gratuits continuent de fonctionner même si Stripe est down.

---

## Checklist rapide

| Symptôme | Action immédiate | Temps estimé |
|---|---|---|
| Pages 500 / app crash | `vercel rollback` | ~2 min |
| Erreurs Prisma après schema change | `vercel rollback` + corriger schema ou restore Neon | 5-15 min |
| DB timeout / pool | Restart compute Neon | ~1 min |
| Neon down | Attendre ([neonstatus.com](https://neonstatus.com)) | variable |
| Données supprimées | Neon point-in-time restore | ~5 min |
| Auth cassée | Vérifier Resend / OAuth provider | 5-10 min |
| Paiements cassés | Vérifier Stripe dashboard + webhooks | 5-10 min |

---

## Contacts et dashboards

| Service | Dashboard | Status page |
|---|---|---|
| Vercel | [vercel.com/dashboard](https://vercel.com/dashboard) | [vercel-status.com](https://www.vercel-status.com) |
| Neon | [console.neon.tech](https://console.neon.tech) | [neonstatus.com](https://neonstatus.com) |
| Resend | [resend.com/emails](https://resend.com/emails) | — |
| Stripe | [dashboard.stripe.com](https://dashboard.stripe.com) | [status.stripe.com](https://status.stripe.com) |
| Sentry | [sentry.io](https://sentry.io) | [status.sentry.io](https://status.sentry.io) |

---

## Prévention

- **Toujours `db:push:prod` AVANT le merge** (le build Vercel prod se déclenche au merge)
- **Tester les migrations sur la branche Neon `dev`** avant de toucher `production`
- **Créer un snapshot Neon manuel** avant tout `db:push:prod` (Backup & Restore > Create snapshot)
- **Monitorer Sentry** après chaque déploiement (les premières minutes sont critiques)
