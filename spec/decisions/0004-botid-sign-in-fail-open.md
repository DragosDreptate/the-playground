# ADR-0004 — Protection anti-bot du sign-in via Vercel BotID (fail-open)

- **Date** : 2026-06-14
- **Statut** : Accepté
- **Références** : PR #538, #539, #540 ; incident phishing organisateurs du 2026-06-14 ; spec détaillée `spec/security/2026-06-14-botid-sign-in.md` (**gitignored, local uniquement** — cet ADR est la trace publique de la décision)

## Contexte

Incident du 14/06 : une campagne de comptes frauduleux usurpant le support (« PLAYGROUND SUPP0RT ») pour phisher les Organisateurs. Le vecteur d'abus est la fonction **« Contacter les organisateurs »** : tout compte **authentifié** peut envoyer un email partant des serveurs de la plateforme (crédible) avec un `replyTo` vers l'attaquant.

Point clé : contacter les organisateurs **exige d'être authentifié**. Donc verrouiller le **sign-in** coupe la racine du vecteur en amont, sans avoir à durcir chaque action sensible une par une.

L'attaquant utilisait un **vrai compte Google + un vrai navigateur desktop**. Conséquence : les protections edge classiques de Vercel (Bot Protection, AI Bots, Attack Challenge Mode) ne l'auraient pas arrêté (ce sont de vrais navigateurs). Il fallait une protection **applicative, ciblée et invisible**.

## Décision

Protéger le **sign-in** (les 4 flux : Google, GitHub, LinkedIn, email/magic link) avec **Vercel BotID** : challenge invisible côté navigateur, vérifié côté serveur avant `signIn()`. Choix assumés :

- **Fail-open** : en cas de panne/indisponibilité de BotID, on **ne bloque pas** (disponibilité > blocage). Les autres garde-fous restent actifs (blocklist sign-in, domaines jetables).
- **Kill switch 3 états** via `BOTID_MODE` (modifiable depuis Vercel) : `enforce` (défaut, bloque) / `observe` (détecte et journalise mais laisse passer) / `off` (désactivé). Point d'entrée unique : `evaluateBotSignIn` dans `src/infrastructure/security/bot-protection.ts`.
- **Message d'erreur neutre** : ne révèle pas la détection, guide un humain (faux positif) à recharger.
- **Télémétrie** : event PostHog `bot_detected` émis via `after()` (pas de fire-and-forget).

## Alternatives écartées

- **Toggles edge Vercel** (Bot Protection / AI Bots / Attack Challenge Mode) — écartés : agissent au niveau réseau sans connaissance du code, et laissent passer les vrais navigateurs (le cas de l'attaquant).
- **Durcir `contact-hosts` directement, action par action** — écarté : verrouiller le sign-in couvre indirectement toute action authentifiée ; protéger la porte d'entrée plutôt que chaque pièce.
- **Fail-closed** (bloquer en cas de panne BotID) — écarté : un incident BotID bloquerait alors tous les humains. La disponibilité du sign-in prime.

## Conséquences

- **Positives** : friction zéro (CAPTCHA invisible), aucun impact SEO ni sur les previews de partage (la viralité produit est préservée), ciblage chirurgical du sign-in.
- **Limites assumées** :
  - Ne bloque qu'**en production** (local/preview renvoient toujours `isBot=false`) — un test réel ne peut se faire qu'après déploiement.
  - **Fail-open** : sur panne BotID, les bots passent (mitigé par blocklist + domaines jetables).
  - Couvre le sign-in, **pas tout** : une fois authentifié, `contact-hosts` reste ouvert (rate limit 2/h). Durcissements complémentaires à envisager si un vecteur non authentifié apparaît.
- **Piège connu** : le challenge est servi via des rewrites proxy first-party dont le préfixe doit rester exclu du matcher `src/middleware.ts` (sinon next-intl renvoie le challenge en 404 → faux positifs massifs, cf. incident du 15/06 corrigé en PR #540).
