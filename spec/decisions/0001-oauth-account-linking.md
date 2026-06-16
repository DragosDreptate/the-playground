# ADR-0001 — Liaison automatique des comptes OAuth sur email vérifié

- **Date** : 2026-05-07
- **Statut** : Accepté
- **Références** : issue #429

## Contexte

Auth.js refuse par défaut de lier un provider OAuth à un User existant si l'email correspond déjà à un compte créé autrement (magic link, ou un autre provider). Concrètement : un Participant s'inscrit une première fois via magic link, revient plus tard et clique « Se connecter avec Google » sur le même email → Auth.js lève `OAuthAccountNotLinked` et bloque la connexion.

Pour notre parcours (friction zéro, benchmark Luma), c'est un mur : l'utilisateur a fait « la bonne chose », il utilise le même email, mais il se retrouve face à une erreur incompréhensible. Le risque produit (abandon à la connexion) dépasse le risque de sécurité, à condition de maîtriser ce dernier.

Le danger théorique de la liaison automatique : un attaquant crée un compte OAuth sur un email qu'il ne possède pas, et récupère ainsi l'accès à un compte légitime. Ce scénario suppose que le provider laisse passer un email **non vérifié**.

## Décision

Activer `allowDangerousEmailAccountLinking: true` sur Google et GitHub.

En complément, la page `/auth/sign-in` lit `searchParams.error` et affiche un bandeau pour les `SignInError` qui transitent encore par cette page (`OAuthCallbackError`, `OAuthSignInError`, `AccessDenied`, fallback `Default`).

## Alternatives écartées

- **Garder le comportement par défaut (pas de liaison)** — écarté : casse le parcours de connexion pour tout utilisateur ayant déjà un compte sur le même email, exactement le cas fréquent (magic link puis OAuth). Friction inacceptable.
- **Merge / liaison manuelle de comptes** (UI dédiée « lier mes comptes ») — écarté pour le MVP : trop lourd à construire et à expliquer, alors que la liaison auto sur email vérifié couvre 99% des cas sans interface.

## Conséquences

- **Positives** : parcours de connexion sans rupture, quel que soit l'ordre des providers utilisés sur un même email.
- **Risques mitigés** : le risque d'usurpation via email non vérifié est couvert par les providers eux-mêmes. Google vérifie l'email via OIDC (`email_verified`). GitHub exige qu'une adresse soit vérifiée avant de pouvoir être marquée comme primary. On ne lie donc jamais sur un email non prouvé.
- **Ce que ça verrouille pour la suite** : tout nouveau provider OAuth ajouté devra garantir la vérification d'email côté provider avant d'activer la même option. Sans cette garantie, la liaison auto devient une vraie faille (d'où le nom `dangerous`).

## Mise à jour — 2026-06-15 : ajout de LinkedIn (OIDC)

LinkedIn ajouté comme 3e provider OAuth (à côté de Google et GitHub), avec `allowDangerousEmailAccountLinking: true`. La contrainte verrouillée ci-dessus est respectée : LinkedIn est un provider **OIDC** qui renvoie `email_verified`, donc on ne lie jamais sur un email non prouvé. La server action `signInWithLinkedIn` est intégrée à la protection BotID (cf. [ADR-0004](0004-botid-sign-in-fail-open.md)). PR #542.
