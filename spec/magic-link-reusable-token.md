# Magic link réutilisable + suppression de la page intermédiaire

> **Cette spec remplace `spec/auth-confirm-redesign.md`** (refonte du wording).
> L'angle a changé : au lieu de polir la page intermédiaire, on la supprime
> en rendant le token magic link réutilisable pendant 15 min.

## Contexte

### Le déclencheur

Le 2026-05-27, on a tracé un utilisateur A (réseau corporate d'un grand groupe bancaire, Microsoft 365) qui voulait s'inscrire à un événement. Parcours :

1. Découverte de l'événement sur poste pro Windows (Edge)
2. Demande de magic link
3. Ouverture du lien sur Mac perso (Chrome) → atterrissage sur `/en/auth/confirm`
4. **31 secondes sur la page, puis abandon** sans cliquer sur le bouton
5. Aucun User créé en DB, aucune erreur Sentry

Drop-off UX, pas bug technique.

### Sondage 24h en prod (2026-05-28)

Sur les 4 magic links pending dans les dernières 24h :

| Utilisateur | Statut |
|---|---|
| Utilisateur A (corporate, grand groupe bancaire) | ❌ Vrai drop-off (User absent) |
| Utilisateur B (corporate, même groupe) (×2) | ❌ Vrai drop-off (2 tentatives, frustration) |
| Utilisateur C (email grand public) | ✅ Faux positif (s'est connecté avec un autre lien) |

**Pattern corporate confirmé** : 3/4 cas sur 24h sont des users corporate d'un même grand groupe bancaire bloqués par la page intermédiaire.

### Raison d'être de la page intermédiaire

`/auth/confirm` existe pour protéger le token magic link des scanners email (Defender Safe Links, Mimecast, Proofpoint) qui prefetchent les liens d'emails. Sans elle, le scanner consommerait le token avant l'utilisateur humain. La page est un `<form>` POST inerte que seul un humain peut déclencher.

Le coût : friction UX qui crée du drop-off (utilisateurs A et B).

## Décision

**On supprime la page `/auth/confirm` et on rend le token magic link réutilisable pendant 15 min.**

Si un scanner clique le premier, le token reste valide pour l'utilisateur humain qui cliquera ensuite, dans la fenêtre de 15 min.

Le contenu de l'email magic link continue d'être servi dans la bonne langue : on extrait la locale depuis le `callbackUrl` en priorité (sujet 5 de l'ancienne spec, conservé car bug indépendant).

### Pourquoi ce pivot

- **Résout 100% du drop-off des utilisateurs A et B** vs ~partiel pour un simple ré-wording
- **Code plus simple** : ~30 lignes ajoutées vs ~150 lignes pour la refonte page + allowlist + locale
- **Surface UI supprimée** : page, i18n, tests, mockup, helpers d'URL
- **Trade-off sécurité acceptable** : on échange une fenêtre 24h fermée par un humain (page intermédiaire) contre une fenêtre 15 min ouverte à tout porteur du token. Si l'attaquant a accès en lecture à la boîte mail, il peut de toute façon redemander un magic link.

## Effets de bord acceptés

| Effet | Mitigation |
|---|---|
| **Users fantômes** : le scanner crée un User en DB pour quelqu'un qui n'a pas finalisé son inscription | Purge manuelle au début (volume estimé <5/mois) |
| **Sessions orphelines** : 1-3 sessions sans cookie associé par magic link | TTL 30j → auto-cleanup, aucun enjeu sécurité |
| **`isNewUser` faux négatif** : si l'humain clique >2 min après le scanner | Élargir la fenêtre `isNewUser` à **10 min** (vs 2 min actuel) |
| **Fenêtre interception 15 min** | Risque résiduel validé : si attaquant a accès au mail il peut redemander un lien |
| **Fenêtre de transition au déploiement** | Accepter : tokens pending actuels expirent dans 1-2h, utilisateur C déjà connecté |

### Protection scanner orthogonale (déjà en place)

Le fichier `src/app/api/auth/[...nextauth]/route.ts` exporte déjà un handler `HEAD` qui répond `200` sans déclencher le flow Auth.js. Cette protection persiste après le pivot et limite les Users fantômes aux seuls scanners qui prefetchent en **GET** (Defender Safe Links en particulier). Les scanners qui prefetchent en HEAD restent inertes — pas de User fantôme, pas de session orpheline.

## Implémentation

### Fichiers touchés

| Fichier | Action |
|---|---|
| `src/infrastructure/auth/auth.config.ts` | Custom adapter + `maxAge` + `isNewUser` 10 min + simplification `sendVerificationRequest` |
| `src/lib/auth/magic-link-url.ts` | Supprimer `buildMagicLinkConfirmUrl`, faire évoluer `detectLocaleFromRequest` (lecture callbackUrl) |
| `src/app/[locale]/auth/confirm/page.tsx` | Supprimer (et le dossier) |
| `messages/fr.json` | Supprimer `Auth.confirm.*`, reformuler `Auth.error.verificationExplanation`/`verificationAction`, retirer la mention "usage unique" de `Email.magicLink.bodyText`/`expiryText` |
| `messages/en.json` | Idem |
| `src/lib/auth/__tests__/magic-link-url.test.ts` | Supprimer tests `buildMagicLinkConfirmUrl`, adapter tests `detectLocaleFromRequest` |
| `src/infrastructure/auth/__tests__/` (nouveau) | Tests du custom `useVerificationToken` |
| `tests/e2e/auth.spec.ts` | Supprimer les 2 tests `/auth/confirm` (lignes 117 + 130), adapter le test 136 sur le wording d'erreur (suppression de la mention "anti-spam"). Garder le test HEAD ligne 106 (protection orthogonale, reste valide) |
| `spec/auth-confirm-redesign.md` | Supprimer (remplacé par cette spec) |
| `spec/mockups/auth-confirm-redesign.mockup.html` | Supprimer |

### 1. Custom Prisma adapter

Dans `auth.config.ts`, wrapper le standard `PrismaAdapter(prisma)` :

```ts
const baseAdapter = PrismaAdapter(prisma);
const adapter: typeof baseAdapter = {
  ...baseAdapter,
  // NOTE : Auth.js stocke et lookup le token HASHÉ (createHash(token + secret),
  // cf. @auth/core/lib/actions/signin/send-token.js:63 et callback/index.js:144).
  // L'argument `token` reçu ici est déjà le hash → on le passe tel quel au
  // findUnique, sans re-hasher.
  async useVerificationToken({ identifier, token }) {
    const vt = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });
    if (!vt) return null;
    if (vt.expires < new Date()) {
      await prisma.verificationToken
        .delete({ where: { identifier_token: { identifier, token } } })
        .catch(() => null);
      return null;
    }
    return vt; // pas de delete → token reste valide jusqu'à expiration
  },
};
```

### 2. `maxAge` 15 min sur le provider Resend

```ts
ResendProvider({
  maxAge: 60 * 15, // 15 min au lieu des 24h Auth.js par défaut
  apiKey: process.env.AUTH_RESEND_KEY,
  ...
})
```

### 3. Simplification de `sendVerificationRequest`

L'URL passée à `MagicLinkEmail` devient directement l'URL Auth.js (`/api/auth/callback/resend?token=...`), plus de détour par `/auth/confirm`.

La locale du contenu de l'email est extraite de l'URL via le nouveau `detectLocaleFromRequest` qui lit le `callbackUrl` en priorité.

### 4. `detectLocaleFromRequest` — sujet 5 conservé

Nouvel ordre de détection :
1. **Prefix `callbackUrl`** (`/fr/...` ou `/en/...`)
2. Cookie `NEXT_LOCALE`
3. Header `Accept-Language`
4. Fallback `defaultLocale`

Le `callbackUrl` est extrait depuis l'URL Auth.js (passée en paramètre à la fonction). Si parsing échoue ou prefix absent → on retombe sur l'étape 2.

### 5. i18n cleanup

**Suppressions** :
- `Auth.confirm` (title, reason, submit, invalid.title, invalid.description, invalid.cta) — FR et EN

**Reformulations dans `Auth.error`** :
- `verificationExplanation` : remplacer la mention "robot anti-spam" par "Ce lien a expiré"
- `verificationAction` : "Demandez un nouveau lien"

**Reformulations dans `Email.magicLink`** (cohérence avec le token réutilisable) :

Aujourd'hui ces clés mentionnent "15 minutes" (alors que la réalité est 24h, c'est une dérive existante) ET "usage unique" (vrai aujourd'hui, faux après le pivot). Le pivot aligne enfin l'expiration avec le wording, mais oblige à retirer la mention "usage unique".

FR :
- `bodyText` : `"Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 15 minutes."` (retrait de "et ne peut être utilisé qu'une seule fois")
- `expiryText` : `"Expire dans 15 minutes"` (retrait de "· Usage unique")

EN :
- `bodyText` : `"Click the button below to sign in. This link is valid for 15 minutes."` (retrait de "and can only be used once")
- `expiryText` : `"Expires in 15 minutes"` (retrait de "· Single use")

### 6. Mitigation `isNewUser` (10 min)

```ts
// auth.config.ts:191 (actuel : 120_000)
session.user.isNewUser = ageMs < 10 * 60 * 1000;
```

### 7. Tests

**Supprimer** :
- Tous les tests sur `buildMagicLinkConfirmUrl` dans `src/lib/auth/__tests__/magic-link-url.test.ts`

**Adapter** :
- Tests `detectLocaleFromRequest` pour intégrer la priorité `callbackUrl`

**Ajouter** (nouveau fichier) :
- Tests unitaires sur le custom `useVerificationToken` (mock Prisma) :
  - token valide non expiré → return token, pas de delete
  - token expiré → delete + return null
  - token introuvable → return null
  - 2 appels consécutifs avec le même token → 2 returns valides

### 8. Cleanup artefacts

- `spec/auth-confirm-redesign.md` → supprimer
- `spec/mockups/auth-confirm-redesign.mockup.html` → supprimer
- script de trace ad-hoc → déplacé dans `scripts/local/` (gitignored, contenait des données prod)
- `scripts/check-pending-magic-links.ts` → conserver (monitoring ponctuel)

## Stratégie de transition

**Option A retenue : accepter le 404 sur les magic links envoyés avant le déploiement.**

Justification :
- Sondage 24h : 4 tokens pending, dont 1 user déjà connecté (utilisateur C) et 3 abandons confirmés (utilisateurs A et B).
- Aucune raison qu'un de ces 4 users clique son lien dans la fenêtre post-déploiement.
- Si futur cas marginal : 404 → user redemande un lien → flow nouveau parcours.

Pas de stub redirect, pas de PR de cleanup ultérieure.

## Hors scope (reporté)

- Cron de purge automatique des Users fantômes (à traiter quand le volume justifie)
- Refonte du sujet 4 (transport de l'intention initiale vers le sign-in)
- Instrumentation PostHog dédiée (`magic_link_sent`, `session_created_after_magic_link`)
