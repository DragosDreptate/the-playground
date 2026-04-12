# Draft — Politique de confidentialité réécrite

**Réf audit** : [F-CRIT-2]
**Statut** : DRAFT — en attente de validation avant implémentation

---

## Écarts corrigés par rapport à la version actuelle

| Problème (version actuelle) | Correction (draft) |
|---|---|
| Cite "Vercel Analytics" (non utilisé) | Remplacé par PostHog (EU) — description exacte |
| "Données anonymisées" (faux : PostHog identifie par email/nom) | Précisé "pseudonymisées" avec identification des utilisateurs connectés |
| "Aucun cookie de tracking" (faux : PostHog dépose `ph_*`) | Section cookies détaillée avec distinction nécessaires vs analytiques |
| Sous-traitants non listés | Liste exhaustive avec localisation et finalité |
| Transferts hors UE non documentés | Section dédiée distinguant siège vs hébergement réel (4 sous-traitants en UE, 4 en US) |
| Base légale non précisée par finalité | Chaque finalité a sa base légale (contrat, intérêt légitime, consentement) |
| Droit CNIL non mentionné | Ajouté avec lien cnil.fr |
| Contact = LinkedIn uniquement | Ajouté email de contact dédié |
| Délai de réponse non précisé | Précisé : 1 mois (Art. 12) |
| Pas de mention DPO | Précisé que pas de DPO (< 250 salariés) avec contact alternatif |
| "Effacement sous 30 jours" (faux : c'est immédiat) | Corrigé : effacement immédiat |

---

## Structure du draft

La nouvelle politique a 10 sections (vs 6 actuellement). Les nouvelles sections sont marquées (**NOUVEAU**).

---

## TEXTE FR

### 1. Intro (modifié)

> The Playground est édité par The Spark SASU (SIRET 93482575300015), dont le siège social est situé au 10 rue de la Paix, 75002 Paris. Nous nous engageons à protéger la vie privée de nos utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés. Cette politique décrit les données que nous collectons, les finalités de leur traitement, vos droits et les moyens de les exercer.

### 2. Responsable du traitement (**NOUVEAU**)

> Le responsable du traitement est The Spark SASU, représentée par Dragos Dreptate.
>
> Pour toute question relative à la protection de vos données personnelles, vous pouvez nous contacter :
> - Par email : privacy@the-playground.fr
> - Par courrier : The Spark SASU, 10 rue de la Paix, 75002 Paris
>
> The Spark SASU n'a pas désigné de Délégué à la Protection des Données (DPO) conformément à l'article 37 du RGPD (moins de 250 salariés, traitement non à grande échelle). Le contact ci-dessus assure cette fonction.

### 3. Données collectées (modifié)

> Nous collectons les catégories de données suivantes :
>
> **Données d'identité et de compte :**
> - Adresse email (connexion via magic link ou OAuth)
> - Prénom et nom (renseignés lors de la création du profil)
> - Photo de profil (importée depuis Google/GitHub ou uploadée manuellement)
> - Identifiant public de profil
>
> **Données d'authentification :**
> - Identifiant du compte OAuth (Google, GitHub) — uniquement pour l'authentification
> - Tokens de session (cookies de session)
>
> **Données d'utilisation du service :**
> - Communautés créées ou rejointes
> - Événements créés, inscriptions, présences
> - Commentaires publiés
> - Préférences de notification
>
> **Données de paiement (événements payants uniquement) :**
> - Les données bancaires (numéro de carte, date d'expiration, CVV) sont traitées exclusivement par Stripe et ne sont jamais stockées par The Playground
> - Nous conservons uniquement la référence de la transaction Stripe et l'URL du reçu
>
> **Données de navigation et d'analyse :**
> - Pages visitées, durée de visite, événements de navigation
> - Identifiant technique (pseudonymisé pour les visiteurs non connectés, associé au compte pour les utilisateurs connectés)
> - Données techniques : type de navigateur, système d'exploitation
>
> **Données collectées automatiquement en cas d'erreur :**
> - Traces techniques d'erreur (stack traces) pour le diagnostic et la correction de bugs

### 4. Finalités et bases légales du traitement (**NOUVEAU** — anciennement "Finalités" sans base légale)

> | Finalité | Données concernées | Base légale |
> |---|---|---|
> | Authentification et gestion de votre compte | Email, nom, prénom, identifiant OAuth, photo de profil | Exécution du contrat (Art. 6.1.b) |
> | Fourniture du service (communautés, événements, inscriptions) | Données de compte, données d'utilisation | Exécution du contrat (Art. 6.1.b) |
> | Envoi d'emails transactionnels (confirmations, rappels, annulations) | Email, prénom | Exécution du contrat (Art. 6.1.b) |
> | Envoi de notifications de la communauté (nouveaux événements, messages de l'organisateur) | Email, prénom, préférences de notification | Intérêt légitime (Art. 6.1.f) — vous pouvez vous désinscrire à tout moment depuis votre profil |
> | Traitement des paiements pour les événements payants | Référence de transaction Stripe | Exécution du contrat (Art. 6.1.b) |
> | Analyse d'utilisation et amélioration du service | Données de navigation pseudonymisées | Intérêt légitime (Art. 6.1.f) — amélioration continue du service, données hébergées en UE |
> | Diagnostic et correction de bugs | Traces d'erreur techniques | Intérêt légitime (Art. 6.1.f) — assurer la stabilité du service |

### 5. Cookies (**NOUVEAU** — section entièrement réécrite)

> **Cookies strictement nécessaires (déposés sans consentement) :**
>
> | Cookie | Finalité | Durée |
> |---|---|---|
> | `authjs.session-token` | Maintien de votre session d'authentification | 30 jours |
> | `auth-callback-url` | Redirection après connexion | 30 minutes |
>
> Ces cookies sont indispensables au fonctionnement du site. Ils ne peuvent pas être désactivés.
>
> **Cookies d'analyse :**
>
> | Cookie | Finalité | Fournisseur | Durée |
> |---|---|---|---|
> | `ph_*` | Analyse d'utilisation du service (pages visitées, parcours utilisateur) | PostHog (serveurs UE) | 1 an |
>
> Ces cookies nous permettent de comprendre comment le service est utilisé afin de l'améliorer. Les données collectées sont hébergées en Union européenne. Vous pouvez désactiver ces cookies via les paramètres de votre navigateur.
>
> **Aucun cookie publicitaire** n'est utilisé par The Playground.

### 6. Sous-traitants et destinataires des données (**NOUVEAU**)

> Vos données personnelles peuvent être transmises aux sous-traitants suivants, uniquement pour les finalités décrites ci-dessus :
>
> | Sous-traitant | Finalité | Siège | Hébergement des données | Garanties |
> |---|---|---|---|---|
> | **Vercel Inc.** | Hébergement de l'application | États-Unis | **Union européenne (Frankfurt)** | DPA Vercel, données hébergées en UE |
> | **Neon Inc.** | Hébergement de la base de données | États-Unis | **Union européenne (Frankfurt)** | DPA Neon, données hébergées en UE |
> | **PostHog Inc.** | Analyse d'utilisation du service | États-Unis | **Union européenne (eu.posthog.com)** | DPA PostHog, données hébergées en UE |
> | **Sentry (Functional Software Inc.)** | Surveillance des erreurs techniques | États-Unis | **Union européenne (Allemagne, de.sentry.io)** | DPA Sentry, données hébergées en UE |
> | **Resend Inc.** | Envoi d'emails transactionnels et de notifications | États-Unis | **États-Unis** | DPA Resend, clauses contractuelles types UE |
> | **Stripe Inc.** | Traitement des paiements (événements payants) | États-Unis | **États-Unis / Union européenne** (infrastructure globale) | Certifié PCI-DSS, DPA Stripe, clauses contractuelles types UE |
> | **Anthropic PBC** | Fonctionnalités d'intelligence artificielle (génération de descriptions) | États-Unis | **États-Unis** | DPA Anthropic, clauses contractuelles types UE |
> | **Slack (Salesforce Inc.)** | Notifications internes d'administration (nouveaux utilisateurs, nouvelles communautés) | États-Unis | **États-Unis** | DPA Slack/Salesforce, clauses contractuelles types UE |
>
> Vos données ne sont jamais vendues ni partagées avec des tiers à des fins commerciales ou publicitaires.

### 7. Transferts hors Union européenne (**NOUVEAU**)

> La majorité de nos sous-traitants hébergent vos données en Union européenne, même lorsque leur siège social est aux États-Unis :
> - **Données hébergées en UE** : Vercel (Frankfurt), Neon (Frankfurt), PostHog (UE), Sentry (Allemagne)
> - **Données hébergées aux États-Unis** : Resend (envoi d'emails), Stripe (traitement des paiements), Anthropic (fonctionnalités IA), Slack (notifications internes)
>
> Les transferts vers les États-Unis sont encadrés par :
> - Les clauses contractuelles types adoptées par la Commission européenne (décision d'exécution 2021/914)
> - Les engagements contractuels de chaque sous-traitant (Data Processing Agreements)
>
> Les données principales (base de données utilisateurs, hébergement applicatif, analytics, monitoring) sont stockées en Union européenne.

### 8. Vos droits (modifié)

> Conformément au RGPD, vous disposez des droits suivants :
>
> - **Droit d'accès** (Art. 15) : obtenir la confirmation du traitement de vos données et en recevoir une copie
> - **Droit de rectification** (Art. 16) : corriger des données inexactes ou incomplètes
> - **Droit à l'effacement** (Art. 17) : demander la suppression de vos données. Vous pouvez supprimer votre compte directement depuis votre profil (suppression immédiate et irréversible)
> - **Droit à la portabilité** (Art. 20) : recevoir vos données dans un format structuré et lisible par machine
> - **Droit d'opposition** (Art. 21) : vous opposer au traitement fondé sur l'intérêt légitime
> - **Droit de retrait du consentement** (Art. 7.3) : lorsque le traitement est fondé sur votre consentement, le retirer à tout moment sans affecter la licéité du traitement effectué avant le retrait
>
> **Pour exercer vos droits :**
> - Par email : privacy@the-playground.fr
> - Par courrier : The Spark SASU, 10 rue de la Paix, 75002 Paris
>
> Nous nous engageons à répondre à votre demande dans un délai d'un mois à compter de sa réception (Art. 12.3 RGPD).
>
> **Réclamation** : si vous estimez que le traitement de vos données constitue une violation du RGPD, vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) : www.cnil.fr.

### 9. Conservation des données (modifié)

> | Catégorie de données | Durée de conservation |
> |---|---|
> | Données de compte (email, nom, profil) | Tant que le compte est actif |
> | Données d'utilisation (inscriptions, commentaires) | Tant que le compte est actif |
> | Données de paiement (références Stripe) | 5 ans après la transaction (obligation légale comptable) |
> | Cookies d'analyse (PostHog) | 1 an maximum |
> | Traces d'erreur (Sentry) | 90 jours |
>
> En cas de suppression de votre compte, vos données personnelles sont effacées immédiatement (suppression irréversible). Les données liées à des obligations légales (références de paiement) sont conservées conformément aux durées légales applicables.

### 10. Modification de cette politique (**NOUVEAU**)

> Nous pouvons modifier cette politique pour refléter les évolutions de nos pratiques ou de la réglementation. En cas de modification substantielle, nous vous en informerons par email ou par notification sur la plateforme. La date de dernière mise à jour est indiquée en haut de cette page.

---

## TEXTE EN

### 1. Intro

> The Playground is published by The Spark SASU (SIRET 93482575300015), with registered offices at 10 rue de la Paix, 75002 Paris, France. We are committed to protecting the privacy of our users in accordance with the General Data Protection Regulation (GDPR). This policy describes the data we collect, the purposes of processing, your rights and how to exercise them.

### 2. Data controller (**NEW**)

> The data controller is The Spark SASU, represented by Dragos Dreptate.
>
> For any questions regarding the protection of your personal data, you can contact us:
> - By email: privacy@the-playground.fr
> - By mail: The Spark SASU, 10 rue de la Paix, 75002 Paris, France
>
> The Spark SASU has not appointed a Data Protection Officer (DPO) in accordance with Article 37 of the GDPR (fewer than 250 employees, no large-scale processing). The contact above fulfills this function.

### 3. Data collected

> We collect the following categories of data:
>
> **Identity and account data:**
> - Email address (sign-in via magic link or OAuth)
> - First and last name (provided during profile setup)
> - Profile picture (imported from Google/GitHub or uploaded manually)
> - Public profile identifier
>
> **Authentication data:**
> - OAuth account identifier (Google, GitHub) — for authentication only
> - Session tokens (session cookies)
>
> **Service usage data:**
> - Communities created or joined
> - Events created, registrations, attendance
> - Comments posted
> - Notification preferences
>
> **Payment data (paid events only):**
> - Payment details (card number, expiration date, CVV) are processed exclusively by Stripe and are never stored by The Playground
> - We only retain the Stripe transaction reference and receipt URL
>
> **Browsing and analytics data:**
> - Pages visited, visit duration, navigation events
> - Technical identifier (pseudonymized for non-authenticated visitors, linked to account for signed-in users)
> - Technical data: browser type, operating system
>
> **Data collected automatically in case of errors:**
> - Technical error traces (stack traces) for bug diagnosis and resolution

### 4. Purposes and legal basis (**NEW**)

> | Purpose | Data concerned | Legal basis |
> |---|---|---|
> | Authentication and account management | Email, name, OAuth identifier, profile picture | Performance of contract (Art. 6.1.b) |
> | Service delivery (Communities, Events, registrations) | Account data, usage data | Performance of contract (Art. 6.1.b) |
> | Sending transactional emails (confirmations, reminders, cancellations) | Email, first name | Performance of contract (Art. 6.1.b) |
> | Sending Community notifications (new Events, Host messages) | Email, first name, notification preferences | Legitimate interest (Art. 6.1.f) — you can unsubscribe at any time from your profile |
> | Processing payments for paid Events | Stripe transaction reference | Performance of contract (Art. 6.1.b) |
> | Usage analysis and service improvement | Pseudonymized browsing data | Legitimate interest (Art. 6.1.f) — continuous service improvement, data hosted in EU |
> | Bug diagnosis and resolution | Technical error traces | Legitimate interest (Art. 6.1.f) — ensuring service stability |

### 5. Cookies (**NEW**)

> **Strictly necessary cookies (set without consent):**
>
> | Cookie | Purpose | Duration |
> |---|---|---|
> | `authjs.session-token` | Maintaining your authentication session | 30 days |
> | `auth-callback-url` | Post-login redirect | 30 minutes |
>
> These cookies are essential for the website to function. They cannot be disabled.
>
> **Analytics cookies:**
>
> | Cookie | Purpose | Provider | Duration |
> |---|---|---|---|
> | `ph_*` | Service usage analysis (pages visited, user journeys) | PostHog (EU servers) | 1 year |
>
> These cookies help us understand how the service is used in order to improve it. Collected data is hosted in the European Union. You can disable these cookies through your browser settings.
>
> **No advertising cookies** are used by The Playground.

### 6. Sub-processors and data recipients (**NEW**)

> Your personal data may be shared with the following sub-processors, solely for the purposes described above:
>
> | Sub-processor | Purpose | Headquarters | Data hosting | Safeguards |
> |---|---|---|---|---|
> | **Vercel Inc.** | Application hosting | United States | **European Union (Frankfurt)** | Vercel DPA, data hosted in EU |
> | **Neon Inc.** | Database hosting | United States | **European Union (Frankfurt)** | Neon DPA, data hosted in EU |
> | **PostHog Inc.** | Service usage analytics | United States | **European Union (eu.posthog.com)** | PostHog DPA, data hosted in EU |
> | **Sentry (Functional Software Inc.)** | Technical error monitoring | United States | **European Union (Germany, de.sentry.io)** | Sentry DPA, data hosted in EU |
> | **Resend Inc.** | Transactional and notification emails | United States | **United States** | Resend DPA, EU standard contractual clauses |
> | **Stripe Inc.** | Payment processing (paid Events) | United States | **United States / European Union** (global infrastructure) | PCI-DSS certified, Stripe DPA, EU standard contractual clauses |
> | **Anthropic PBC** | AI features (description generation) | United States | **United States** | Anthropic DPA, EU standard contractual clauses |
> | **Slack (Salesforce Inc.)** | Internal administration notifications (new users, new Communities) | United States | **United States** | Slack/Salesforce DPA, EU standard contractual clauses |
>
> Your data is never sold or shared with third parties for commercial or advertising purposes.

### 7. Transfers outside the European Union (**NEW**)

> Most of our sub-processors host your data in the European Union, even when their headquarters are in the United States:
> - **Data hosted in EU**: Vercel (Frankfurt), Neon (Frankfurt), PostHog (EU), Sentry (Germany)
> - **Data hosted in United States**: Resend (email delivery), Stripe (payment processing), Anthropic (AI features), Slack (internal notifications)
>
> Transfers to the United States are governed by:
> - Standard contractual clauses adopted by the European Commission (implementing decision 2021/914)
> - Contractual commitments from each sub-processor (Data Processing Agreements)
>
> Core data (user database, application hosting, analytics, monitoring) is stored in the European Union.

### 8. Your rights

> Under the GDPR, you have the following rights:
>
> - **Right of access** (Art. 15): obtain confirmation of data processing and receive a copy
> - **Right to rectification** (Art. 16): correct inaccurate or incomplete data
> - **Right to erasure** (Art. 17): request deletion of your data. You can delete your account directly from your profile (immediate and irreversible deletion)
> - **Right to data portability** (Art. 20): receive your data in a structured, machine-readable format
> - **Right to object** (Art. 21): object to processing based on legitimate interest
> - **Right to withdraw consent** (Art. 7.3): where processing is based on your consent, withdraw it at any time without affecting the lawfulness of processing carried out before withdrawal
>
> **To exercise your rights:**
> - By email: privacy@the-playground.fr
> - By mail: The Spark SASU, 10 rue de la Paix, 75002 Paris, France
>
> We commit to responding to your request within one month of receipt (Art. 12.3 GDPR).
>
> **Complaint**: if you believe that the processing of your data constitutes a violation of the GDPR, you have the right to lodge a complaint with the French data protection authority (CNIL): www.cnil.fr.

### 9. Data retention

> | Data category | Retention period |
> |---|---|
> | Account data (email, name, profile) | As long as the account is active |
> | Usage data (registrations, comments) | As long as the account is active |
> | Payment data (Stripe references) | 5 years after the transaction (legal accounting obligation) |
> | Analytics cookies (PostHog) | 1 year maximum |
> | Error traces (Sentry) | 90 days |
>
> When you delete your account, your personal data is erased immediately (irreversible deletion). Data related to legal obligations (payment references) is retained in accordance with applicable legal requirements.

### 10. Changes to this policy (**NEW**)

> We may update this policy to reflect changes in our practices or regulations. In the event of a substantial change, we will notify you by email or by notification on the platform. The date of the last update is indicated at the top of this page.

---

## Décisions prises (2026-04-01)

| # | Question | Décision |
|---|---|---|
| 1 | Email de contact RGPD | `privacy@the-playground.fr` — existe déjà |
| 2 | Slack et PII | Ajouter Slack comme sous-traitant (transparent) |
| 3 | Vercel Blob | Couvert par "Vercel Inc." (même entité juridique) |
| 4 | Durée conservation réfs Stripe | 5 ans |
| 5 | Bannière cookies | Pas de bannière pour l'instant — politique mise à jour sans mention de bannière. Analytics fondé sur l'intérêt légitime (Art. 6.1.f) |
| 6 | `@vercel/analytics` | À supprimer du `package.json` (installé mais jamais importé) |

### Action restante hors politique
- [ ] Supprimer `@vercel/analytics` du `package.json` (point 6)
