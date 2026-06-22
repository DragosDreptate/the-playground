# Scoring de risque des nouveaux utilisateurs + alertes

> Statut : spec cadrée, non implémentée. Modèle à 2 étages (étage 1 figé, étage 2 en cours de cadrage). Découle des incidents du 14/06/2026 (phishing usurpant le support) et du 22/06/2026 (slop publicitaire). Rapports d'incident (PII, locaux) : `spec/security/2026-06-14-incident-phishing-organisateurs.md`, `spec/security/2026-06-22-bug-notif-publicid-manquants-krishna.md`.

## Problème

Après les attaques du 14/06, la réaction a été la **suppression manuelle à l'instinct** de comptes suspects. Résultat : des **faux positifs** (avcin, shawnallen : comptes probablement légitimes supprimés sur des signaux faibles comme « nom étranger » ou « accès direct »). On veut une approche qui :

- **détecte** automatiquement les comptes à risque,
- **alerte** un humain au lieu de bloquer/supprimer (la décision reste humaine),
- **réduit les faux positifs** en pondérant des signaux objectifs plutôt que des intuitions.

## Principe directeur : alerter, jamais agir automatiquement

Le scoring **ne bloque ni ne supprime jamais** un compte. Il **alerte** et **enrichit la décision humaine**. Raisons :

1. Le coût d'un faux positif (supprimer un utilisateur légitime) est élevé, surtout en phase de croissance internationale.
2. Une suppression/blocage automatique serait une **décision automatisée** au sens RGPD art. 22, à éviter.
3. Les blocages durs déjà en place (domaines jetables, noms usurpant support/admin, blocklist d'identité) couvrent les cas **certains** ; le scoring couvre le **probable**, qui exige un jugement.

## Modèle à 2 étages

Le scoring s'évalue en **deux étages**, via **un seul moteur** déterministe `assessUserRisk(signals)` appelé deux fois avec un jeu de signaux croissant. La note ne fait que monter quand le comportement est suspect.

- **Étage 1 — à la complétion de l'onboarding** : signaux du compte (figés à T0 : email, headers de la requête de sign-in ; + mismatch nom calculé à l'onboarding, où le nom OAuth et le nom saisi coexistent). Enrichit la notif admin existante (`notifyAdminNewUser`, qui part justement à la fin de l'onboarding).
- **Étage 2 — comportemental, premières X minutes** : déclenché **par l'action** (`createCircle` / `createMoment` / `contactCircleHosts`), pas par un timer. C'est là que se détecte le slop. *(Cadrage en cours, cf. graine plus bas.)*

### Restitution : grille gradée par critère

On ne produit pas qu'un score agrégé : **chaque critère est noté 🟢/🟠/🔴**, et la notif + la fiche admin affichent **le détail par critère (verts inclus)**, pas juste le total. Voir « tout est normal sauf X » est aussi actionnable que le rouge.

- **Agrégat** : somme des contributions selon le niveau de chaque critère, avec **plafond des oranges** (un faisceau de signaux faibles ne déclenche jamais seul) et **plancher des rouges** (1 rouge → MEDIUM, 2 → HIGH). Bandes : `LOW` < 40 · `MEDIUM` 40-69 · `HIGH` ≥ 70. Seuils configurables (env vars).
- **Alerte** sur MEDIUM/HIGH ; à l'étage 2, sur **escalade de bande** uniquement (pas de re-spam).

### Étage 1 — grille figée

| Critère | 🟢 vert (0) | 🟠 orange | 🔴 rouge |
|---|---|---|---|
| **Entropie localpart** | nom normal (`prenom.nom`) | suffixe num. long / entropie moyenne → +12 | clairement aléatoire (`mqd5o6f9n5h3`) → +25 |
| **Casse du nom** | casse normale | un token en CAPS → +15 | nom entier en majuscules → +40 |
| **Mismatch nom OAuth ↔ saisi** (intelligent : tokens égaux / préfixe / initiale ; flag si **disjoint**) | tokens compatibles | disjoint → +10 (plafonné orange) | — |
| **Localisation** (`x-vercel-ip-country`, client réel) | Europe (`CORE_COUNTRIES`) | hors Europe → +10 | — |
| **Referer** | normal / absent | service de mail jetable → +15 | — |

**Hors scoring** (blocages **durs**, pas des critères, sinon double comptage) : nom usurpant support/admin (`impersonation-guard`), email jetable (`disposable-domains`), récidive d'identité (blocklist Edge Config).

**Implémentation** : **100% code déterministe** (pas de LLM à l'étage 1 — testabilité, explicabilité RGPD, coût/latence, contrôle de calibration). Usecase pur `assessUserRisk`, testable (`test.each` : avcin/shawnallen → LOW, spammeurs → HIGH).

**Stockage** : **champs sur `User`** (pas de table) — `riskScore Int?`, `riskBand`, `riskCriteria Json?` (la grille gradée), `riskStage`, `riskAssessedAt`. Snapshot, pas d'historique en base (l'évolution est tracée par les alertes). Index sur `riskBand` pour la future liste « comptes à risque ». RGPD : statuts/valeurs dérivés uniquement, purge à la suppression du compte.

**Restitution** : notif email/Slack avec la grille gradée + section « Risque » dédiée sur la fiche admin (voir ci-dessous).

**PostHog n'est PAS un critère scoré** (tracking peu fiable + non discriminant au signup — cas krishna : session humaine, organique, et pourtant spam). Il **enrichit la décision humaine** dans la notif/fiche (lien session replay, source d'arrivée, device), jamais le score.

