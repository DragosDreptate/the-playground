# Fiabiliser l'analyse automatique des alertes Sentry

> **Origine** : issue `THE-PLAYGROUND-2P` (17/09/2026). Un scanner de vulnérabilités a produit une alerte Slack « Urgence HAUTE / UTILISATEUR BLOQUÉ » annonçant une panne d'inscription inexistante.
> **Périmètre** : P1 à P4 (contexte transmis au modèle et droit à l'incertitude). **Statut** : spec prête, non implémentée.
> **Hors périmètre, consigné** : P5 (analyse sur un seul événement à T0), date de release, historique des arbitrages, mise en forme Slack conditionnée au verdict, fiche sous-traitant Anthropic. Voir la dernière section.

## 1. Le problème

La chaîne d'alerte fonctionne comme prévu, mais elle conclut sur des données insuffisantes, et le prompt lui **interdit de s'abstenir**. Résultat : le modèle comble les trous par de la spéculation, et la spéculation sort formatée comme un diagnostic.

Le cas `2P` est exemplaire. Les faits réels : huit requêtes `POST` en dix secondes depuis une seule IP hébergée chez B2 Net Solutions (Montréal, AS 55286), corps `multipart/form-data` de 138 Ko, `User-Agent` Chrome/Windows falsifié, dont une requête vers `/index.php`. Signature d'un scanner cherchant une faille PHP. Next.js interprète tout `POST` sur une route de page comme un appel de Server Action, ne trouve pas d'identifiant valide, et lève `Failed to find Server Action`.

Ce que l'alerte a annoncé : une Server Action d'« inscription, création d'événement, mise à jour de profil, ou autre interaction clé » cassée par un déploiement, avec un utilisateur bloqué devant un écran d'erreur.

Deux vérifications suffisent à écarter ce récit, et le modèle ne pouvait faire ni l'une ni l'autre :

- `src/app/[locale]/page.tsx` est une landing (header, footer, sections marketing, FAQ, bloc PWA). **Aucune Server Action métier n'y est appelée.** Les trois exemples cités sont impossibles sur cette route.
- La release incriminée (`860496f6`, merge de la PR #624) était déployée depuis environ 45 heures. Aucune rotation de déploiement au moment des erreurs, donc aucun client légitime ne pouvait porter un bundle périmé.

Les heuristiques du prompt prévoyaient pourtant ce cas : `build-prompt.ts:101` impose `level: none` pour un bot, `build-prompt.ts:123` impose `urgency: noise`. **Les règles étaient bonnes, c'est la donnée permettant de dire « bot » qui n'a jamais atteint le modèle.** Le verdict est sorti en `blocking` / `high`.

### Causes, et leur traitement

| # | Cause | Emplacement | Traité par |
|---|---|---|---|
| C2 | Les en-têtes de la requête sont jetés : IP, ASN, géolocalisation, `User-Agent`, `Content-Type`, `Content-Length` | `analyze-issue.ts:103-108` | **P1** |
| C3 | La liste blanche de tags omet `browser`, `client_os`, `handled`, `mechanism` | `build-prompt.ts:17-26` | **P1** |
| C4 | `count` et `userCount` sont reçus du webhook mais jamais transmis à l'analyse | `route.ts:78-87` | **P1** |
| C6 | Le prompt interdit de rester vague, sans jamais autoriser l'abstention | `build-prompt.ts:85` | **P4** |
| — | Le modèle ignore le mécanisme Next.js qui produit cette famille d'erreurs, et ne connaît aucune signature de scan | `build-prompt.ts` | **P2** |
| — | Le modèle n'a aucune carte des routes de l'app pour repérer une conclusion impossible | `build-prompt.ts` | **P3** |

## 2. Ce qui ne change pas

Pour cadrer le risque : **aucun changement de comportement produit, aucun accès aux données utilisateur, aucune migration.**

- La route webhook garde sa vérification HMAC, sa réponse immédiate et son travail différé en `after()` (`route.ts:41-94`). Le filtre `action !== "created"` reste en place.
- Les deux canaux de diffusion restent les mêmes : email admin et Slack `#sentry`.
- `beforeSend` (`src/lib/sentry-before-send.ts`) n'est pas touché. Il traite un tout autre sujet, les doublons d'auth.
- Le modèle reste Haiku 4.5. Voir les décisions ouvertes si les quatre lots ne suffisent pas.

## 3. P1 — Transmettre les données factuelles

C'est le lot prioritaire : sans lui, les trois autres sont cosmétiques. Aucune formulation de prompt ne permet de distinguer un bot d'un organisateur bloqué si la donnée qui les sépare n'est pas dans le prompt.

### 3.1 En-têtes de requête, par liste blanche

`extractEventContext` (`analyze-issue.ts:81`) ne conserve aujourd'hui que `request.url` et `request.method`. Ajouter une extraction des en-têtes, **par liste blanche stricte** et non par exclusion.

| En-tête | Ce qu'il apporte |
|---|---|
| `user-agent` | Client falsifié, absent, ou outil connu (`curl`, `python-requests`) |
| `content-type` | `multipart/form-data` sur une route de page : signature de `POST` arbitraire |
| `content-length` | Corps anormalement gros (138 Ko sur une landing) |
| `x-vercel-ip-as-number` | **Le signal décisif** : numéro d'AS, qui sépare un hébergeur d'un FAI résidentiel |
| `x-vercel-ip-country`, `x-vercel-ip-city` | Cohérence géographique avec notre audience |

⚠️ **Le type `SentryEvent` doit être étendu** : `request` n'y déclare que `url` et `method` (`analyze-issue.ts:44`). Sans cet élargissement, TypeScript masquera les en-têtes disponibles dans la réponse de l'API.

⚠️ **Piège relevé sur l'événement réel** : l'API Sentry renvoie `request.headers` comme un **tableau de paires**, et y mélange des en-têtes de réponse (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Link`). Notre CSP fait à elle seule environ 500 caractères de bruit. La liste blanche règle ce problème au passage.

### 3.2 En-têtes formellement exclus

Interdiction d'élargir la liste à ces valeurs, pour deux raisons distinctes :

- **Fuite de secret** : `cookie`, `authorization`, `sentry-hook-signature`, et surtout **`forwarded`**, qui contient un jeton `Bearer` signé émis par Vercel. Aucun de ces éléments ne doit sortir vers un tiers.
- **Donnée personnelle** : `x-forwarded-for`, `x-real-ip`, `x-vercel-forwarded-for`. Une adresse IP est une donnée personnelle. L'ASN et le pays suffisent au diagnostic bot/humain sans identifier personne. Voir la section 7.

Plafonner chaque valeur transmise à 200 caractères : un `User-Agent` exotique ou un en-tête inattendu ne doit pas gonfler le prompt.

### 3.3 Compteurs de l'issue

Ajouter `count` et `userCount` à `IssueInput` (`analyze-issue.ts:15`) et les passer depuis la route (`route.ts:78-87`), où ils sont déjà disponibles dans le payload (`route.ts:27-28`).

**Honnêteté sur leur portée** : l'analyse tourne à la création de l'issue, donc `count` vaut 1 et le signal est faible. `userCount: 0` garde une valeur réelle, il dit que **la requête n'était rattachée à aucun utilisateur identifié**, ce qui contredit frontalement un verdict « un organisateur est bloqué ». À présenter au modèle comme un signal secondaire, jamais comme une preuve.

### 3.4 Tags

Étendre `TAG_KEYS_OF_INTEREST` (`build-prompt.ts:17`) avec `browser`, `client_os`, `handled`, `mechanism`. `handled` et `mechanism` disent si l'erreur a été capturée automatiquement ou levée dans un chemin traité, ce que la checklist d'impact utilise déjà (`build-prompt.ts:109`) sans jamais recevoir l'information.

## 4. P2 — Catalogue des motifs de bruit connus

Le prompt possède les conclusions mais aucune prémisse. Ajouter une section courte listant les signatures à reconnaître, avant les heuristiques d'urgence.

Doit contenir, au minimum :

- **Le mécanisme Next.js**, qui est la clé de lecture de toute cette famille d'erreurs : *tout `POST` sur une route de page App Router est interprété comme un appel de Server Action ; sans identifiant valide dans le corps, Next lève `Failed to find Server Action`. Un `POST` arbitraire d'un scanner produit donc exactement cette erreur, sans qu'aucun code applicatif ne soit atteint.*
- **Chemins qui n'existent pas chez nous** : `.php`, `/wp-admin`, `/wp-login`, `/.env`, `/.git`, `/phpmyadmin`. Notre app n'a aucun fichier PHP : toute requête de ce type est un scan, sans exception.
- **ASN d'hébergeur ou de cloud** plutôt que de FAI résidentiel, surtout combiné à un `User-Agent` de navigateur grand public.
- **Corps `multipart/form-data` volumineux** sur une route de page sans formulaire.
- **Rafale** : plusieurs occurrences en quelques secondes depuis une origine unique.
- Les cas déjà couverts à conserver : script tiers, extension de navigateur, erreur pendant `pagehide` ou `unload`.

Verdict attendu quand un motif est reconnu : `urgency: noise`, `userImpact.level: none`, et le motif **nommé explicitement** dans `trigger` (« scan automatisé depuis un hébergeur, chemin `/index.php` inexistant »).

Ce contexte ne périme pas, contrairement au suivant.

## 5. P3 — Carte grossière du produit

Bloc court dans le prompt décrivant les zones de routes et ce qui s'y joue. C'est ce qui aurait tué l'analyse de `2P` : le modèle aurait vu la contradiction entre « `POST` sur la home » et « inscription cassée ».

**À maintenir volontairement grossier, au niveau des zones**, jamais au niveau des noms de Server Actions : une carte trop fine devient fausse au premier refactoring, et une carte fausse mentira avec autant d'aplomb que l'absence de carte.

Contenu attendu, de l'ordre de cinq lignes :

- `/` et `/[locale]` : landing marketing, aucune Server Action métier.
- `/m/[slug]` : page événement, inscription et commentaires.
- `/c/[slug]` : page Communauté, adhésion.
- `/dashboard/*` : espace organisateur, création et édition.
- `/api/cron/*` : jobs planifiés, aucun utilisateur derrière.

### Garde-fou contre l'obsolescence

Un test unitaire vérifie que chaque préfixe de route cité dans la carte **existe réellement** sous `src/app/[locale]`. Une route renommée ou supprimée fait alors échouer le CI au lieu de laisser la carte mentir silencieusement. C'est le seul mécanisme qui rend P3 sûr sur la durée ; sans lui, je recommande de ne pas faire P3 du tout.

## 6. P4 — Autoriser explicitement l'incertitude

`build-prompt.ts:85` dit aujourd'hui « Ne JAMAIS dire "Une erreur s'est produite". Sois spécifique. » Cette consigne fait plus de dégâts que l'absence de contexte : elle **interdit l'abstention**, donc elle commande la spéculation. La consigne prudente n'existe que pour `userImpact` (`build-prompt.ts:115`), pas pour `trigger` ni `functionalConsequence`.

### 6.1 Reformuler la consigne

Remplacer par une règle en deux temps : rester précis **quand les données permettent de conclure** ; dire franchement qu'on ne sait pas quand elles ne le permettent pas, **en nommant la donnée manquante**. Et interdire nommément les listes d'hypothèses alternatives du type « X, Y, ou autre interaction clé », qui sont la trace visible d'une devinette.

### 6.2 Nouveau champ `confidence`

Ajouter au JSON de sortie :

```
"confidence": "certain|probable|incertain"
```

- `certain` : les données identifient le déclencheur (tag `cron`, server action nommée dans la stack, motif de bruit reconnu).
- `probable` : faisceau cohérent mais pas de preuve directe.
- `incertain` : `trigger` et `functionalConsequence` **doivent** nommer ce qui manque pour conclure.

Répercuter sur : le type `AnalysisResult` et un `CONFIDENCE_META` dans `analysis-meta.ts`, la validation `isValidAnalysisResult` (`analyze-issue.ts:138`), le `fallbackResult` (`analyze-issue.ts:116`, qui vaut `incertain` par nature), le gabarit email (`sentry-issue-analysis-email.tsx:58`) et le bloc Slack (`slack-notification-service.ts:291`).

⚠️ **Piège de validation à ne pas reproduire** : `isValidAnalysisResult` est binaire, un seul champ manquant fait basculer toute l'analyse sur `fallbackResult`, qui affiche « Déclencheur non identifié » en urgence `medium`. Si `confidence` devient un champ requis strict, **une omission du modèle détruira une analyse par ailleurs correcte**. Le champ doit donc être traité en tolérance : absent ou invalide, il vaut `probable` par défaut, et la validation ne le rejette pas.

### 6.3 Plafonner l'urgence sur une analyse incertaine

Proposition : une analyse `incertain` ne peut pas dépasser `medium`. On ne sonne pas l'alarme haute sur une hypothèse. Concrètement, c'est le correctif qui aurait transformé l'alerte `2P` en signalement tiède au lieu d'une urgence haute, **même si P1 à P3 avaient tous échoué**. C'est donc le filet de sécurité du lot.

**Tranché (D1)** : le plafond est retenu. À appliquer côté code après réponse du modèle, jamais en consigne de prompt, pour que ce soit déterministe et testable.

Risque assumé : une vraie panne grave, mal diagnostiquée faute de contexte, serait libellée « Urgence MOYENNE ». L'alerte part quand même, par les deux canaux, avec le même contenu : seuls le bandeau et le libellé changent. Le coût inverse, une alerte qui crie à tort jusqu'à être ignorée, est jugé supérieur.

## 7. Sécurité et conformité

- **Aucun secret vers un tiers** : la liste blanche de la section 3.2 est le point de contrôle. Ne jamais la contourner par une exclusion en liste noire, qui laisserait passer tout en-tête futur.
- **Pas d'IP brute** transmise au modèle. ASN, pays et ville suffisent à séparer un hébergeur d'un FAI résidentiel sans identifier personne. Cette contrainte reste dans le périmètre : c'est un choix de conception de P1, indépendant du point ci-dessous.
- **Fiche sous-traitant Anthropic : hors périmètre (D2)**, voir la section 11. Le lot est donc livré en connaissance de cause, avec une mention publique qui reste inexacte.

## 8. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/infrastructure/services/sentry/analyze-issue.ts` | Type `SentryEvent.request`, extraction des en-têtes, `IssueInput`, validation, plafond d'urgence |
| `src/infrastructure/services/sentry/build-prompt.ts` | Tags, catalogue de bruit, carte produit, consigne d'incertitude, schéma JSON |
| `src/infrastructure/services/sentry/analysis-meta.ts` | `confidence` sur `AnalysisResult`, `CONFIDENCE_META` |
| `src/app/api/sentry/webhook/route.ts` | Passage de `count` et `userCount` |
| `src/infrastructure/services/sentry/sentry-issue-analysis-email.tsx` | Affichage de la confiance |
| `src/infrastructure/services/slack/slack-notification-service.ts` | Affichage de la confiance |

Aucun fichier de traduction n'est touché : la fiche sous-traitant est hors périmètre (D2).

## 9. Tests

**Cette chaîne n'a aujourd'hui aucun test.** Seul `src/lib/__tests__/sentry-before-send.test.ts` existe, sur un sujet voisin mais distinct. Le lot doit donc créer ses propres tests, sans quoi la seule validation possible serait d'attendre la prochaine vraie erreur en production.

Tests unitaires (Vitest), sur des fonctions pures, sans appel réseau ni appel au modèle :

1. **Extraction des en-têtes** : à partir d'une copie de l'événement réel `2P`, vérifier que les cinq en-têtes retenus sortent, que `cookie`, `authorization`, `forwarded` et les en-têtes d'IP sont absents, que la CSP et les en-têtes de réponse sont écartés, et que le plafond de 200 caractères s'applique.
2. **Validation de l'analyse** : `confidence` absent donne `probable` et l'analyse est conservée ; une valeur inconnue ne fait pas basculer sur le fallback.
3. **Plafond d'urgence** : une réponse `incertain` + `high` ressort en `medium`, une réponse `certain` + `high` est inchangée.
4. **Carte produit** : chaque préfixe cité existe sous `src/app/[locale]` (garde-fou de la section 5).
5. **Prompt** : le prompt construit depuis l'événement `2P` contient bien l'ASN, le `Content-Type` et le `userCount` (test de non-régression sur le câblage, qui est précisément ce qui a manqué ici).

Aucun test E2E : la chaîne n'a pas de surface utilisateur.

### Validation manuelle avant de clore

Rejouer l'événement `2P` de bout en bout et lire l'alerte produite, au lieu de se fier aux seuls tests unitaires. Le payload du webhook est reconstituable et l'événement est toujours consultable via l'API Sentry. **Attendu : `urgency: noise`, `userImpact.level: none`, et un `trigger` qui nomme le scan.** Tant que cette vérification n'est pas faite, le lot n'est pas terminé, puisque le défaut d'origine portait sur le résultat final, pas sur les fonctions prises une à une.

## 10. Décisions tranchées

- **D1 — retenue** (17/09/2026) : l'urgence est plafonnée à `medium` quand la confiance est `incertain`. Détail et risque assumé en section 6.3.
- **D2 — hors périmètre** (17/09/2026) : la fiche sous-traitant Anthropic n'est pas corrigée dans ce lot. L'écart préexiste à cette spec ; il est consigné en section 11 pour être traité séparément.

## 11. Hors périmètre, à traiter séparément

- **P5, l'analyse sur un seul événement** : le webhook ne réagit qu'à `action: "created"`, donc l'analyse tourne sur le premier événement, quelques secondes après son apparition. Sur `2P`, le signal décisif (`/index.php`) était **dans un autre événement**, arrivé plus tard. Différer l'analyse, ou lire plusieurs événements et la distribution des tags, corrigerait cette cécité structurelle. Chantier plus lourd, à cadrer à part.
- **Date de la release** : le modèle reçoit le SHA, jamais la date, donc il ne peut pas tester l'hypothèse « déploiement en cours », qui est l'explication canonique de ce message dans la doc Next.js et qu'il récite faute de mieux. Nécessite un appel supplémentaire à l'API Sentry.
- **Historique des arbitrages** : injecter les issues déjà classées sans suite éviterait de réalerter sur un bruit déjà tranché, par exemple le `P2025` du callback magic link.
- **Fiche sous-traitant Anthropic (D2)** : `messages/fr.json` et `messages/en.json`, clé `Legal.privacy.subprocessors.anthropic`, déclarent la finalité « génération de descriptions » et les données « contenu saisi par l'utilisateur, aucune donnée personnelle ». Deux écarts, de statut différent. **Préexistant** : la chaîne d'analyse envoie déjà des URL et des traces d'exécution, hors de cette finalité. **Créé par P1** : le type de client et le réseau d'origine s'y ajoutent, ce qui rend « aucune donnée personnelle » discutable même sans l'adresse IP, exclue par la section 7. Une seule phrase à réécrire dans les deux langues couvrirait les deux écarts. ⚠️ `messages/**` relève de la règle d'édition locale : modifier, montrer, ne pas committer sans instruction.
- **Mise en forme Slack conditionnée au verdict** : le gabarit sonne l'alarme identiquement quoi qu'il arrive, bandeau 🚨, mention « Urgence », bouton rouge, y compris sur une analyse `noise` (`slack-notification-service.ts:284-299`). Router `noise` et `low` vers un affichage calme réduirait le bruit ressenti **sans dépendre de la justesse du modèle**. Levier au moins aussi rentable que P2 à P4, et beaucoup plus simple.
