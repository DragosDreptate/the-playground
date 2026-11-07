# Paiements : l'Organisateur devient le marchand (direct charges)

> **Statut** : cadrage du 2026-11-07, non implémenté. Décisions D1 à D7 tranchées, lot 0 terminé, lot 1 codé dans `feat/paiements-direct-charges`, non commité.
> **Remplace à terme** le modèle de paiement de [`stripe-connect.md`](stripe-connect.md). Les règles métier de cette spec restent valables (prix verrouillé, pas de liste d'attente sur payant, authentification avant paiement).
> **Contexte** : aucun paiement réel en production au 2026-11-07, donc rien à migrer côté transactions.

## 1. Objectif

Aligner le flux d'argent sur ce que le produit annonce : **l'Organisateur vend, encaisse et assume**. The Playground reste un intermédiaire technique, à 0 % de commission.

| | Aujourd'hui (destination charge) | Cible (direct charge) |
|---|---|---|
| Marchand du paiement | Plateforme | Organisateur |
| Frais Stripe | Débités à la plateforme | Prélevés à l'Organisateur |
| Remboursements et litiges | Débités à la plateforme | Débités à l'Organisateur |
| Frais Connect | Dus par la plateforme | Aucun |
| Page de paiement, reçu, relevé bancaire | Plateforme | Nom et marque de l'Organisateur |

## 2. Les deux points vérifiés

### Une commission future reste-t-elle possible ? Oui

`application_fee_amount` s'utilise sur une direct charge, sans frais Stripe supplémentaires sur cette commission. Avec Stripe comme collecteur de frais, elle ne contient que notre part. Elle n'est pas rendue automatiquement au remboursement (`refund_application_fee`).

La raison invoquée le 2026-03-30 pour écarter les direct charges ne tient donc plus.

### Que voit l'Organisateur ? Deux options réelles

La combinaison voulue, Organisateur payeur des frais et Stripe responsable des soldes négatifs, n'existe qu'avec un des deux tableaux de bord ci-dessous. **Ce choix est permanent pour un compte** : en changer impose de recréer le compte.

| | Dashboard complet | Dashboard Express |
|---|---|---|
| Statut | Disponible | **Preview publique** (version d'API `2026-10-28.preview`) |
| Expérience | Vrai compte Stripe avec ses propres identifiants, riche et plus intimidant | Tableau de bord léger : paiements, virements, remboursements, litiges |
| Accès depuis The Playground | Pas de lien de connexion direct : renvoi vers le site Stripe | Lien à usage unique, comme aujourd'hui |
| Codes promo | Créables par l'Organisateur | Pas d'interface documentée |

### Essais en mode test (plateforme française, comptes FR)

| Configuration | Création | Lien d'onboarding | Lien de connexion |
|---|---|---|---|
| v1 Express, frais et pertes hors plateforme, version stable | ❌ Refusé | | |
| v1 Express, idem, version preview | ✅ | ✅ | Refusé avant la fin de l'onboarding (attendu, à revérifier après) |
| **v1 Dashboard complet, version stable** | ✅ | ✅ | ❌ Inexistant |
| v2 sans jeton | ❌ `account_token_required` | | |
| **v2 Dashboard complet, jeton créé avec la clé publiable** | ✅ | ✅ | Non testé |
| v2 Express, jeton, preview | ✅ | Non concluant (forme du paramètre à revoir) | Non testé |

Les comptes de test ont été supprimés. **Rien n'a été essayé en mode live** : une preview peut y être soumise à conditions.

Compléments de doc :

- Un compte v1 reste utilisable par l'API v2 sans modification.
- Stripe recommande v2 aux nouvelles intégrations, et déconseille les direct charges sur les comptes Express « legacy ».

## 3. Décisions à prendre

- **D1. Dashboard : Express (preview), tranché par Dragos le 2026-11-07.** Plus simple et plus adapté aux Organisateurs. Risque limité tant que les comptes sont rares : une erreur se corrige en refaisant l'onboarding. Condition remplie le 2026-11-07 : création confirmée en live. Le Dashboard complet reste le repli si la preview évolue mal.
- **D2. API de compte : v1 avec propriétés `controller`, tranché le 2026-11-07.** Pas de jeton côté navigateur, moins de code, et la porte v2 reste ouverte sans recréer les comptes.
- **D3. Frais sur remboursement : à la charge de l'Organisateur, tranché le 2026-11-07.** Les frais Stripe ne sont pas rendus : à l'annulation d'un événement à 15 €, l'Organisateur perd environ 0,48 € par billet. Idem pour le remboursement automatique quand l'événement s'est rempli pendant le paiement. À annoncer clairement dans le formulaire, l'Aide et les CGU.
- **D4. Codes promo : désactivés, tranché le 2026-11-07** (`allow_promotion_codes: false`) jusqu'à la billetterie avancée, qui le demandait déjà.
- **D5. Paiements en attendant : pas de blocage, tranché le 2026-11-07.** Rien en cours selon Dragos.
- **D6. Moyens de paiement : carte uniquement, tranché le 2026-11-07.** Et vérification de `payment_status` avant de confirmer une inscription. Apple Pay et Google Pay à confirmer (Q5).
- **D7. Conversion de devises : désactivée, tranché le 2026-11-07** (`adaptive_pricing`), pour tenir « prix affiché = prix payé ».

## 4. Résultats du lot 0

Essais du 2026-11-07. Premier passage sur un ancien compte Express, puis sur un compte **au profil cible** (Express en preview, frais et pertes hors plateforme), inscription terminée par un humain car Stripe affiche un captcha.

### Validé

- **Preview :** la version `2026-10-28.preview` ne sert qu'à la création. Le compte se pilote ensuite en version stable.
- **Frais :** billet à 15 €, carte française : 0,48 € de frais, 14,52 € nets chez l'Organisateur. Aucune opération sur la plateforme.
- **Détournement :** un remboursement débite l'Organisateur, jamais la plateforme, même après un versement.
- **Webhook Connect :** `checkout.session.completed` et `charge.refunded` arrivent signés, avec `event.account` et les `metadata` intactes.
- **Compte obligatoire :** sans `stripeAccount`, relecture et remboursement répondent `resource_missing`. Confirme le besoin de `Registration.stripeAccountId`.
- **D6 et D7 :** avec `payment_method_types: ["card"]` et `adaptive_pricing.enabled: false`, la page n'affiche plus que la carte et les euros (hors Apple Pay et Google Pay, voir ci-dessous).
- **Lien de connexion Express :** créé sans erreur une fois l'inscription terminée.

### Réponses aux questions

- **Q1, résolue.** `metadata` et `charge.refunded` présents, `receipt_url` disponible sur le paiement.
- **Q2, résolue en test.** Une fois les fonds versés, le remboursement réussit quand même (`succeeded`) et le solde de l'Organisateur passe négatif (-14,52 € dans l'essai). Le Participant reste remboursé. La doc annonce pourtant un état `pending` en cas de solde insuffisant : on gère donc les deux cas, à revérifier en live.
- **Q3, résolue en test.** La plateforme peut passer le versement en manuel (`settings.payouts.schedule.interval`). Par défaut, le compte neuf est en versement quotidien à 7 jours. Retenir les fonds jusqu'à l'événement reste donc possible : hors périmètre, option à discuter plus tard.
- **Q5, résolue pour Apple Pay.** Vu par Dragos sur son appareil Apple, avec Link, malgré `payment_method_types: ["card"]`.
- **Q6, résolue.** Tableau de bord Express regardé par Dragos : rien à signaler.
- **Q7, résolue.** En live, le compte au profil cible se crée en version preview, se relit en version stable avec les bons réglages, et se supprime (essai du 2026-11-07, sans donnée personnelle ni paiement).
- **Q4, résolue en partie.** Sans réglage, la page de paiement affiche un nom tiré du site web (« accessible ») et le relevé `ACCESSIBLE.STRIPE.COM`. La plateforme peut préremplir le nom et l'URL à la création, et modifier ensuite le nom, le libellé de relevé et la couleur. Reste à voir : l'envoi du reçu par Stripe (`receipt_email` vide en test), notre email restant la référence.

### Restent ouverts

- **Google Pay :** non vu, Dragos étant sur Apple. À regarder sur un appareil Android au lot 4.
- **Inscription et paiement réels en live :** non testés. Le lien d'inscription n'a pas pu être créé en live, la clé de test n'ayant pas ce droit. À valider au lot 5 avec un premier compte réel.

### Découvert en chemin

- **Dossier refusé :** l'inscription peut se terminer avec une identité non vérifiée. Stripe marque le dossier « envoyé », garde les paiements coupés, et l'Organisateur croit avoir fini.
- **Vérification :** il faut quelques secondes après l'envoi avant l'activation (`pending_verification`).

## 5. Plan

### Lot 0. Validation en mode test, sans code de production

Parcours complet : création, onboarding, paiement, webhook, remboursement, puis tableau de bord vu par l'Organisateur. Toute surprise revient à la décision concernée. Résultats en section 4.

### Lot 1. Adapter et port

Fichiers : `stripe-payment-service.ts`, `payment-service.ts`, `mock-payment-service.ts`.

- `createConnectAccount` : profil cible, version preview à la création uniquement, et préremplissage du nom et de l'URL de la Communauté (sinon le paiement affiche un nom tiré du site web).
- `createCheckoutSession` : header `stripeAccount`, retrait de `transfer_data`, carte uniquement, conversion et codes promo désactivés.
- `handleWebhookEvent` : confirmer l'inscription seulement si `payment_status` vaut `paid`.
- `refund` : reçoit le compte, et retourne un état (effectué ou en attente).
- `handleWebhookEvent` : lit `event.account`, relit le paiement sur ce compte, et ignore tout événement sans compte. Un seul secret suffit : sans paiement réel à reprendre, l'endpoint plateforme est remplacé par l'endpoint Connect.
- `createLoginLink` : inchangé, le lien de connexion Express reste valable avec D1.

### Lot 2. Domaine et données

- `Registration.stripeAccountId` : **livré avec le lot 1**, dont il est indispensable. Le paiement vit sur le compte de l'Organisateur, il doit rester remboursable même si la Communauté change de compte. Schéma poussé en dev, **en production à la release seulement, avant le merge** : le code lit cette colonne, y compris dans des requêtes SQL.
- `refundRegistration` et `refundAllPaidRegistrations` : passent le compte, et distinguent remboursé et en attente.
- `handlePaymentWebhook` : **traite `charge_refunded`**, ignoré aujourd'hui. L'Organisateur pouvant rembourser depuis Stripe, l'inscription doit suivre.
- `cancelStripeConnectAction` : interdire la déconnexion avec des paiements remboursables ou un événement payant à venir. Aujourd'hui, elle remet le compte à zéro sans contrôle.
- Compte fermé ou déconnecté côté Stripe : détecter via `account.updated`, et bloquer les nouveaux paiements.
- Remboursement impossible : le dire à l'Organisateur plutôt que d'échouer en silence.

### Lot 3. Interface, textes et légal (FR et EN)

- `circle-form.tsx` : texte d'activation (l'Organisateur ouvre son propre compte) et accès au tableau de bord.
- États de l'activation : distinguer « vérification en cours » et « dossier à compléter », avec un bouton pour reprendre.
- `moment-form-options-section.tsx:36` : estimation du net sur le tarif réel (1,5 % + 0,25 € pour une carte européenne standard, plus pour une carte premium ou hors Europe).
- Modales de désinscription : promesse de délai selon Q2.
- `messages/*.json` : FAQ, Aide, CGU, confidentialité, landing. Retirer tous les « 2,9 % + 0,30 € ».
- Articles de blog concernés, et `src/app/[locale]/(routes)/legal/confidentialite/page.tsx`.
- CGU : relecture juridique recommandée sur le rôle de chacun et sur les frais.

