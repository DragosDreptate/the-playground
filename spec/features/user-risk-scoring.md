# Scoring de risque des comptes + audit manuel à la demande

> Statut : spec cadrée, non implémentée. Deux mécanismes complémentaires : un **scoring automatique du compte** (à l'onboarding) et un **skill d'audit manuel** (`/audit-user`) pour le contenu/intent. Découle des incidents du 14/06/2026 (phishing usurpant le support) et du 22/06/2026 (slop publicitaire). Rapports d'incident (PII, locaux) : `spec/security/2026-06-14-incident-phishing-organisateurs.md`, `spec/security/2026-06-22-bug-notif-publicid-manquants-krishna.md`.

## Problème

Après les attaques du 14/06, la réaction a été la **suppression manuelle à l'instinct** de comptes suspects. Résultat : des **faux positifs** (avcin, shawnallen : comptes probablement légitimes supprimés sur des signaux faibles comme « nom étranger » ou « accès direct »). On veut une approche qui :

- **détecte** automatiquement les comptes à risque,
- **alerte** un humain au lieu de bloquer/supprimer (la décision reste humaine),
- **réduit les faux positifs** en pondérant des signaux objectifs plutôt que des intuitions.

## Principe directeur : alerter, jamais agir automatiquement

Le scoring **ne bloque ni ne supprime jamais** un compte. Il **alerte** et **enrichit la décision humaine**. Raisons :

1. Le coût d'un faux positif (supprimer un utilisateur légitime) est élevé, surtout en phase de croissance internationale.
2. Une suppression/blocage automatique serait une **décision automatisée** au sens RGPD art. 22, à éviter.
3. Les blocages durs déjà en place (domaines jetables, noms usurpant support/admin, blocklist d'identité, **gate 24h pour contacter un organisateur**) couvrent les cas **certains** ; le scoring couvre le **probable**, qui exige un jugement.

## Deux mécanismes : où l'automatique aide, où l'humain tranche

La leçon centrale du 22/06 (cas krishna : compte Google réel, arrivée organique, session 18 min, et pourtant spam) : **la mécanique du compte ne discrimine pas le slop, le discriminant est le contenu/intent**. Or juger le contenu (« ce website est-il commercial ? cette copy est-elle de la pub machine-translated ? cet event est-il un vrai rassemblement ? ») est **sémantique** et **bruité** (plein de communautés légitimes mettent un lien externe / Eventbrite). On répartit donc :

- **Scoring automatique du COMPTE** (étage 1, à l'onboarding) : signaux mécaniques, déterministes, fiables → alerte + fiche admin.
- **Audit manuel du CONTENU/intent** (skill `/audit-user`) : humain + LLM, **à la demande**, lancé en réaction aux notifs Slack de création de contenu (`notifySlackNewEntity`, déjà en place). Pas de moteur de scoring contenu automatique : volume faible (100% France), précision du signal « website externe » trop bruitée pour alerter automatiquement, et le jugement slop appelle un humain.

> **contact_hosts retiré du scoring** : un hard gate bloque déjà tout compte de **moins de 24h** (non-organisateur) pour contacter un host (`contact-circle-hosts.ts`, `NEW_ACCOUNT_WINDOW_HOURS = 24`). Le vecteur phishing du 14/06 est donc neutralisé ; un signal « contact_hosts dans les X premières minutes » serait impossible par construction.

## Scoring automatique du compte (étage 1)

Évalué **à la complétion de l'onboarding** (là où part la notif admin `notifyAdminNewUser`). Signaux figés à T0 (email, headers de la requête de sign-in) ; le mismatch nom est calculé à l'onboarding, où le nom OAuth et le nom saisi coexistent.

### Restitution : grille gradée par critère

On ne produit pas qu'un score agrégé : **chaque critère est noté 🟢/🟠/🔴**, et la notif + la fiche admin affichent **le détail par critère (verts inclus)**, pas juste le total. Voir « tout est normal sauf X » est aussi actionnable que le rouge.

- **Agrégat** : somme des contributions selon le niveau de chaque critère, avec **plafond des oranges** (un faisceau de signaux faibles ne déclenche jamais seul) et **plancher des rouges** (1 rouge → MEDIUM, 2 → HIGH). Bandes : `LOW` < 40 · `MEDIUM` 40-69 · `HIGH` ≥ 70. Seuils configurables (env vars).
- **Alerte** sur MEDIUM/HIGH uniquement (`LOW` n'alerte pas).

### Grille des critères

| Critère | 🟢 vert (0) | 🟠 orange | 🔴 rouge |
|---|---|---|---|
| **Entropie localpart** | nom normal (`prenom.nom`) | suffixe num. long / entropie moyenne → +12 | clairement aléatoire (`mqd5o6f9n5h3`) → +25 |
| **Casse du nom** | casse normale | un token en CAPS → +15 | nom entier en majuscules → +40 |
| **Mismatch nom OAuth ↔ saisi** (intelligent : tokens égaux / préfixe / initiale ; flag si **disjoint**) | tokens compatibles | disjoint → +10 (plafonné orange) | — |
| **Localisation** (`x-vercel-ip-country`, client réel) | Europe (`CORE_COUNTRIES`) | hors Europe → +10 | — |
| **Referer** | normal / absent | service de mail jetable → +15 | — |

**Hors scoring** (blocages **durs**, pas des critères, sinon double comptage) : nom usurpant support/admin (`impersonation-guard`), email jetable (`disposable-domains`), récidive d'identité (blocklist Edge Config), contact d'un host < 24h (gate).

**Implémentation** : **100% code déterministe** (pas de LLM — testabilité, explicabilité RGPD, coût/latence, contrôle de calibration). Usecase pur `assessUserRisk`, testable (`test.each` : avcin/shawnallen → LOW, spammeurs → HIGH).

**Stockage** : **champs sur `User`** (pas de table) — `riskScore Int?`, `riskBand`, `riskCriteria Json?` (la grille gradée), `riskStage`, `riskAssessedAt`. Snapshot, pas d'historique en base. Index sur `riskBand` pour la future liste « comptes à risque ». RGPD : statuts/valeurs dérivés uniquement, purge à la suppression du compte.

**PostHog n'est PAS un critère scoré** (tracking peu fiable + non discriminant au signup — cas krishna). Il **enrichit la décision humaine** dans la notif/fiche (lien session replay, source d'arrivée, device), jamais le score.

**À calibrer (différé)** : seuils d'entropie, liste exacte `CORE_COUNTRIES` (proposé : UE + EEE + UK + Suisse).

### Fiche admin — section « Risque » dédiée

On **enrichit la fiche utilisateur de l'admin** (`src/app/[locale]/(routes)/admin/users/[id]/page.tsx`, déjà gatée admin) d'une **section « Risque »** dédiée, en **lecture seule**. C'est l'un des trois consommateurs de la même donnée (`User.risk*`), avec la notif et la future liste « comptes à risque » — une écriture, trois lectures.

La section affiche :
- **Badge de bande** (🟢 LOW / 🟠 MEDIUM / 🔴 HIGH) + le **score**, l'**étage** (`riskStage`) et la **date** (`riskAssessedAt`) de la dernière évaluation ;
- **la grille gradée critère par critère** (`riskCriteria`), verts inclus, même rendu que la notif ;
- **le contexte d'investigation PostHog** (lien session replay, source d'arrivée, device) — aide à la décision, **jamais scoré** ;
- le **bouton `/audit-user`** (cf. ci-dessous) pour lancer l'audit de contenu profond sur ce compte.

Lecture seule : le blocage reste une action séparée explicite (`pnpm block` ou futur bouton lié à la suspension réversible #533).

### Ce qu'on ne score volontairement PAS

- **Langue EN, accès direct, timing** : produisent surtout des faux positifs (plateforme bilingue, expansion internationale).
- **Pays seul** : on score une **localisation hors Europe** en signal **faible plafonné** (jamais seul) — mais **jamais le pays comme signal fort ou unique**. Revirement assumé vs la décision initiale « géoloc non scorée », justifié par la corrélation observée le 22/06 (Inde, Asie, US) + les garde-fous faible/plafonné.

## Skill `/audit-user` — audit de compte à la demande

> **Objectif** : produire en quelques secondes un **dossier complet orienté décision** pour qu'un humain tranche spam / pas spam, sans fouiller DB + PostHog à la main. **Lecture seule, pas de verdict automatique.** Couvre l'analyse contenu/intent (ce que le scoring ne fait volontairement pas).

### Deux modes d'invocation (logique partagée)

| Mode | Pour quand | Mécanique |
|---|---|---|
| **CLI Claude Code** : `/audit-user <email \| userId \| providerAccountId \| publicId>` | tu es sur ton poste | Claude Code raisonne directement sur le dossier collecté |
| **Bouton sur la fiche admin** `users/[id]` | tu n'as pas ton ordi (mobile) | server action → collecte → **Claude API** → rapport **affiché dans l'UI + poussé sur Slack** (lecture mobile) |

**Faisabilité confirmée — aucun nouveau secret à configurer** (le mode admin tourne en prod) :
- **DB Neon prod** : natif (Prisma).
- **PostHog en query (HogQL)** : `POSTHOG_PERSONAL_API_KEY` **déjà en prod** (le cron `posthog-daily-report/fetch-dashboard.ts` tape déjà `…/api/projects/{id}/query/`). On réutilise ce helper.
- **Claude API** : `@anthropic-ai/sdk` déjà câblé en prod (Radar, `sentry/analyze-issue.ts`).
- **Blocklist** : Edge Config, lue server-side.

**DRY** : une seule fonction de **collecte** `gatherUserAuditData(identifier)` (DB + PostHog) et **un seul prompt d'audit**, partagés entre les deux modes. Seul diffère qui raisonne (Claude Code en CLI, l'API Claude côté admin, via un port `AIService` propre — l'app appelle le SDK en direct aujourd'hui).

### Ce que la collecte rassemble (exhaustif)

- **Compte** : `createdAt`, provider(s), `onboardingCompleted`, `publicId`, `emailVerified`, image, + la **grille de risque** (`riskScore/band/criteria`).
- **Acteur réel** : `accounts.providerAccountId`.
- **Contenu créé (le discriminant)** : Circles (`name`, `description`, `website`, `visibility`, `category`/`customCategory`, `city`, `createdAt`) + Moments (`title`, `description`, `videoLink`, `locationAddress`, `status`, `createdAt`).
- **Engagement** : memberships, registrations, comments, `rate_limits`.
- **Vélocité** : deltas compte → Circle → Moment.
- **PostHog (API directe, jamais le MCP)** : lien session replay, props `auth_sign_in` (provider, email_domain, user_agent, referer, is_new_user), **stabilité geoip client** (hopping ?), navigation.
- **Dérivés** : domaine + jetable ?, entropie localpart, géoloc hors Europe, casse du nom.
- **Corrélations** : même `providerAccountId` / IP qu'un acteur connu, statut blocklist.

### Ce que le LLM juge (signaux slop sémantiques)

- `website` = site commercial / billetterie externe ? (jugement, pas liste figée)
- description **machine-translated** / promo / SEO ? copy **recopiée** Circle↔Moment ?
- event = **annonce publicitaire** vs vrai rassemblement ? cohérence catégorie ↔ contenu ?

### Le prompt encode nos garde-fous (de nos investigations)

- **La mécanique ne disculpe pas** (krishna : OAuth réel + organique + session longue = quand même spam) → juger le **contenu/intent**.
- **Faux positifs à ne PAS retenir seuls** : nom étranger, EN, accès direct, géoloc (avcin/shawnallen supprimés à tort).
- **Pièges data** : geoip server-side = serveur Vercel (Frankfurt), pas le client ; `createdAt` ~2 h derrière l'UTC réel ; `providerAccountId` = vrai acteur ; tracking PostHog serveur lossy → **DB = source de vérité** ; littéraux HogQL en fuseau Paris (convertir les timestamps Sentry UTC).

### Sortie — rapport structuré

1. **Identité & compte** (résumé + grille de risque).
2. **Contenu créé** (website externe et copy mis en avant).
3. **Comportement** (vélocité, stabilité geoip, lien replay).
4. **Corrélations / blocklist**.
5. **Faisceau pour / contre spam** (à charge / à décharge).
6. **Pas de verdict** — l'humain tranche.
7. **Menu d'actions** : bloquer (`pnpm block oauth:…` en CLI, ou affordance dédiée côté admin), surveiller, ignorer.

**Audit = lecture seule.** Le blocage est une **action séparée et explicite** (on ne mélange pas audit et action).

### Modèle & coût

- **Modèle configurable, défaut Sonnet** (sweet spot jugement nuancé multilingue). Haiku pour de l'évident quasi-gratuit, Opus pour un cas tordu.
- **Choix validé empiriquement** : tester le prompt contre nos cas connus (krishna / nms.asia / mailsecondary → « à charge » ; **avcin / shawnallen → « à décharge »**), prendre le moins cher qui passe.
- **Coût** (ordre de grandeur, à confirmer) : ~1-2 ¢ (Haiku) / ~5 ¢ (Sonnet) / ~23 ¢ (Opus) par audit. Négligeable au volume manuel. **`usage` (input/output tokens) instrumenté** par appel pour mesurer le coût réel.

### RGPD / PII

Le rapport contient de la PII. En CLI il reste local ; côté admin il est affiché à l'admin (déjà autorisé) et poussé sur le **webhook Slack sécurité** (privé), **non persisté**. Jamais committé (`spec/security/` gitignored).

## Architecture (hexagonale)

1. **Scoring compte** : usecase pur `domain/usecases/assess-user-risk.ts` — `assessUserRisk(signals) -> { score, band, criteria[] }`. Aucune I/O, testable (`test.each`). Adapter de collecte des signaux = DB + headers (**pas PostHog pour le score**).
2. **Déclenchement fiable du scoring** : dans le flux d'onboarding, **pas en `after()` best-effort seul** (cf. bug 22/06 `project_bug_notif_publicid_deferred_work` : travail différé droppé silencieusement = alerte ratée). Filet : un cron de réconciliation peut re-scorer les comptes récents sans `riskAssessedAt`.
3. **Audit `/audit-user`** : `gatherUserAuditData(identifier)` (collecte DB + PostHog, partagée) + prompt partagé, derrière un port `AIService` → adapter Claude. Deux surfaces : commande CLI et server action admin (rapport → UI + Slack). Lecture seule.

## Alertes

Canal : **email admin ET Slack** (décision actée).

- **Email** : réutilise l'infra Resend + le pattern `notifyAdminNewUser`. Template dédié « compte à risque » avec bande, score, **grille gradée**, lien admin.
- **Slack** : webhook dédié aux alertes sécurité (nouvelle var d'env `SLACK_SECURITY_WEBHOOK_URL`). Message compact : bande, grille, email, lien.
- **Seuil d'alerte** : seules les bandes `MEDIUM` et `HIGH` alertent. `LOW` n'alerte pas.
- Échec d'envoi : ne jamais casser le flux ; capturer les échecs Sentry en `warning`. Mais ne pas faire reposer le déclenchement sur un `after()` seul (cf. Architecture).

## RGPD

- Le scoring est un **profilage de données personnelles** -> à documenter :
  - **base légale** : intérêt légitime (prévention de la fraude / sécurité de la plateforme et de ses organisateurs),
  - **registre des traitements** + mention dans la **politique de confidentialité**,
  - **pas de décision automatisée** produisant des effets juridiques (art. 22) : on alerte, un humain décide.
- Minimisation : ne stocker que la **bande + le score + la grille de critères** (statuts/valeurs dérivés). Purge à la suppression du compte. Les rapports `/audit-user` ne sont pas persistés.
- À intégrer à l'audit RGPD (agent `security-guardian`, dimension F).

## Découpage en phases

- **Phase 1 — scoring compte** : moteur `assessUserRisk` + grille gradée + champs `User` + notif email/Slack enrichie + **section « Risque » sur la fiche admin**. 100% code, aucun blocage. Tests unitaires (avcin/shawnallen → LOW, spammeurs → HIGH).
- **Phase 2 — skill `/audit-user`** : collecte partagée + prompt + sortie structurée. Mode **CLI** d'abord (le plus simple), puis **bouton admin → UI + Slack**. Validation du modèle sur les cas connus.
- **Phase 3** (option) : vue admin listant les comptes scorés, filtrable par bande, actions (ignorer / suspendre — cf. #533).

## Points ouverts (à trancher avant implémentation)

1. **Seuils d'entropie** du localpart sans flaguer les emails pro normaux (`prenom.nom42@`).
2. **Liste exacte `CORE_COUNTRIES`** (Europe : UE + EEE + UK + Suisse par défaut ?).
3. **Modèle `/audit-user`** : confirmer le défaut Sonnet après test sur les cas connus.
4. **Lien avec la suspension réversible** (#533) : l'alerte HIGH / la fiche admin / l'audit pourraient proposer un bouton « suspendre » une fois ce mécanisme en place.

## Cas de test (jeu de calibrage)

Servent à la fois à calibrer le **scoring compte** et à valider le **prompt `/audit-user`** :

- **14/06** : 3 comptes malveillants → MEDIUM/HIGH (scoring) et « à charge » (audit) ; **avcin et shawnallen → LOW / « à décharge »** (les faux positifs à ne plus reproduire).
- **22/06** : les 3 comptes (2 magic-link email louche + 1 Google OAuth « propre » mais slop). Le compte-seul classe le cas Google LOW ; c'est **l'audit de contenu** (`/audit-user`) qui doit le faire ressortir « à charge ». Test clé : prouver que l'audit contenu rattrape ce que le scoring compte rate.

## Liens

- Issue backlog : #536
- Rapport d'incident fondateur : `spec/security/2026-06-14-incident-phishing-organisateurs.md`
- Cas slop 22/06 (PII, local) : `spec/security/2026-06-22-bug-notif-publicid-manquants-krishna.md`
- Mécanisme de suspension réversible : issue #533
- Playbook d'investigation : mémoire `reference_account_investigation`
- Bug fiabilité travail différé (impacte le déclenchement des alertes) : mémoire `project_bug_notif_publicid_deferred_work`
