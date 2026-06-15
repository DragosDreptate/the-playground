# Connexion avec LinkedIn (OAuth / OIDC)

Issue : [#541](https://github.com/DragosDreptate/the-playground/issues/541)

## Objectif

Ajouter LinkedIn comme 3ᵉ fournisseur de connexion (à côté de Google et GitHub),
via Auth.js v5. L'audience de The Playground (organisateurs et participants de
communautés professionnelles) est fortement présente sur LinkedIn : ce canal
réduit la friction d'inscription.

## Périmètre implémenté

| Couche | Fichier | Détail |
|---|---|---|
| Provider | `src/infrastructure/auth/auth.config.ts` | `LinkedIn({ allowDangerousEmailAccountLinking: true })`. OIDC, `email_verified` fourni : même mitigation que Google. |
| Anti-bot | `src/infrastructure/security/bot-protection.ts` | `"linkedin"` ajouté au type `BotBlockProvider`. |
| Server action | `src/app/actions/auth.ts` | `signInWithLinkedIn` (calquée sur `signInWithGoogle`, passe par `redirectIfBot("linkedin")`). |
| UI | `src/components/auth/sign-in-form.tsx` | Bouton `outline` + icône LinkedIn (lucide), dans les branches normale et webview. |
| i18n | `messages/fr.json` / `en.json` | Clés `Auth.signIn.linkedin` (déjà présentes). Page Aide mise à jour (`participant.inscription.step3`, `faq.q5.answer`). |
| Config | `.env.example` | `AUTH_LINKEDIN_ID` / `AUTH_LINKEDIN_SECRET` documentées (Option D). |

### Protection BotID

La page `/auth/sign-in` est déjà déclarée dans `initBotId({ protect: [...] })`
(`src/instrumentation-client.ts`). La nouvelle action vit sur cette page : elle
est couverte sans modification supplémentaire.

### Avatar

LinkedIn OIDC renvoie le claim `picture` (CDN licdn.com). Le callback `signIn`
existant le synchronise déjà via `rawProfile.picture`, sans écraser un avatar
uploadé manuellement.

## Setup requis (hors code)

1. App LinkedIn Developer rattachée à la Page entreprise `the-playground-events`.
2. Produit « Sign In with LinkedIn using OpenID Connect » activé.
3. Authorized redirect URLs :
   - `http://localhost:3000/api/auth/callback/linkedin`
   - `https://the-playground.fr/api/auth/callback/linkedin`
4. Variables d'env `AUTH_LINKEDIN_ID` / `AUTH_LINKEDIN_SECRET` :
   - `.env.local` (déjà fait en local)
   - Vercel Production **et** Preview (à faire)

> LinkedIn n'accepte pas de wildcard de domaine : la connexion LinkedIn ne
> fonctionnera pas sur les URLs de preview Vercel dynamiques. Google/GitHub/magic
> link couvrent la preview.

## Auto-remplissage du champ « LinkedIn » du profil — BLOQUÉ (décision en attente)

**Exigence demandée** : à la connexion LinkedIn, renseigner automatiquement le
champ `linkedinUrl` du profil de l'utilisateur (`prisma/schema.prisma:149`).

**Constat technique** : ce n'est **pas réalisable** avec le produit OIDC standard
de LinkedIn. Les scopes disponibles (`openid profile email`) renvoient uniquement :
`sub`, `name`, `given_name`, `family_name`, `picture`, `email`, `email_verified`,
`locale`. **Aucune URL de profil publique n'est exposée.** Le claim `sub` est un
identifiant membre opaque, qui ne permet pas de reconstruire une URL
`linkedin.com/in/...`.

L'ancien scope `r_liteprofile` exposait un `vanityName` (d'où on pouvait dériver
l'URL), mais il est déprécié et indisponible pour les nouvelles apps.

**Options :**

1. **Abandonner l'auto-remplissage** (recommandé) — techniquement impossible
   proprement. On s'en tient au cœur OAuth. Le champ `linkedinUrl` reste rempli
   manuellement par l'utilisateur dans son profil, comme aujourd'hui.
2. **Nudge à l'onboarding** — après une première connexion LinkedIn, si
   `linkedinUrl` est vide, proposer (sans pré-remplir) d'ajouter son profil
   LinkedIn dans l'écran de setup. Ne remplit pas « automatiquement », mais
   capitalise sur le contexte.

> Décision à trancher avant de coder cette partie. Le reste de la feature
> (connexion LinkedIn) est fonctionnel indépendamment.