### Lot 4. Tests

- Unitaires : port mis à jour, remboursement avec compte, remboursement en attente, `charge_refunded` idempotent, garde de déconnexion.
- E2E : helper de webhook avec `account`, seed adapté, parcours avec un compte Organisateur ordinaire.
- Validation manuelle du parcours réel, WebKit compris.

### Lot 5. Release

- Endpoint webhook « Connected accounts » en live, et nouveau secret dans Vercel (production et staging).
- `db:push:prod` au moment de la release, avec feu vert dédié.
- Comptes Express existants : un type de compte ne change pas. Lister, prévenir les Organisateurs, remettre `stripeConnectAccountId` à zéro après leur accord, fermer les anciens comptes. Refaire l'onboarding. Écriture en production : feu vert dédié.
- Mise à jour de `spec/features/stripe-connect.md`, de `CLAUDE.md` et de l'ADR.

## 6. Hors périmètre

Multi-tarifs et coupons (`billetterie-avancee.md`), commission plateforme, notification de litige à l'Organisateur, autres PSP (`spec/research/stancer-vs-stripe.md`).

## Sources

- [Types de charges](https://docs.stripe.com/connect/charges)
- [Direct charges](https://docs.stripe.com/connect/direct-charges)
- [Frais et payeur](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior)
- [Comptes v2](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration)
- [Propriétés controller](https://docs.stripe.com/connect/migrate-to-controller-properties)
- [Gestion du risque](https://docs.stripe.com/connect/risk-management)
- [Jetons de compte](https://docs.stripe.com/connect/account-tokens)
- [Dashboard Express](https://docs.stripe.com/connect/express-dashboard)
- [Recommandations d'intégration](https://docs.stripe.com/connect/integration-recommendations)
- [Tarifs Connect](https://stripe.com/fr/connect/pricing)
- [Reçus](https://docs.stripe.com/receipts)
- [Relevés bancaires](https://docs.stripe.com/connect/statement-descriptors)
