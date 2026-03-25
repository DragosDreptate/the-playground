# Feature : événements payants (Stripe Connect)

> **Statut** : exploration / design
> **Date** : 2026-03-19

## Contexte

The Playground est 100% gratuit — 0% commission plateforme. Les Organisateurs peuvent créer des événements payants, et l'intégralité du montant (moins les frais Stripe) leur est reversée.

## Fondations existantes dans le codebase

Le modèle de données est déjà partiellement prêt :

| Élément | Emplacement | Détail |
| --- | --- | --- |
| `Moment.price` | Schema Prisma + domain model | `Int`, en centimes, défaut 0 |
| `Moment.currency` | Schema Prisma + domain model | `String`, défaut `"EUR"` |
| `Registration.paymentStatus` | Schema Prisma + domain model | Enum `NONE / PENDING / PAID / REFUNDED` |
| `Registration.stripePaymentIntentId` | Schema Prisma + domain model | `String?`, nullable |
| `Circle.stripeConnectAccountId` | Schema Prisma + domain model | `String?`, nullable |
| Guard métier | `join-moment` usecase | `PaidMomentNotSupportedError` si `price > 0` |
| UI formulaire création | `moment-form-options-section.tsx` | Input prix désactivé + tooltip "bientôt" |
| UI bouton inscription | `registration-button.tsx` | Bouton désactivé pour `price > 0` |

### Changements de schema nécessaires

| Modèle | Champ | Type | Description |
| --- | --- | --- | --- |
| `Moment` | `refundable` | `Boolean @default(true)` | L'Organisateur choisit si les désinscriptions sont remboursées |
| `Registration` | `stripeReceiptUrl` | `String?` | URL du reçu Stripe, stockée au moment du webhook |

**Ce qui manque** : port `PaymentService`, adapter Stripe, dépendance `stripe`, variables d'env, webhooks, usecases de paiement.

## Modèle Stripe Connect

### Les 3 acteurs

| Acteur | Compte Stripe | Qui le crée |
| --- | --- | --- |
| **The Playground** (plateforme) | Compte plateforme | Le propriétaire, une seule fois sur stripe.com |
| **L'Organisateur** | Compte connecté Express | Créé automatiquement via l'API, rattaché à la plateforme |
| **Le Participant** | Aucun | Paie par CB via Stripe Checkout |

### Type de compte Connect : Express (MVP)

| Type | Principe | Statut |
| --- | --- | --- |
| **Express** | Compte léger hébergé sous la plateforme, mini-dashboard, Stripe gère le KYC | **Choix MVP** |
| Standard | L'Organisateur utilise son propre compte Stripe complet (OAuth) | Post-MVP si demandé |
| Custom | La plateforme gère tout (KYC, dashboard, payouts) | Hors scope |

**Cas d'un Organisateur ayant déjà un compte Stripe** : il doit quand même passer par l'onboarding Express (compte séparé, rattaché à la plateforme). Stripe pré-remplit les infos s'il détecte le même email. Le mode Standard (OAuth vers compte existant) est une évolution possible post-MVP.

### Type de charge : Destination charges

```
Participant paie 15€
  → Stripe reçoit 15€
  → Frais Stripe : ~0,73€ (2.9% + 0,30€)
  → Commission The Playground : 0€
  → Versé à l'Organisateur : ~14,27€ (virement IBAN, 2-7 jours)
```

Destination charges (vs. Direct charges) : le paiement passe par la plateforme puis est reversé. Permet d'ajouter une commission plateforme à terme (Plan Pro) sans changer l'architecture.

## Parcours utilisateurs

### Organisateur — onboarding Stripe

