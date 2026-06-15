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

## Données récupérées à la connexion

LinkedIn OIDC (scopes `openid profile email`) renvoie : `sub`, `name`,
`given_name`, `family_name`, `picture`, `email`, `email_verified`, `locale`.

Captés **automatiquement** par Auth.js / l'adapter Prisma, sans code dédié :

- **Email** (`email`) — enregistré sur le `User` à la création / liaison du compte,
  comme pour Google et GitHub.
- **Nom** (`name`) — idem.
- **Avatar** (`picture`) — synchronisé par le callback `signIn` existant
  (`rawProfile.picture`), sans écraser un avatar uploadé manuellement.

## Auto-remplissage du champ « LinkedIn » du profil — ABANDONNÉ (décision prise)

**Exigence initiale** : à la connexion LinkedIn, renseigner automatiquement le
champ `linkedinUrl` du profil (`prisma/schema.prisma:149`).

**Décision (2026-06-15) : abandonné.** Techniquement impossible avec le produit
OIDC standard de LinkedIn : aucune URL de profil publique n'est exposée dans les
claims. Le `sub` est un identifiant membre opaque, qui ne permet pas de
reconstruire une URL `linkedin.com/in/...`. L'ancien scope `r_liteprofile`
(`vanityName`) est déprécié et indisponible pour les nouvelles apps.

Le champ `linkedinUrl` reste donc rempli manuellement par l'utilisateur dans son
profil, comme aujourd'hui. L'email, le nom et l'avatar sont eux récupérés
automatiquement (cf. section ci-dessus).
