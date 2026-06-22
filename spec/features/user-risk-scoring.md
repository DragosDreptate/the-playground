# Scoring de risque des nouveaux utilisateurs + alertes

> Statut : spec à valider (non implémenté). Découle de la série d'incidents du 14/06/2026 (comptes frauduleux usurpant le support pour phisher les organisateurs). Voir le rapport d'incident `spec/security/2026-06-14-incident-phishing-organisateurs.md` (local).

## Problème

Après les attaques du 14/06, la réaction a été la **suppression manuelle à l'instinct** de comptes suspects. Résultat : des **faux positifs** (avcin, shawnallen : comptes probablement légitimes supprimés sur des signaux faibles comme « nom étranger » ou « accès direct »). On veut une approche qui :

- **détecte** automatiquement les comptes à risque dès l'inscription,
- **alerte** un humain au lieu de bloquer/supprimer (la décision reste humaine),
- **réduit les faux positifs** en pondérant des signaux objectifs plutôt que des intuitions.

## Principe directeur : alerter, jamais agir automatiquement

Le scoring **n'bloque ni ne supprime jamais** un compte. Il **alerte** et **enrichit la décision humaine**. Raisons :

1. Le coût d'un faux positif (supprimer un utilisateur légitime) est élevé, surtout en phase de croissance internationale.
2. Une suppression/blocage automatique serait une **décision automatisée** au sens RGPD art. 22, à éviter.
3. Les blocages durs déjà en place (domaines jetables, noms usurpant support/admin, blocklist d'identité) couvrent les cas **certains** ; le scoring couvre le **probable**, qui exige un jugement.

## Signaux

Pondérés par fiabilité. Le scoring agrège les signaux disponibles ; l'absence d'un signal ne pénalise pas.

| Poids | Signal | Source | Note |
|---|---|---|---|
| 🔴 Fort | Nom usurpant support/admin/playground (leet inclus) | `impersonation-guard` | Déjà bloqué à l'inscription : un compte qui tente ce nom = signal max |
| 🔴 Fort | Email jetable | `disposable-domains` | Déjà bloqué au magic link ; reste utile pour scorer un OAuth |
| 🔴 Fort | `contact_hosts` dans les X premières minutes après inscription | DB (`rate_limits`) | Signal d'intention le plus net (le vecteur réel) |
| 🟠 Moyen | Localpart email à forte entropie / aléatoire | email | `mqd5o6f9n5h3`, `ixewufoy22`, suffixe numérique long. Heuristique : ratio chiffres/lettres, entropie de Shannon |
| 🟠 Moyen | Mismatch nom OAuth ↔ nom affiché | profil + OAuth | avcin : nom Google « Авцин Всеволод » → nom affiché « Lui Latess » |
| 🟠 Moyen | Vélocité : même `providerAccountId` ou IP qui réinscrit après suppression | DB | ixewufoy : recréation en boucle |
| 🟠 Moyen | **Géoloc instable intra-session (proxy/VPN hopping)** | PostHog (events **client**) | La ville geoip **change plusieurs fois pendant une même session** → rotation d'IP/proxy = signal d'abus fort. Cas du 22/06 (THE-PLAYGROUND-20) : un acteur bloqué retente 3× le magic-link en sautant Sioux City → Cottontown → Benton Harbor en 16 min. ⚠️ À ne PAS confondre avec la *localisation* (pays étranger), volontairement non scorée (cf. dernière ligne). Ici le signal est la **variabilité**, pas le lieu. N'utiliser que le geoip des events **client** (`posthog-js`) ; le geoip server-side = serveur Vercel, inutilisable. |
| 🟢 Faible | Referer `tempmail.ing` (ou autres services jetables) sur `auth_sign_in` | headers | Corrobore un email jetable |
| 🟢 Faible | Quitte le profile setup sans le compléter | comportement | Très courant chez les légitimes aussi : pondération basse |
| ⚪ Nul | Géoloc / pays « étranger », accès direct, langue EN, timing | headers | **Volontairement non scorés** : produisent surtout des faux positifs (plateforme bilingue, expansion internationale). Documenté ici pour acter qu'on ne les utilise pas seuls. |

> Rappel important : ne pas baser les signaux comportementaux sur PostHog. Le tracking serveur (`captureServerEvent`) perd des events par intermittence (fire-and-forget). **Source de vérité = la DB** (`users`, `accounts`, `rate_limits`, `registrations`, `circle_memberships`).

## Modèle de scoring

- Score = somme pondérée des signaux présents, normalisée sur 0-100.
- Trois bandes : `LOW` (info, pas d'alerte), `MEDIUM` (alerte basse priorité), `HIGH` (alerte haute priorité).
- Seuils configurables (env vars) pour calibrer le bruit sans redéploiement.
- Chaque évaluation conserve les **flags** (raisons) qui ont contribué, pour rendre l'alerte actionnable (« pourquoi ce compte est flaggé »).

Exemple indicatif (à calibrer) :
- Nom usurpant support : +60
- contact_hosts < 10 min : +50
- Email jetable : +40
- Localpart aléatoire : +25
- Mismatch nom OAuth : +20
- Réinscription même identité : +30
- Referer jetable : +15

## Architecture (hexagonale)

1. **Usecase pur** `domain/usecases/assess-user-risk.ts` : `assessUserRisk(signals) -> { score, band, flags[] }`. Aucune I/O, entièrement testable (`test.each` sur les combinaisons de signaux).
2. **Collecte des signaux** : un adapter qui assemble les signaux depuis la DB + les headers de requête (pas PostHog).
3. **Deux moments d'évaluation** :
   - **À l'inscription** (signaux statiques : email, nom, provider, referer) : déclenché dans `after()` après création, enrichit l'alerte admin existante (`notifyAdminNewUser` dans `profile.ts` / le flux d'inscription).
   - **Comportemental différé** (signaux dynamiques : contact_hosts rapide, vélocité) : re-score sur action sensible (hook dans `contactCircleHostsAction`) et/ou via un cron de balayage.
4. **Stockage** : champs `riskScore Int?` + `riskFlags String[]` + `riskAssessedAt DateTime?` sur `User`, OU table dédiée `UserRiskAssessment` (historise les ré-évaluations). À trancher (cf. points ouverts).

## Alertes

Canal : **email admin ET Slack** (décision actée).

- **Email** : réutilise l'infra Resend + le pattern `notifyAdminNewUser` existant. Template dédié « compte à risque » avec score, bande, flags, lien admin vers le compte.
- **Slack** : webhook dédié aux alertes sécurité (nouvelle var d'env `SLACK_SECURITY_WEBHOOK_URL`). Message compact : score, flags, email, lien.
- **Seuil d'alerte** : seules les bandes `MEDIUM` et `HIGH` alertent (calibrage anti-bruit). `LOW` n'alerte pas.
- Fire-and-forget via `after()` mais avec gestion d'échec (ne jamais casser l'inscription ; capturer les échecs Sentry en `warning`).

## RGPD

- Le scoring est un **profilage de données personnelles** -> à documenter :
  - **base légale** : intérêt légitime (prévention de la fraude / sécurité de la plateforme et de ses organisateurs),
  - **registre des traitements** + mention dans la **politique de confidentialité**,
  - **pas de décision automatisée** produisant des effets juridiques (art. 22) : on alerte, un humain décide.
- Minimisation : ne stocker que le score + les flags (pas de copie de données brutes superflues). Durée de conservation à définir (purge des évaluations des comptes supprimés).
- À intégrer à l'audit RGPD (agent `security-guardian`, dimension F).

## Découpage en phases

- **Phase 1** : usecase de scoring + collecte des signaux statiques (entropie email, mismatch nom, jetable/usurpation déjà détectés, referer) + alertes email & Slack enrichies à l'inscription. Aucun blocage. Tests unitaires du usecase.
- **Phase 2** : signaux comportementaux (contact_hosts rapide, vélocité par `providerAccountId`), re-scoring différé.
- **Phase 3** (option) : vue admin listant les comptes scorés, filtrable par bande, avec actions (ignorer / suspendre — cf. issue #533 suspension réversible).

## Points ouverts (à trancher avant implémentation)

1. **Stockage** : champs sur `User` (simple) vs table `UserRiskAssessment` (historise, plus propre pour le re-scoring). Recommandation : table dédiée si on fait la Phase 2.
2. **Calibrage des poids et seuils** : valeurs initiales à affiner sur les cas réels connus (les 4 comptes du 14/06 servent de jeu de test : 3 doivent scorer HIGH, shawnallen doit scorer LOW/MEDIUM).
3. **Entropie du localpart** : définir le seuil (longueur + ratio chiffres + entropie) sans flaguer les emails pro normaux (`prenom.nom42@`).
4. **Lien avec la suspension réversible** (#533) : l'alerte HIGH pourrait proposer un bouton « suspendre » une fois ce mécanisme en place.
5. **Mismatch nom OAuth** : nécessite de capturer le nom brut du provider (Google) à la création pour le comparer ; aujourd'hui seul `name` est stocké.

## Mise à jour 22/06/2026 — 2ᵉ menace : le « slop » (création de contenu publicitaire)

Une série de comptes (22/06) a révélé un profil distinct de celui du 14/06 : des acteurs (humains réels OU bots) qui s'inscrivent **uniquement pour créer une Communauté/un événement publicitaire** pointant vers leur produit/site externe. Détail des cas (avec PII) : `spec/security/2026-06-22-bug-notif-publicid-manquants-krishna.md` (local, gitignored).

### Leçon centrale : la mécanique du compte ne discrimine PAS

Un des cas (« krishna ») était un **vrai compte Google**, arrivé **organiquement via recherche Google**, géoloc **stable** (pas de proxy), session de **18 min / 564 frappes** (humain authentique)… et c'était quand même du spam. Tous les signaux « statiques/mécaniques » du scoring actuel le classaient LÉGITIME.

→ **Le discriminant fort du slop est le CONTENU/l'INTENT, pas le compte.** Conséquence directe pour le scoring : un score calculé **uniquement à l'inscription** rate cette menace. Il faut un **3ᵉ moment d'évaluation : à la création d'entité** (Circle / Moment), là où le signal apparaît.

### Signaux « slop » (à la création de Circle/Moment) — fort pouvoir discriminant

| Poids | Signal | Source |
| --- | --- | --- |
| Fort | `website` du Circle pointe vers un **site commercial/billetterie externe** (promo produit) | `circles.website` |
| Fort | Description **machine-translated** / copy SEO / promo (texte recopié à l'identique Circle↔Moment) | `circles.description`, `moments.description` |
| Moyen | **Vélocité** : compte → Circle → Moment en quelques minutes | timestamps |
| Moyen | Événement = **annonce publicitaire** (pas un vrai rassemblement) ; catégorie incohérente | `moments` |
| Moyen | Pousse vers la **visibilité publique** (Circle `PUBLIC`, vérifie l'Explorer juste après) | `visibility`, PostHog |
| Faible | Champ détourné (ex. `city` rempli d'une adresse complète) | `circles.city` |

### Implications pour l'architecture du scoring

- Ajouter un **hook de scoring à la création d'entité** : usecases `createCircle` / `createMoment` (ou leurs server actions) → re-score + alerte si bande MEDIUM/HIGH. Moment le plus rentable contre le slop.
- Le usecase pur `assessUserRisk` doit accepter des **signaux de contenu** en plus des signaux compte (extensible).
- **Fiabilité du déclenchement** : NE PAS faire reposer l'alerte sur un `after()` best-effort seul. Bug observé le 22/06 (`project_bug_notif_publicid_deferred_work`) : le travail différé peut être **droppé silencieusement** sur Vercel → alerte ratée = spam non vu. Prévoir un déclenchement fiable + éventuel cron de réconciliation balayant les nouveaux Circles/Moments non scorés.
- **Quick win rétroactif** (avant scoring temps réel) : un **cron quotidien** qui flague les Circles publics récents avec `website` externe + description suspecte, et alerte Slack.

### Cas de test à ajouter (jeu de calibrage)

Les 3 comptes du 22/06 (2 magic-link à email jetable/louche + 1 Google OAuth « propre » mais slop) doivent tous scorer MEDIUM/HIGH **une fois le contenu pris en compte**, alors qu'au scoring compte-seul le cas Google scorerait LOW. Test clé : prouver que le scoring contenu rattrape ce que le scoring compte rate.

## Liens

- Issue backlog : #536
- Rapport d'incident fondateur : `spec/security/2026-06-14-incident-phishing-organisateurs.md`
- Cas slop 22/06 (PII, local) : `spec/security/2026-06-22-bug-notif-publicid-manquants-krishna.md`
- Mécanisme de suspension réversible : issue #533
- Playbook d'investigation : mémoire `reference_account_investigation`
- Bug fiabilité travail différé (impacte le déclenchement des alertes) : mémoire `project_bug_notif_publicid_deferred_work`