**À calibrer (différé)** : seuils d'entropie, liste exacte `CORE_COUNTRIES` (proposé : UE + EEE + UK + Suisse).

### Fiche admin — section « Risque » dédiée

On **enrichit la fiche utilisateur de l'admin** (`src/app/[locale]/(routes)/admin/users/[id]/page.tsx`, déjà gatée admin) d'une **section « Risque »** dédiée, en **lecture seule**. C'est l'un des trois consommateurs de la même donnée (`User.risk*`), avec la notif et la future liste « comptes à risque » — une écriture, trois lectures.

La section affiche :
- **Badge de bande** (🟢 LOW / 🟠 MEDIUM / 🔴 HIGH) + le **score**, l'**étage** (`riskStage`) et la **date** (`riskAssessedAt`) de la dernière évaluation ;
- **la grille gradée critère par critère** (`riskCriteria`), verts inclus, même rendu que la notif (« tout est normal sauf X ») ;
- **le contexte d'investigation PostHog** (lien session replay, source d'arrivée, device) — affiché comme aide à la décision, **jamais scoré** ;
- un **raccourci vers l'audit exhaustif** (`/audit-compte` pré-rempli sur ce compte) pour enchaîner vers l'investigation profonde si besoin.

Lecture seule : les actions (blocage) restent via les outils existants (`pnpm block`) ou un futur bouton lié à la suspension réversible (#533). Données lues directement depuis les champs `User`, aucune requête lourde.

### Étage 2 — comportemental (graine, à finaliser)

Déclenché **par l'action** (hook dans le usecase), avec « X premières minutes » comme **poids de vélocité** (plus l'action est rapide, plus elle pèse), pas une fenêtre couperet. Sera transposé en grille gradée 🟢/🟠/🔴 comme l'étage 1 quand on le figera. Signaux pressentis :

| Poids | Signal | Source |
|---|---|---|
| 🔴 Fort | `contact_hosts` dans les X premières min (vecteur phishing 14/06) | DB `rate_limits` |
| 🔴 Fort | Crée un Circle/Moment **public** avec `website` vers un **site commercial/billetterie externe** | `circles.website`, `visibility` |
| 🟠 Moyen | Description **machine-translated** / copy promo recopiée Circle↔Moment | `descriptions` (sémantique → LLM Haiku ; la recopie identique reste déterministe) |
| 🟠 Moyen | **Géoloc instable intra-session** (proxy/VPN hopping) | PostHog events **client** (la variabilité, pas le lieu) |
| 🟠 Moyen | **Vélocité** : compte → Circle → Moment en quelques minutes | timestamps |
| 🟠 Moyen | Événement = **annonce publicitaire** (pas un rassemblement) ; catégorie incohérente | `moments` (sémantique → LLM) |
| 🟢 Faible | Champ détourné (ex. `city` = adresse complète) | `circles.city` |

**Leçon centrale (cas krishna, 22/06)** : un **vrai compte Google**, arrivée organique, géoloc stable, session 18 min — et pourtant spam. La mécanique du compte ne discrimine pas ; **le discriminant fort du slop est le CONTENU/l'intent**. Un score compte-seul rate cette menace, d'où l'étage 2 hooké sur la création d'entité. Corollaire assumé : un compte d'intention **dormant** (rien créé) reste LOW, et c'est correct — on ne flague pas sur l'absence de preuve.

