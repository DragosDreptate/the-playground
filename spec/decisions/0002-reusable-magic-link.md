# ADR-0002 — Magic link réutilisable (15 min) au lieu d'un token à usage unique

- **Date** : 2026-05-28
- **Statut** : Accepté
- **Références** : PR #501 ; `memory/project_magic_link_reusable_token_semantics.md` ; `spec/magic-link-reusable-token.md`

## Contexte

Auth.js gère le magic link avec un token à **usage unique** : le token est supprimé de `verification_tokens` au premier appel de `useVerificationToken`, et cette auto-suppression sert de signal implicite « lien consommé ».

En production, un drop-off a été observé à la connexion, surtout sur des comptes corporate. Cause : les scanners de sécurité email (Outlook / Defender ATP et équivalents) **pré-cliquent** le lien en prefetch avant l'utilisateur. Avec un token à usage unique, le scanner consomme le token ; quand l'humain clique ensuite, le lien est déjà mort. S'ajoutent les cas multi-appareils (lien reçu sur mobile, session ouverte sur desktop).

## Décision

Rendre le magic link **réutilisable pendant 15 min** (`MAGIC_LINK_MAX_AGE_SECONDS`) :

- Un custom adapter override `useVerificationToken` pour **ne plus supprimer** le token au premier usage (lecture `findUnique` au lieu de `delete`). Le token reste valide jusqu'à expiration.
- Suppression de la page intermédiaire `/auth/confirm`.
- Locale lue depuis le `callbackUrl`.
- Fenêtre `isNewUser` élargie (~10 min) pour absorber le prefetch des scanners.
- Nettoyage des tokens expirés par cron quotidien `/api/cron/cleanup-verification-tokens` (03:30 UTC).

## Alternatives écartées

- **Garder le token à usage unique** — écarté : casse le parcours dès qu'un scanner email pré-clique le lien (cas fréquent en environnement corporate).
- **Allonger seulement l'expiration sans rendre le token réutilisable** — écarté : ne résout pas le prefetch, qui consomme le token quel que soit son délai d'expiration.
- **Détecter / whitelister les user-agents des scanners** — écarté : fragile, course sans fin, faux négatifs garantis.

## Conséquences

- **Positives** : parcours de connexion robuste face au prefetch des scanners et au multi-appareils.
- **Coût accepté** : fenêtre de rejouabilité de 15 min (un lien intercepté reste valide ce laps de temps). Jugé acceptable au vu du gain.
- **Piège sémantique durable** : une row dans `verification_tokens` **ne signifie plus** « lien non cliqué ». La source de vérité pour « le lien a-t-il été utilisé ? » est `User.emailVerified` + présence d'une `Session`, **jamais** la présence/absence du token (ni `expires < NOW()`). Cette confusion a déjà coûté une investigation erronée le 2026-05-29.
