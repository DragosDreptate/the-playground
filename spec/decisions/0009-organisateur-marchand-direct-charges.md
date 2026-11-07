# ADR-0009 — L'Organisateur est le marchand : passage aux direct charges

- **Date** : 2026-11-07
- **Statut** : Accepté, non déployé
- **Références** : [`spec/features/paiements-direct-charges.md`](../features/paiements-direct-charges.md), [`spec/research/stancer-vs-stripe.md`](../research/stancer-vs-stripe.md). Remplace le modèle de paiement décidé le 2026-03-30.

## Contexte

Le 2026-03-30, on a retenu des comptes Connect Express et des destination charges, en supposant que l'Organisateur paierait les frais, les remboursements et les litiges. La doc Stripe et un essai en mode test montrent le contraire : avec des destination charges sans commission, la plateforme est le marchand, et c'est elle qui est débitée.

Le produit annonce pourtant autre chose : « 0 % de commission », frais à la charge de l'Organisateur, plateforme « pas partie à la vente ». Le code, la spec et les CGU n'étaient donc pas alignés sur le flux réel.

Aucun paiement réel n'ayant eu lieu en production, changer de modèle ne demande aucune reprise de transactions.

## Décision

Le paiement a lieu directement sur le compte de l'Organisateur (direct charge) :

- **Compte** : API v1 avec propriétés `controller` : frais payés par le compte, pertes portées par Stripe, tableau de bord Express. Cette combinaison est en preview chez Stripe (`2026-10-28.preview`), version utilisée uniquement à la création du compte.
- **Paiement** : Checkout hébergé sur le compte de l'Organisateur, carte seule, sans conversion de devises ni code promo.
- **Données** : `Registration.stripeAccountId` garde le compte qui porte le paiement, indispensable pour le rembourser.
- **Webhook** : un seul endpoint, de type Connect. Inscription confirmée seulement si le paiement est marqué payé. Une erreur de traitement répond 500 pour que Stripe rejoue l'événement.
- **Frais sur remboursement** : à la charge de l'Organisateur et annoncés clairement, puisque Stripe ne les rend pas.

## Alternatives écartées

- **Garder les destination charges en reprenant les fonds au remboursement** (`reverse_transfer`) : plus simple, mais la plateforme garderait les frais et les litiges, et les promesses publiques resteraient fausses.
- **Tableau de bord Stripe complet** : disponible sans preview, mais plus lourd pour un Organisateur, et sans lien de connexion direct depuis The Playground. Reste le repli si la preview évolue mal.
- **Comptes v2** : recommandés par Stripe pour les nouvelles intégrations, mais une plateforme française doit y fournir un jeton créé dans le navigateur. Un compte v1 reste utilisable par l'API v2 sans être recréé.
- **Stancer** : pas d'offre plateforme publique, et ses CGU réservent le service à un client qui encaisse pour son propre compte.

## Conséquences

- **Commission future** : reste possible avec `application_fee_amount`, l'argument du 2026-03-30 tombe.
- **Comptes Express existants** : un compte ne change pas de configuration. Il faut les recréer, et leurs Organisateurs refont leur inscription.
- **Dépendance à une preview** : Stripe peut la faire évoluer. Elle est isolée dans l'adapter, et le choix du tableau de bord est définitif pour chaque compte.
- **Détacher un compte** : interdit dès qu'il a encaissé ou qu'un événement payant publié en dépend, car l'Organisateur n'accède à son tableau de bord que par The Playground.
- **Légal** : CGU et politique de confidentialité réécrites, relecture juridique à faire avant la mise en production.