### Ce qu'on ne score volontairement PAS

- **Langue EN, accès direct, timing** : produisent surtout des faux positifs (plateforme bilingue, expansion internationale). Documenté pour acter qu'on ne s'en sert pas.
- **Pays seul** : on score une **localisation hors Europe** en signal **faible plafonné** (jamais seul), et la **variabilité** geoip intra-session (hopping) à l'étage 2 — mais **jamais le pays comme signal fort ou unique**. Revirement assumé vs la décision initiale « géoloc non scorée » : justifié par la corrélation observée le 22/06 (Inde, Asie, US) + les garde-fous faible/plafonné.

## Commande d'investigation de compte (audit exhaustif)

> **Besoin** : pouvoir **enclencher rapidement** une investigation sur un compte donné et obtenir, en un rapport, tout le nécessaire pour qu'un **humain tranche** « spam ou pas ». Complémentaire du scoring : le scoring **alerte**, la commande **instruit le dossier**.

**Forme** : skill / commande Claude Code, ex. `/audit-compte <email | userId | providerAccountId>`. **Lecture seule** (aucune mutation) ; l'humain décide et agit ensuite (blocage via `pnpm block`, surveiller, ou rien).

**Le prompt encode les leçons de nos investigations passées** (14/06 phishing, 22/06 slop ; playbook mémoire `reference_account_investigation`) :
- **La mécanique du compte ne discrimine pas** : OAuth réel, arrivée organique, session longue **n'innocentent pas** (krishna). Le discriminant = **contenu / intent** (Circle/Moment pub vers de l'externe).
- **Pièges à faux positifs à ne PAS retenir seuls** : nom étranger, langue EN, accès direct, géoloc (avcin/shawnallen supprimés à tort sur ces seuls signaux).
- **Pièges data** : geoip server-side = serveur Vercel (Frankfurt), pas le client ; `createdAt` ~2 h derrière l'UTC réel ; vrai id acteur = `accounts.providerAccountId` ; tracking PostHog serveur lossy → **DB = source de vérité** ; littéraux HogQL interprétés en fuseau Paris (convertir les timestamps Sentry UTC).

**Ce que la commande rassemble (exhaustif)** :
- **DB** : user (création, provider, onboarding, publicId, emailVerified), `accounts` (providerAccountId), champs de risque, memberships, **Circles créés** (`website`, `visibility`, `description`), **Moments créés** (`description`), registrations, comments, `rate_limits` (contact-hosts), statut blocklist.
- **PostHog** (API REST directe, **jamais le MCP**) : lien session replay, props `auth_sign_in` (provider, email_domain, user_agent, referer, is_new_user), **stabilité geoip client** (hopping ?), navigation.
- **Dérivés** : domaine email + check jetable, entropie localpart, géoloc, et **la grille de scoring** si déjà calculée.
- **Corrélations** : même `providerAccountId` / IP qu'un acteur connu, hits blocklist.

**Sortie** : un **rapport structuré orienté décision** — résumé d'identité, **contenu créé** (discriminant slop mis en avant), timeline comportementale, stabilité geoip, **faisceau pour / contre spam** — **sans verdict automatique** (l'humain tranche), + menu d'actions suggérées (`pnpm block oauth:…`, surveiller, ignorer). PII → rapport local, jamais committé (`spec/security/` gitignored).

## Architecture (hexagonale)