1. Paramètres de la Communauté → bouton "Activer les paiements"
2. Appel API : `stripe.accounts.create({ type: "express" })` → crée un compte connecté
3. Appel API : `stripe.accountLinks.create({ account: "acct_xxx", ... })` → URL d'onboarding
4. Redirection vers la page Stripe (formulaire hébergé : nom, adresse, IBAN, pièce d'identité)
5. Stripe gère le KYC (vérification d'identité)
6. Retour sur The Playground → `stripeConnectAccountId` sauvegardé sur le Circle
7. L'Organisateur peut maintenant définir un prix sur ses événements

**Onboarding abandonné** : statut `pending` sur le Circle, bouton "Reprendre l'activation" visible. Lien discret "Annuler l'activation" sous le message pending — remet `stripeConnectAccountId` à null et revient à l'état initial "Activer les paiements".

### Participant — paiement

**Pré-requis** : le Participant doit être **authentifié** avant d'être redirigé vers Stripe Checkout. C'est cohérent avec le flux gratuit (l'inscription nécessite déjà une auth). Le `userId` est passé dans les metadata de la Checkout Session pour associer le paiement au bon utilisateur dans le webhook.

1. Page événement → bouton "S'inscrire — 15,00 €"
2. Le Participant est authentifié (magic link / OAuth si pas connecté)
3. Server Action crée une Stripe Checkout Session (destination charge, metadata: `userId`, `momentId`, `circleId`, expiration: 15 minutes)
4. Redirection vers Stripe Checkout (page hébergée Stripe)
5. Le Participant entre sa CB et paie
6. Stripe envoie le webhook `checkout.session.completed`
7. Webhook handler crée la `Registration` avec `paymentStatus: PAID`, `stripePaymentIntentId`, `stripeReceiptUrl`
8. Inscription automatique au Circle (comme pour un événement gratuit)
9. Email de confirmation envoyé (avec lien vers le reçu Stripe)
10. Stripe redirige le Participant vers `/m/[slug]?payment=success`

**Page de retour `?payment=success`** : pas de banner dédié — le webhook traite le paiement avant le redirect, donc le Participant voit directement l'état "Vous participez à cet événement" avec les boutons calendrier. Le banner optimiste initialement prévu a été retiré car redondant avec l'état d'inscription qui s'affiche déjà.

**Abandon Stripe Checkout** : le Participant ferme l'onglet ou clique "Retour" → Stripe redirige vers `/m/[slug]?payment=cancelled`. On affiche la page événement normalement, pas de message d'erreur. Le Participant peut réessayer. Pas de Registration créée, pas de place réservée. La Checkout Session expire automatiquement après 30 minutes (minimum imposé par Stripe, initialement prévu à 15 minutes).

### Remboursement

**Nouveau champ** : `refundable: Boolean @default(true)` sur `Moment`. L'Organisateur choisit à la création de l'événement.

#### Règles de remboursement

| Situation | Événement remboursable | Événement non remboursable |
| --- | --- | --- |
| **Participant se désinscrit** | Remboursement auto | Pas de remboursement (désinscription autorisée avec avertissement) |
| **Organisateur annule l'événement** | Remboursement auto | Remboursement auto (toujours, quel que soit le réglage) |

- Remboursement total uniquement (pas de remboursement partiel au MVP)
- Via `stripe.refunds.create()` → `paymentStatus` passe à `REFUNDED`
- Le champ `refundable` ne s'applique qu'aux désinscriptions volontaires des Participants
- **UX non remboursable** : le Participant peut toujours se désinscrire, mais une modale de confirmation l'avertit explicitement : "Cet événement n'est pas remboursable. Vous ne serez pas remboursé." Sa place est libérée pour quelqu'un d'autre.

### Politique de remboursement (prévention disputes)

La politique de remboursement est communiquée via :
- **Modale de désinscription** : avertissement amber si événement non remboursable + PAID ("Cet événement n'est pas remboursable. Vous ne serez pas remboursé.")
- **Page CGU** : section "Paiements et transactions" détaillant les règles de remboursement
- **Note** : la mention sur la page événement publique a été retirée (redondante avec les stats du bloc Participants). À revoir dans un redesign global du bloc CTA + Participants (dédupliquer les infos).

### Disputes (décision MVP)

Pas de code custom au MVP. Les disputes sont rares pour des événements communautaires, et avec les destination charges, c'est le compte Connect de l'Organisateur qui est débité (pas la plateforme). L'Organisateur gère les éventuelles disputes dans son dashboard Stripe Express.

Post-MVP : webhook `charge.dispute.created` → email de notification à l'Organisateur + envoi automatique de preuves (infos d'inscription) à Stripe.

### Obligations légales — CGU et mentions paiement (décision MVP)

The Playground est **intermédiaire technique**, pas vendeur. La relation commerciale est entre l'Organisateur et le Participant.

#### Ce qu'il faut en place au MVP

1. **Page CGU** (ou mise à jour si existante) avec une section "Paiements" couvrant :
  - The Playground facilite la transaction mais n'est pas le vendeur
  - Les seuls frais prélevés sont ceux de Stripe (~2.9% + 0,30€), supportés par l'Organisateur. The Playground ne prend aucune commission
  - Politique de remboursement : deux cas selon le choix de l'Organisateur (remboursable ou non). Remboursement systématique en cas d'annulation par l'Organisateur
  - Les données bancaires sont traitées par Stripe, jamais stockées par The Playground
  - En cas de litige : contacter l'Organisateur. En dernier recours, contestation via sa banque
2. **Mention de politique de remboursement sur la page événement** (déjà décidé, section ci-dessus)
3. **Lien vers les CGU dans le Stripe Checkout** (option native Stripe)

#### Ce que l'Organisateur accepte à l'activation de Stripe Connect

- Les conditions Stripe (géré par Stripe dans le formulaire d'onboarding)
- La responsabilité de ses remboursements et disputes
- Que The Playground n'est pas partie à la transaction

#### Ce qui n'est PAS nécessaire

- **CGV** (Conditions Générales de Vente) — The Playground ne vend rien
- Rédaction juridique formelle — une page en langage clair suffit pour le lancement. Relecture juriste recommandée pré-lancement.

### Dashboard paiements Organisateur (décision MVP)

Le détail par événement est dans The Playground. La vue comptable globale est dans Stripe.

#### Page de gestion d'un événement (résumé billetterie)

Calculé depuis nos données (Registration), pas d'appel API Stripe :
- Nombre d'inscrits payants
- Montant total collecté (brut, avant frais Stripe — mention "avant frais Stripe" visible)
- Nombre de remboursés

#### Paramètres de la Communauté (lien Stripe)

- Statut Stripe (activé / en cours d'activation)
- Bouton "Voir tous mes paiements sur Stripe" → `stripe.accounts.createLoginLink()` → Express Dashboard

#### Ce qu'on ne construit PAS au MVP

- Dashboard paiements custom dans The Playground
- Export comptable CSV (post-MVP, via API Stripe)

### Notifications email — événements payants (décision MVP)

Pas de nouveaux templates. On enrichit les emails existants avec des mentions conditionnelles.

**Nouveau champ** : `stripeReceiptUrl: String?` sur `Registration` — stocké au moment du webhook, inclus dans l'email de confirmation.

#### Côté Participant

| Déclencheur | Contenu ajouté (vs. événement gratuit) |
| --- | --- |
| Paiement réussi | "Paiement confirmé — 15,00 €" + lien "Voir mon reçu" (`stripeReceiptUrl`) |
| Désinscription (événement remboursable) | "Vous serez remboursé de 15,00 € sous 5-10 jours" |
| Désinscription (événement non remboursable) | "Conformément à la politique de l'événement, aucun remboursement n'est effectué" |
| Annulation par l'Organisateur | "Vous serez remboursé de 15,00 € sous 5-10 jours" |
| Rappel 24h/1h | Aucune différence |

#### Côté Organisateur

Pas d'email par transaction (trop de bruit). L'Organisateur a le résumé billetterie dans la gestion de l'événement et le détail dans Stripe Express.

#### Reçu Stripe

Stripe envoie automatiquement un reçu par email au Participant (comportement par défaut, zéro code). En complément, on inclut le lien du reçu Stripe dans notre propre email de confirmation :
```typescript
const charge = await stripe.charges.retrieve(paymentIntent.latest_charge)
const receiptUrl = charge.receipt_url // → "https://pay.stripe.com/receipts/..."
```

## Règles métier — événements payants

### Authentification obligatoire

Le Participant doit être authentifié avant d'être redirigé vers Stripe Checkout. Le `userId` est passé dans les metadata de la Checkout Session.

### Prix minimum

`price === 0` (gratuit) ou `price >= 50` (minimum 0,50 € — imposé par Stripe). Rien entre les deux. Validation côté usecase + formulaire UI.

### Pas de liste d'attente sur les événements payants (décision MVP)

**Règle** : `if (moment.price > 0) → pas de waitlist`. Complet = complet.

**Pourquoi** :
- La waitlist + paiement crée une complexité disproportionnée : quand faire payer le promu ? Que faire s'il ne paie pas ? Délai d'expiration ? Cascade au suivant ? Timer ? Cron job ?
- Chaque cas nécessite des états supplémentaires (`PENDING_PAYMENT`, `PAYMENT_EXPIRED`), des usecases dédiés, des emails, des edge cases
- Du point de vue Participant : quand tu paies, tu veux ta place **maintenant**, pas "peut-être dans 3 jours"

**Conséquence sur l'UX** :
- Événement **gratuit** → inscription directe + waitlist si complet (comportement actuel)
- Événement **payant** → paiement Stripe → inscription. Complet = bouton désactivé, pas de waitlist

**Évolution possible post-MVP** : mode pré-autorisation (bloquer le montant sur la CB sans débiter, débiter à la promotion). Uniquement si demandé par des Organisateurs.

### Verrouillage du prix et transitions gratuit ↔ payant

Le prix et la nature (gratuit/payant) d'un événement sont modifiables librement tant qu'il n'y a aucune inscription. Dès la première inscription, des règles de verrouillage s'appliquent :

| Transition | Pas d'inscrits | Inscrits existants |
| --- | --- | --- |
| Gratuit → payant | **Autorisé** | **Interdit** — "Impossible, des Participants sont déjà inscrits" |
| Payant → gratuit | **Autorisé** | **Autorisé** — remboursement auto de tous les `PAID` |
| Payant → payant (changement de prix) | **Autorisé** | **Interdit** — prix verrouillé après le premier paiement |

L'Organisateur peut définir un prix dès le stade DRAFT. Le verrouillage ne s'applique qu'à partir de la première inscription (qui ne peut arriver qu'après publication).

### Événement payant sans Stripe Connect activé

L'input prix est **désactivé tant que Stripe Connect n'est pas activé** sur la Communauté. Tooltip : "Activez les paiements dans les paramètres de votre Communauté pour proposer des événements payants." Validation côté serveur en plus pour bloquer toute tentative.

### Expiration de la Checkout Session

La Checkout Session expire après **30 minutes** (`expires_at: 30 * 60` — minimum imposé par Stripe, initialement prévu à 15 minutes). Pendant ce temps, la place n'est pas réservée — si l'événement se remplit entre le clic et le paiement, le webhook vérifie les places et rembourse automatiquement si full (voir section Risques).

### Affichage du prix (décision)

**Principe : le Participant paie exactement le prix affiché.** Les frais Stripe sont déduits côté Organisateur.

#### Qui paie les frais Stripe ?

```
Participant paie 15,00 €  (prix affiché)
  → Frais Stripe déduits : ~0,73 €  (2.9% + 0,30 €)
  → Organisateur reçoit : ~14,27 €
```

L'Organisateur absorbe les frais. Le Participant n'a jamais de surprise.

#### Affichage par écran

| Endroit | Affichage |
| --- | --- |
| Page événement — bouton CTA | **"S'inscrire — 15,00 €"** |
| Page événement — détails | Mention "Prix TTC. Pas de frais supplémentaires." + politique de remboursement |
| Stripe Checkout | 15,00 € (géré par Stripe) |
| Email de confirmation | "Vous avez payé 15,00 € pour [événement]" + lien reçu Stripe |
| Formulaire création (Organisateur) | Input en euros + info : "Vous recevrez ~14,27 € après frais Stripe (2.9% + 0,30 €)" |

#### Règles

- Prix affiché = prix payé, toujours
- Mention **"TTC"** à côté du prix (obligation légale B2C France)
- Pas de gestion TVA côté plateforme — responsabilité de l'Organisateur
- Format : `Intl.NumberFormat` avec locale + currency du Moment (EUR par défaut)
- Toujours afficher les centimes (15,00 €, pas 15 €)
- Côté Organisateur : montant net estimé visible sous l'input prix

## Architecture hexagonale

### Nouveaux fichiers

```
src/domain/ports/services/payment-service.ts          ← Interface
src/infrastructure/services/stripe-payment-service.ts  ← Adapter

src/domain/usecases/
  create-checkout-session.ts
  handle-payment-webhook.ts
  refund-registration.ts
  onboard-stripe-connect.ts

src/app/api/stripe/webhook/route.ts                    ← POST handler webhook
```

### Port PaymentService

```typescript
interface PaymentService {
  createConnectAccount(circle: Circle): Promise<{ accountId: string }>
  createOnboardingLink(accountId: string, returnUrl: string): Promise<{ url: string }>
  createLoginLink(accountId: string): Promise<{ url: string }>
  getConnectAccountStatus(accountId: string): Promise<ConnectAccountStatus>
  createCheckoutSession(params: {
    moment: Moment
    user: User
    circle: Circle
    successUrl: string
    cancelUrl: string
  }): Promise<{ url: string; sessionId: string }>
  handleWebhookEvent(payload: string, signature: string): Promise<PaymentEvent>
  refund(paymentIntentId: string): Promise<void>
}

type ConnectAccountStatus = "pending" | "active" | "restricted" | "disabled"

type PaymentEvent =
  | {
      type: "checkout_completed"
      userId: string
      momentId: string
      circleId: string
      paymentIntentId: string
      receiptUrl: string
    }
  | { type: "charge_refunded"; paymentIntentId: string }
  | { type: "unknown" }
```

### Metadata Checkout Session

Metadata obligatoires passées à Stripe lors de la création de la Checkout Session, récupérées dans le webhook :

```typescript
metadata: {
  userId: string    // Associer le paiement au bon utilisateur
  momentId: string  // Associer le paiement au bon événement
  circleId: string  // Pour l'inscription automatique au Circle
}
```

### Flux technique — inscription payante

```
Participant clique "S'inscrire — 15,00 €"
  → Vérifie : Participant est authentifié (sinon → auth flow)
  → Server Action: createCheckoutSession
    → Vérifie : Circle a un stripeConnectAccountId
    → Vérifie : Moment est PUBLISHED
    → Vérifie : places disponibles
    → PaymentService.createCheckoutSession() → Stripe Checkout URL
      (metadata: userId, momentId, circleId — expiration: 15 min)
  → Redirect vers Stripe Checkout

Stripe Checkout réussi
  → POST /api/stripe/webhook (checkout.session.completed)
    → Vérifie signature Stripe
    → handlePaymentWebhook usecase
      → Vérifie idempotence (stripePaymentIntentId déjà en DB ?)
      → Vérifie places disponibles (si full → remboursement auto + email)
      → Crée Registration (paymentStatus: PAID, stripePaymentIntentId, stripeReceiptUrl)
      → Inscrit au Circle (si pas déjà membre)
      → Envoie email de confirmation (avec lien reçu Stripe)
  → Stripe redirige vers /m/[slug]?payment=success

Stripe Checkout abandonné
  → Stripe redirige vers /m/[slug]?payment=cancelled
  → Page événement affichée normalement, pas de message d'erreur
  → Session expire après 15 min
```

## Risques et mitigations

| Risque | Impact | Mitigation |
| --- | --- | --- |
| **Double inscription** (webhook reçu 2x) | Registration dupliquée | Idempotence : vérifier `stripePaymentIntentId` unique avant création |
| **Webhook manqué** | Participant a payé mais pas inscrit | Stripe retry (72h) + page "vérifier mon paiement" + réconciliation manuelle |
| **Race condition places** (full entre clic et paiement) | Participant paie pour un événement full | Vérifier places dans le webhook. Si full → remboursement auto + email d'excuse |
| **Latence webhook** (retour `?payment=success` avant webhook traité) | Participant ne voit pas son inscription | Banner optimiste statique sur `?payment=success`. Pas de polling. Le Participant recharge si besoin. L'email de confirmation arrive de toute façon. |
| **Onboarding Connect abandonné** | Organisateur bloqué | Statut `pending`, bouton "Reprendre l'activation" |
| **Dispute / contestation** | Perte financière Organisateur | Politique de remboursement visible sur la page événement (prévention). Gestion dans le dashboard Stripe Express (pas de code custom MVP) |
| **KYC Stripe bloqué** | Compte Organisateur restreint | Informer l'Organisateur des exigences, statut visible dans le dashboard |

## Stratégie de tests

### Tests unitaires (domaine)

Mock du port `PaymentService`. Pas de dépendance Stripe. Couvre les usecases :
- `create-checkout-session` : vérifications métier (Circle a un compte Stripe, Moment publié, places dispo, auth obligatoire)
- `handle-payment-webhook` : création Registration, inscription Circle, idempotence, race condition places
- `refund-registration` : remboursement conditionnel selon `refundable`
- `onboard-stripe-connect` : création compte, gestion des statuts
- Validation prix : `price === 0 || price >= 50`, transitions gratuit ↔ payant, verrouillage après inscription

### Tests d'intégration (adapter Stripe)

API Stripe en mode test (`sk_test_...`). Vérifie que l'adapter respecte le contrat du port.

Variables d'env :

| Variable | Dev (`.env.local`) | Tests (`.env.test`) | Prod (Vercel) |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | — | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (Stripe CLI) | — | `whsec_...` (dashboard) |

### Tests E2E (Playwright)

Pas de dépendance Stripe Checkout (page externe, non contrôlable). Deux stratégies :
- **Mock du redirect** : vérifier qu'on redirige vers Stripe Checkout avec les bons paramètres
- **Simulation webhook** : appeler directement `POST /api/stripe/webhook` avec un payload simulé pour tester le flux post-paiement

### Dev manuel — Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

CB de test : `4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refusé), `4000 0000 0000 3220` (3D Secure).

Simuler un événement : `stripe trigger checkout.session.completed`

## Périmètre MVP vs. Post-MVP

### MVP

- Stripe Checkout hébergé (pas d'Elements custom)
- Destination charges avec 0% application fee
- EUR uniquement
- Comptes Express uniquement
- Remboursement total uniquement
- Un seul prix par événement
- **Pas de liste d'attente sur les événements payants**
- **Codes de réduction** via Stripe Promotion Codes natif (`allow_promotion_codes: true`)
- Checkout Session expire après 15 minutes
- Authentification obligatoire avant paiement

### Post-MVP

- Stripe Elements embedded (formulaire dans la page)
- Application fee configurable (Plan Pro)
- Multi-devise
- Comptes Standard (OAuth vers compte Stripe existant)
- Remboursement partiel
- Pré-autorisation pour la liste d'attente (événements payants)
- UI de gestion des codes promo dans The Playground (via API Stripe Coupons)
- Factures automatiques
- Plusieurs catégories de billets (Early Bird, VIP, Standard — modèle `TicketType`)
- Webhook `charge.dispute.created` → notification Organisateur

## Décisions prises

- [x] **Liste d'attente + paiement** → pas de waitlist sur les événements payants (MVP)
- [x] **Remboursements** → champ `refundable` (booléen) sur Moment. Remboursable = remboursement auto à la désinscription. Non remboursable = désinscription possible avec avertissement, pas de remboursement. Annulation Organisateur = toujours remboursé.
- [x] **Disputes** → pas de code custom au MVP. Politique de remboursement visible sur la page événement (prévention). Gestion dans le dashboard Stripe Express. Post-MVP : webhook notification.
- [x] **Affichage du prix** → prix affiché = prix payé (TTC). Frais Stripe déduits côté Organisateur. Montant net estimé visible dans le formulaire de création.
- [x] **Dashboard Organisateur** → résumé billetterie (inscrits, montant brut, remboursés) par événement dans The Playground. Lien vers Stripe Express Dashboard dans les paramètres de la Communauté. Pas de dashboard paiements custom au MVP.
- [x] **Notifications** → pas de nouveaux templates. Mentions conditionnelles dans les emails existants (montant payé + lien reçu Stripe, remboursement, non-remboursement). Nouveau champ `stripeReceiptUrl` sur Registration. Pas d'email Organisateur par transaction.
- [x] **Tests** → unitaire = mock du port PaymentService. Intégration = API Stripe mode test. E2E = mock du redirect + simulation webhook. Dev manuel = Stripe CLI.
- [x] **Codes de réduction** → `allow_promotion_codes: true` sur Stripe Checkout. Zéro code côté The Playground. L'Organisateur crée ses codes dans son dashboard Stripe Express (supporte -100% pour invitations gratuites). UI de gestion dans The Playground = post-MVP.
- [x] **Plusieurs types de billets** → un seul prix par événement au MVP. Les codes promo couvrent les cas simples (early bird, tarif réduit). Multi-catégories (modèle `TicketType`) = post-MVP.
- [x] **Authentification** → obligatoire avant le redirect vers Stripe Checkout. `userId` passé dans les metadata.
- [x] **Prix minimum** → `price === 0` (gratuit) ou `price >= 50` (0,50 € minimum Stripe). Validation usecase + formulaire UI.
- [x] **Verrouillage du prix** → libre tant qu'aucune inscription. Après la première inscription : gratuit → payant interdit, payant → gratuit autorisé (remboursement auto), changement de prix interdit.
- [x] **Expiration Checkout Session** → 30 minutes (minimum Stripe, initialement prévu 15 min).
- [x] **Stripe Connect non activé** → input prix désactivé avec tooltip. Validation serveur en plus.
- [x] **Metadata Checkout Session** → `userId`, `momentId`, `circleId` obligatoires.
- [x] **Résumé billetterie** → montant brut (avant frais Stripe), mention visible.
- [x] **Page `?payment=success`** → pas de banner dédié. Le webhook traite avant le redirect, l'état "inscrit" s'affiche directement.
- [x] **Onboarding abandonné** → lien "Annuler l'activation" sous le message pending. Reset le `stripeConnectAccountId` à null.
- [x] **Politique de remboursement page publique** → retirée (redondante). Couverte par la modale de désinscription + CGU. À revoir dans un redesign global CTA + Participants.

## Plan d'implémentation

> **Stratégie de branche** : feature branch `feat/stripe-connect` créée depuis main. Chaque phase = une PR mergée dans `feat/stripe-connect` (pas dans main). À la fin, une seule PR `feat/stripe-connect` → main = MEP. Pas de mise en production intermédiaire. Chaque PR doit néanmoins être testable indépendamment.

### Vue d'ensemble

9 phases (= 9 PRs), des fondations vers l'UI. Phases 1 et 2 parallélisables.

```
Phase 1 (Port + Adapter)     ──┐
                                ├──→ Phase 3 (Onboarding Connect)
Phase 2 (Schema + Models)    ──┘    │
                               └────┤
                                    Phase 3bis (UI formulaire prix + refundable, create + edit)
                                         │
                                    Phase 4a (Checkout + redirect + UI bouton)
                                         │
                                    Phase 4b (Webhook + inscription + banner success)
                                         │
                                    Phase 5 (Remboursement + modale non-remboursable)
                                         │
                                    Phase 6 (Verrouillage prix + politique page publique)
                                         │
                                    Phase 7 (Enrichissement emails + résumé billetterie + CGU)
                                         │
                                    Phase 8 (Tests E2E intégration Stripe — validation pré-MEP)
```

### Phase 1 — Port PaymentService + adapter Stripe

**Objectif** : poser les fondations hexagonales. Zéro impact sur l'existant.

**Dépend de** : rien

**Fichiers à créer** :
- `src/domain/ports/services/payment-service.ts` — interface + types (`ConnectAccountStatus`, `PaymentEvent`)
- `src/infrastructure/services/stripe/stripe-payment-service.ts` — implémentation Stripe
- `src/domain/usecases/__tests__/helpers/mock-payment-service.ts` — mock pour tests unitaires

**Fichiers à modifier** :
- `package.json` — ajouter `stripe`

**Tests** : le port compile, l'adapter compile, le mock respecte l'interface.

**Critère de validation** : aucun changement de comportement observable. Code mort tant que les usecases ne l'utilisent pas.

**Complexité** : moyenne | **Risque** : faible

---

### Phase 2 — Schema Prisma + domain models

**Objectif** : ajouter `refundable` sur Moment et `stripeReceiptUrl` sur Registration.

**Dépend de** : rien (parallélisable avec Phase 1)

**Fichiers à modifier** :
- `prisma/schema.prisma` — 2 champs
- `src/domain/models/moment.ts` — ajouter `refundable: boolean`
- `src/domain/models/registration.ts` — ajouter `stripeReceiptUrl: string | null`
- Repositories Prisma (mapping des nouveaux champs)
- Helpers de test (valeurs par défaut dans `makeMoment`, `makeRegistration`)

**Tests** : tous les tests existants passent (valeurs par défaut rétro-compatibles).

**Critère de validation** : `pnpm db:push` dev + prod OK. Tests green.

**Complexité** : faible | **Risque** : faible

---

### Phase 3 — Onboarding Stripe Connect (Organisateur)

**Objectif** : un Organisateur peut activer les paiements sur sa Communauté.

**Dépend de** : Phase 1 uniquement. Phase 3 utilise `circle.stripeConnectAccountId` qui existe déjà dans le schema — pas besoin de Phase 2.

**Fichiers à créer** :
- `src/domain/usecases/onboard-stripe-connect.ts` + tests
- `src/domain/usecases/get-stripe-connect-status.ts` + tests
- `src/app/actions/stripe.ts` — server actions (`onboardStripeConnectAction`, `getStripeLoginLinkAction`)
- `src/app/api/stripe/connect/callback/route.ts` — route GET de retour après onboarding
- `src/components/circles/stripe-connect-section.tsx` — UI (bouton "Activer les paiements" / "Reprendre l'activation" / statut / lien Express Dashboard)

**Fichiers à modifier** :
- Page edit du Circle — ajouter `<StripeConnectSection>`
- Erreurs domaine — ajouter `StripeConnectNotActiveError`

**Variables d'env** : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

**Tests** :
- Unitaires : Circle sans compte, Circle avec compte pending, Circle déjà actif
- E2E : vérifier que le bouton apparaît dans la page edit (pas de test du flux Stripe externe)

**Critère de validation** : un Organisateur peut cliquer "Activer les paiements", être redirigé vers Stripe, revenir, voir "Activé" + lien Express Dashboard.

**Complexité** : moyenne-haute | **Risque** : moyen

---

### Phase 3bis — UI formulaire prix + toggle refundable

**Objectif** : l'Organisateur peut définir un prix et le caractère remboursable lors de la création et l'édition d'un événement. L'input prix est conditionné à l'activation de Stripe Connect sur la Communauté.

**Dépend de** : Phase 2 (champ `refundable` dans le schema/model), Phase 3 (statut `stripeConnectActive` pour conditionner l'input)

**Fichiers à modifier** :
- `src/components/moments/moment-form-options-section.tsx` — remplacer le tooltip "bientôt" par un vrai input prix (saisie en euros, conversion centimes). Conditionné à `stripeConnectActive` (sinon désactivé + tooltip "Activez les paiements dans les paramètres de votre Communauté"). Toggle `refundable` (switch, visible uniquement si prix > 0). Estimation montant net sous l'input ("Vous recevrez ~14,27 € après frais Stripe").
- `src/components/moments/moment-form.tsx` — props `stripeConnectActive`, champ `refundable` dans le FormData
- `src/domain/usecases/create-moment.ts` — validation prix (`price === 0 || price >= 50`), ajouter `refundable` dans l'input. Validation serveur : prix > 0 interdit si Circle n'a pas de `stripeConnectAccountId`.
- `src/domain/usecases/update-moment.ts` — même validation prix. Édition du prix libre (pas de verrouillage à ce stade — Phase 6).
- `src/domain/usecases/__tests__/create-moment.test.ts` — tests validation prix (0 OK, 1-49 rejeté, 50+ OK, prix > 0 sans Stripe Connect rejeté)
- `src/domain/usecases/__tests__/update-moment.test.ts` — tests édition prix
- `src/app/actions/moment.ts` — lire `refundable` et `price` depuis le formulaire
- Clés i18n FR/EN (prix, estimation net, tooltip, refundable)

**Tests** :
- Unitaires : validation prix min, prix sans Stripe Connect, refundable par défaut true
- E2E : créer un événement payant (vérifier que le prix est sauvegardé), modifier le prix, vérifier l'estimation du montant net

**Critère de validation** : un Organisateur avec Stripe Connect actif peut créer et éditer un événement avec un prix. L'input est désactivé sans Stripe Connect. La validation rejette les prix entre 1 et 49 centimes.

**Complexité** : moyenne | **Risque** : faible

---

### Phase 4a — Checkout (redirect vers Stripe)

**Objectif** : un Participant peut cliquer "S'inscrire — 15,00 €" et être redirigé vers Stripe Checkout.

**Dépend de** : Phase 1 (PaymentService), Phase 3 (stripeConnectAccountId), Phase 3bis (événements payants existent en DB)

**Pourquoi Phase 3bis est nécessaire** : sans Phase 3bis, aucun événement payant ne peut exister en DB (l'UI ne permet pas de définir un prix). Le bouton "S'inscrire — XX,XX €" n'aurait rien à afficher.

**Fichiers à créer** :
- `src/domain/usecases/create-checkout-session.ts` + tests
- `src/app/actions/checkout.ts` — server action `createCheckoutAction`

**Fichiers à modifier** :
- `src/components/moments/registration-button.tsx` — bifurcation : si `price === 0` → flux gratuit existant (`joinMoment`). Si `price > 0` → CTA "S'inscrire — XX,XX €" qui appelle `createCheckoutAction` et redirige. Pas de waitlist affichée si `price > 0` et complet (juste "Complet"). Le usecase `join-moment.ts` n'est **pas modifié** — le bouton UI choisit le bon flux.
- `src/app/[locale]/(routes)/m/[slug]/page.tsx` — lire `?payment=cancelled`, afficher la page normalement

**Règles métier dans le usecase \****`create-checkout-session`** :
- Participant authentifié
- Circle a un `stripeConnectAccountId` actif
- Moment est `PUBLISHED`
- `price > 0` (sinon erreur — le flux gratuit passe par `joinMoment`)
- Places disponibles (pas de fallback waitlist)
- Participant pas déjà inscrit
- `allow_promotion_codes: true` dans la Checkout Session
- `expires_after_minutes: 15`
- Metadata : `userId`, `momentId`, `circleId`
- `success_url: /m/[slug]?payment=success`
- `cancel_url: /m/[slug]?payment=cancelled`

**Tests** :
- Unitaires (8+ cas) : pas de compte Connect, moment pas publié, complet (pas de waitlist), déjà inscrit, prix = 0 (rejeté), succès
- E2E : intercepter le redirect, vérifier que l'URL contient `checkout.stripe.com`. Retour `?payment=cancelled` affiche la page normalement.

**Critère de validation** : le clic sur un événement payant redirige vers Stripe Checkout avec les bons paramètres.

**Complexité** : moyenne | **Risque** : moyen

---

### Phase 4b — Webhook (inscription après paiement)

**Objectif** : recevoir le webhook Stripe `checkout.session.completed`, créer la Registration, inscrire au Circle.

**Dépend de** : Phase 4a

**Fichiers à créer** :
- `src/domain/usecases/handle-payment-webhook.ts` + tests
- `src/app/api/stripe/webhook/route.ts` — POST handler

**Fichiers à modifier** :
- `src/domain/ports/repositories/registration-repository.ts` — ajouter `findByStripePaymentIntentId(paymentIntentId: string)` pour la vérification d'idempotence
- `src/infrastructure/repositories/prisma-registration-repository.ts` — implémenter
- `src/app/[locale]/(routes)/m/[slug]/page.tsx` — lire `?payment=success`, afficher un banner optimiste statique ("Votre inscription est confirmée !"). Pas de polling — le Participant recharge si besoin.

**Variables d'env** : `STRIPE_WEBHOOK_SECRET`

**Points d'attention** :
- **Raw body** : la route webhook doit utiliser `request.text()` (pas `request.json()`) pour la vérification de signature Stripe. C'est un gotcha classique en Next.js App Router — `stripe.webhooks.constructEvent()` attend le raw body.
- **Idempotence** : vérifier `stripePaymentIntentId` unique avant de créer la Registration
- **Race condition places** : si l'événement est full au moment du webhook → `PaymentService.refund()` + email d'excuse (email basique, pas encore enrichi — l'enrichissement est en Phase 7)
- **Email de confirmation** : en Phase 4b, le webhook envoie l'**email basique** existant (celui des événements gratuits). L'enrichissement avec montant + lien reçu Stripe vient en Phase 7.

**Tests** :
- Unitaires (6+ cas) : succès normal (Registration PAID créée + membership Circle), idempotence (doublon ignoré), full + remboursement auto, inscription Circle si pas déjà membre, webhook inconnu ignoré, metadata manquantes rejetées
- E2E : simulation webhook avec `stripe.webhooks.generateTestHeaderString()` pour générer une signature valide → vérifier que la Registration existe en DB. Banner `?payment=success` affiché.

**Seed E2E** : le setup du test doit créer un Circle avec `stripeConnectAccountId` + un Moment payant `PUBLISHED`. Ces données existent grâce aux Phases 3 et 3bis.

**Critère de validation** : un webhook `checkout.session.completed` crée la Registration PAID + membership Circle. Le banner s'affiche sur `?payment=success`.

**Complexité** : haute | **Risque** : haut

---

### Phase 5 — Remboursement (désinscription + annulation)

**Objectif** : gérer les remboursements lors de la désinscription d'un Participant ou de l'annulation par l'Organisateur.

**Dépend de** : Phase 4b

**Fichiers à créer** :
- `src/domain/usecases/refund-registration.ts` + tests — usecase unitaire : vérifie `refundable` ou `force` (annulation Organisateur), appelle `PaymentService.refund()`, met à jour `paymentStatus` → `REFUNDED`

**Fichiers à modifier** :
- `src/domain/usecases/cancel-registration.ts` — injecter `PaymentService` (optionnel, passé uniquement pour les événements payants). Si `paymentStatus === PAID` : appeler `refundRegistration` (remboursable) ou ne pas rembourser (non remboursable). Désactiver la promotion waitlist pour les événements payants (pas de waitlist payante).
- `src/domain/usecases/__tests__/cancel-registration.test.ts` — ajouter les cas payants (remboursable → refund, non remboursable → pas de refund, NONE → pas d'appel Stripe)
- `src/domain/usecases/cancel-moment.ts` (ou usecase équivalent — **vérifier s'il existe, sinon le créer**) — rembourser tous les inscrits PAID en batch. Le flag `force: true` bypasse le check `refundable` (annulation Organisateur = toujours remboursé). La logique de remboursement batch doit être dans le **usecase**, pas dans la server action (architecture hexagonale).
- `src/app/actions/registration.ts` — injecter `paymentService` dans `cancelRegistrationAction`
- `src/app/actions/moment.ts` — injecter `paymentService` dans l'action d'annulation
- `src/components/moments/registration-button.tsx` — modale de désinscription : si `!moment.refundable && paymentStatus === PAID`, afficher l'avertissement "Cet événement n'est pas remboursable. Vous ne serez pas remboursé." avant confirmation.

**Stratégie de test E2E pour les remboursements** : les tests E2E vérifient l'**UX** (modale d'avertissement, messages de confirmation), pas l'appel Stripe réel. Le remboursement Stripe est couvert par les tests unitaires (mock du port) et les tests d'intégration de l'adapter (Phase 1). Le test bout-en-bout réel avec Stripe est en Phase 8.

**Tests** :
- Unitaires : remboursable + désinscription → refund appelé, non remboursable + désinscription → refund pas appelé, annulation Organisateur → refund appelé (quel que soit `refundable`), `paymentStatus === NONE` → pas d'appel Stripe, remboursement batch (annulation avec N inscrits payants)
- E2E : désinscription d'un événement payant non remboursable → vérifier la modale d'avertissement. Désinscription remboursable → vérifier le message de confirmation.

**Critère de validation** : la désinscription d'un événement payant remboursable déclenche un refund. L'annulation par l'Organisateur rembourse toujours en batch. La modale d'avertissement s'affiche pour les événements non remboursables.

**Complexité** : moyenne | **Risque** : moyen

---

### Phase 6 — Verrouillage prix + politique de remboursement page publique

**Objectif** : protéger le prix contre les modifications incohérentes après inscription. Afficher la politique de remboursement sur la page événement.

**Dépend de** : Phase 5 (la transition payant → gratuit déclenche un remboursement batch, qui nécessite `refundRegistration`)

**Fichiers à modifier** :
- `src/domain/usecases/update-moment.ts` — ajouter les règles de verrouillage :
  - Gratuit → payant avec inscrits : **interdit** → erreur "Impossible, des Participants sont déjà inscrits"
  - Payant → gratuit avec inscrits payants : **autorisé** → remboursement auto de tous les `PAID` via `PaymentService`
  - Payant → payant (changement de prix) avec inscrits payants : **interdit** → erreur "Prix verrouillé après le premier paiement"
  - Sans inscrits : toutes les transitions sont libres
- `src/domain/usecases/__tests__/update-moment.test.ts` — tests des 6 cas du tableau de transitions (3 sans inscrits, 3 avec inscrits)
- `src/components/moments/moment-detail-view.tsx` — afficher sous le prix, avant le bouton CTA :
  - Événement remboursable → "Remboursement intégral en cas de désinscription."
  - Événement non remboursable → "Pas de remboursement en cas de désinscription."
  - Toujours → "Remboursement intégral en cas d'annulation par l'Organisateur."
- `src/components/moments/moment-form-options-section.tsx` — désactiver l'input prix + afficher un message si des inscrits payants existent (prop `hasPaidRegistrations`)
- Clés i18n FR/EN pour la politique de remboursement

**Note** : `registration-button.tsx` est touché en Phase 4a (CTA payant), Phase 5 (modale non-remboursable) et potentiellement ici. Chaque phase part du code de la précédente — pas de conflit tant que les PRs sont séquentielles.

**Tests** :
- Unitaires : les 6 cas de transition (avec/sans inscrits × 3 transitions)
- E2E : tenter de modifier le prix d'un événement avec des inscrits → vérifier le blocage. Vérifier la politique de remboursement sur la page publique.

**Critère de validation** : le prix est verrouillé après la première inscription payante. La politique de remboursement est visible sur la page événement.

**Complexité** : moyenne | **Risque** : moyen

---

### Phase 7 — Enrichissement emails + résumé billetterie + CGU

**Objectif** : enrichir les emails avec les infos de paiement, afficher le résumé billetterie par événement, mettre en place la section CGU Paiements.

**Dépend de** : Phase 4b (données de paiement dans les emails), Phase 5 (messages de remboursement dans les emails)

**Fichiers à modifier** :
- `src/domain/ports/services/email-service.ts` — enrichir les types de données email avec champs optionnels : `amountPaid?: string`, `receiptUrl?: string`, `refundMessage?: string`
- Templates email React (react-email) — mentions conditionnelles :
  - Confirmation inscription payante : "Paiement confirmé — 15,00 €" + lien "Voir mon reçu" (`stripeReceiptUrl`)
  - Désinscription remboursable : "Vous serez remboursé de 15,00 € sous 5-10 jours"
  - Désinscription non remboursable : "Conformément à la politique de l'événement, aucun remboursement n'est effectué"
  - Annulation Organisateur : "Vous serez remboursé de 15,00 € sous 5-10 jours"
  - Rappel 24h/1h : aucune différence
- `src/infrastructure/services/email/resend-email-service.ts` — adapter pour passer les données conditionnelles
- `src/domain/ports/repositories/registration-repository.ts` — ajouter `getPaymentSummary(momentId)` → `{ paidCount: number, totalAmount: number, refundedCount: number }`
- `src/infrastructure/repositories/prisma-registration-repository.ts` — implémenter (agrégation sur les Registration du Moment)
- Page de gestion de l'événement dans le dashboard — ajouter une section "Billetterie" :
  - "12 inscrits payants · 180,00 € collectés (avant frais Stripe)"
  - "2 remboursés"
  - Visible uniquement si `moment.price > 0`
- Page CGU (`/legal` ou équivalent) — ajouter section "Paiements" couvrant :
  - The Playground facilite la transaction mais n'est pas le vendeur
  - Frais Stripe (~2.9% + 0,30€) supportés par l'Organisateur. 0% commission plateforme.
  - Politique de remboursement (deux cas + annulation Organisateur)
  - Données bancaires traitées par Stripe, jamais stockées par The Playground
  - Litiges : contacter l'Organisateur, puis contestation bancaire
- Checkout Session (dans `stripe-payment-service.ts`) — passer l'URL CGU via `consent_collection` ou `custom_text`

**Tests** :
- Unitaires : vérifier que les templates email contiennent les infos paiement quand présentes, et ne les contiennent pas quand absentes (événements gratuits)
- Intégration : `getPaymentSummary` retourne les bons chiffres (0 paid, N paid, mix paid/refunded)
- E2E : vérifier la section billetterie dans la page de gestion d'un événement payant

**Critère de validation** : emails enrichis avec montant + reçu Stripe. Résumé billetterie visible pour l'Organisateur. Section CGU Paiements en place.

**Complexité** : faible-moyenne | **Risque** : faible

---

### Phase 8 — Tests E2E intégration Stripe (validation pré-MEP)

**Objectif** : valider le flux complet bout-en-bout avec la vraie API Stripe (mode test) avant la mise en production. C'est le filet de sécurité final.

**Dépend de** : toutes les phases précédentes

**Pourquoi une phase séparée** :
- Les phases précédentes testent avec des mocks (unitaire) ou des simulations (E2E webhook). Aucun test ne couvre le flux réel Participant → Stripe Checkout → webhook → inscription.
- Les tests Stripe ont une dépendance infra spécifique (Stripe CLI, clés configurées, réseau).
- Si ces tests révèlent un bug, on corrige sans polluer les PR précédentes.

**Contrainte** : Playwright ne peut pas remplir le formulaire Stripe Checkout (domaine externe `checkout.stripe.com`). Le flux E2E réel fonctionne ainsi :

```
1. Playwright : clic "S'inscrire — 15,00 €"
2. Playwright : intercepte le redirect, récupère la Checkout Session ID
3. Script : complète la session via l'API Stripe test
4. Webhook arrive sur localhost via Stripe CLI (stripe listen)
5. Playwright : recharge la page → vérifie que le Participant est inscrit
```

**Fichiers à créer** :
- `tests/e2e/stripe-payment.spec.ts` — suite E2E dédiée Stripe
- `tests/e2e/helpers/stripe-test-helper.ts` — helper pour compléter une Checkout Session via l'API Stripe, vérifier un refund, etc.

**Pré-requis infra** :
- Stripe CLI installé et configuré (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- Clés Stripe test dans l'environnement E2E (`STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`)
- Circle de test avec `stripeConnectAccountId` actif (seed E2E)

**Scénarios E2E à couvrir** :
1. **Parcours complet inscription payante** : clic → redirect → paiement simulé → webhook → Registration PAID → inscription Circle → banner success
2. **Abandon checkout** : clic → redirect → retour `?payment=cancelled` → page normale, pas d'inscription
3. **Désinscription remboursable** : Participant inscrit payant → se désinscrit → refund Stripe vérifié
4. **Annulation Organisateur** : événement payant avec inscrits → annulation → refund batch vérifié
5. **Événement complet** : événement full → clic → redirect → paiement → webhook → remboursement auto (race condition places)

**Tests** : suite E2E dédiée, exécution séparée (pas dans le CI standard — dépendance réseau Stripe + Stripe CLI).

**Critère de validation** : tous les scénarios passent avec la vraie API Stripe en mode test. La feature est prête pour la MEP.

**Complexité** : moyenne | **Risque** : faible (on ne touche pas au code, on valide)

---

### Résumé

| Phase | Objectif | Complexité | Risque | Dépend de |
| --- | --- | --- | --- | --- |
| 1 — Port + Adapter | Fondations hexagonales | Moyenne | Faible | — |
| 2 — Schema + Models | Nouveaux champs DB | Faible | Faible | — |
| 3 — Onboarding Connect | Activer Stripe sur une Communauté | Moyenne-haute | Moyen | 1 |
| 3bis — UI formulaire prix | Créer/éditer un événement payant | Moyenne | Faible | 2, 3 |
| 4a — Checkout + redirect | Redirect vers Stripe Checkout | Moyenne | Moyen | 1, 3bis |
| 4b — Webhook + inscription | Inscription après paiement | **Haute** | **Haut** | 4a |
| 5 — Remboursement | Désinscription + annulation | Moyenne | Moyen | 4b |
| 6 — Verrouillage + politique | Protéger le prix + afficher politique | Moyenne | Moyen | 5 |
| 7 — Emails + billetterie + CGU | Enrichir emails + résumé + CGU | Faible-moyenne | Faible | 4b, 5 |
| 8 — E2E Stripe | Validation bout-en-bout pré-MEP | Moyenne | Faible | Toutes |