1. **Usecase pur** `domain/usecases/assess-user-risk.ts` : `assessUserRisk(signals) -> { score, band, criteria[] }`. Aucune I/O, entièrement testable (`test.each` sur les combinaisons de signaux). Accepte des signaux compte ET contenu (extensible pour l'étage 2).
2. **Collecte des signaux** : un adapter assemble les signaux depuis la DB + les headers de requête (**pas PostHog pour le score**).
3. **Signaux sémantiques (étage 2)** : derrière un port `ContentRiskService` → adapter `ClaudeContentRiskService` (Haiku), sortie structurée injectée comme **un** signal. Le moteur reste déterministe et auditable ; mocké en test.
4. **Déclenchement fiable** : étage 1 dans le flux d'onboarding, étage 2 dans l'exécution du usecase d'action — **pas en `after()` best-effort seul** (cf. bug 22/06 `project_bug_notif_publicid_deferred_work` : travail différé droppé silencieusement = alerte ratée). Prévoir un **cron de réconciliation** balayant les comptes/Circles/Moments récents non scorés.
5. **Quick win rétroactif** (avant scoring temps réel) : un **cron quotidien** flague les Circles publics récents avec `website` externe + description suspecte, et alerte Slack.

## Alertes

Canal : **email admin ET Slack** (décision actée).

- **Email** : réutilise l'infra Resend + le pattern `notifyAdminNewUser`. Template dédié « compte à risque » avec bande, score, **grille gradée**, lien admin vers le compte.
- **Slack** : webhook dédié aux alertes sécurité (nouvelle var d'env `SLACK_SECURITY_WEBHOOK_URL`). Message compact : bande, grille, email, lien.
- **Seuil d'alerte** : seules les bandes `MEDIUM` et `HIGH` alertent. `LOW` n'alerte pas.
- Échec d'envoi : ne jamais casser le flux ; capturer les échecs Sentry en `warning`. Mais ne pas faire reposer le déclenchement sur un `after()` seul (cf. Architecture).

## RGPD

- Le scoring est un **profilage de données personnelles** -> à documenter :
  - **base légale** : intérêt légitime (prévention de la fraude / sécurité de la plateforme et de ses organisateurs),
  - **registre des traitements** + mention dans la **politique de confidentialité**,
  - **pas de décision automatisée** produisant des effets juridiques (art. 22) : on alerte, un humain décide.
- Minimisation : ne stocker que la **bande + le score + la grille de critères** (statuts/valeurs dérivés), pas de copie de données brutes superflues. Purge à la suppression du compte.
- À intégrer à l'audit RGPD (agent `security-guardian`, dimension F).

## Découpage en phases

- **Phase 1 — étage 1** : moteur `assessUserRisk` + signaux compte (grille gradée) + champs `User` + notif email/Slack enrichie + **section « Risque » sur la fiche admin**. 100% code, aucun blocage. Tests unitaires (avcin/shawnallen → LOW, spammeurs → HIGH).
- **Phase 2 — étage 2** : signaux comportementaux + contenu (hooks `createCircle`/`createMoment`/`contactCircleHosts`), LLM Haiku pour le sémantique, escalade de bande, cron de réconciliation.
- **Phase 3** (option) : vue admin listant les comptes scorés, filtrable par bande, avec actions (ignorer / suspendre — cf. #533).
- **Commande `/audit-compte`** : transverse, livrable tôt (lecture seule, indépendante du scoring).
- **Quick win** : cron quotidien Circles publics récents à `website` externe (avant le scoring temps réel).

## Points ouverts (à trancher avant implémentation)

1. **Seuils d'entropie** du localpart (longueur + ratio chiffres + entropie) sans flaguer les emails pro normaux (`prenom.nom42@`).
2. **Liste exacte `CORE_COUNTRIES`** (Europe : UE + EEE + UK + Suisse par défaut ?).
3. **X** (fenêtre de vélocité étage 2) : proposé 30 min, + cron pour le tardif.
4. **Détection « site commercial/billetterie externe »** : liste de domaines connus (eventbrite, billetweb…) vs heuristique « website non social/perso » vs jugement LLM.
5. **Détection « machine-translated »** : copy **identique** Circle↔Moment = déterministe (Phase 1 possible) ; le « machine-translated » réel = LLM Haiku (Phase 2).
6. **Lien avec la suspension réversible** (#533) : l'alerte HIGH / la fiche admin pourraient proposer un bouton « suspendre » une fois ce mécanisme en place.

## Cas de test (jeu de calibrage)

- **14/06** : 3 comptes malveillants → MEDIUM/HIGH, **avcin et shawnallen → LOW** (les faux positifs à ne plus reproduire).
- **22/06** : les 3 comptes (2 magic-link email louche + 1 Google OAuth « propre » mais slop) doivent scorer MEDIUM/HIGH **une fois le contenu pris en compte** (étage 2), alors qu'au compte-seul le cas Google scorerait LOW. Test clé : prouver que le scoring contenu rattrape ce que le scoring compte rate.

## Liens

- Issue backlog : #536
- Rapport d'incident fondateur : `spec/security/2026-06-14-incident-phishing-organisateurs.md`
- Cas slop 22/06 (PII, local) : `spec/security/2026-06-22-bug-notif-publicid-manquants-krishna.md`
- Mécanisme de suspension réversible : issue #533
- Playbook d'investigation : mémoire `reference_account_investigation`
- Bug fiabilité travail différé (impacte le déclenchement des alertes) : mémoire `project_bug_notif_publicid_deferred_work`
