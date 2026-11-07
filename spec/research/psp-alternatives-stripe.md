# Étude de marché — Alternatives à Stripe pour les paiements The Playground

> Rédigé le 2026-07-20. Recherche multi-sources vérifiée (adversarial verification, 24/25 claims confirmés). Sources citées en bas de chaque section.
> Objectif : trouver un PSP français/européen en mode « moteur API » (marque blanche), idéalement en partenariat zéro frais, pour remplacer ou compléter Stripe Connect.

## 0. Le vrai enjeu, avant tout choix de PSP

Le modèle de paiement actuel (`stripe-payment-service.ts`) est un **destination charge** Stripe Connect : chaque Circle configure **son propre** compte Connect Express, complète son **KYC**, et reçoit les fonds. Aucune commission plateforme (pas d'`application_fee_amount`).

La douleur réelle n'est ni le coût ni l'absence de commission (techniquement possible dès maintenant), c'est **le KYC par organisateur** : tant qu'une communauté n'a pas onboardé Stripe, elle ne peut pas vendre. C'est ce qui bloque le Padel Girls Club (`stripeConnectAccountId = null`).

**Conclusion structurante de l'étude : changer de PSP marketplace ne supprime PAS cette friction.** Lemonway comme Mangopay imposent eux aussi le KYC/KYB des sous-marchands. Le seul levier qui réduit vraiment la friction est un **changement de modèle** (The Playground marchand unique + wallets, avec KYC allégé/différé sous seuils), pas un changement de fournisseur. À garder en tête pour toute la suite.

## 1. Tableau comparatif des candidats

| Acteur | Origine | Modèle marketplace (split + KYC sous-marchands) | API / marque blanche | Tarifs | Éligibilité | Maturité |
|---|---|---|---|---|---|---|
| **Stripe Connect** (actuel) | US (EU via Irlande) | ✅ Oui, référence | ✅ Oui, excellente DX | ~2,9% + 0,30€ | Tous | ★★★★★ |
| **Lemonway** | 🇫🇷 Paris (ACPR n°16568) | ✅ Oui (1 400+ marketplaces) | ✅ API + flux hébergés | Tarifé, sur devis | Tous | ★★★★ |
| **Mangopay** | 🇱🇺 Luxembourg (CSSF, origine FR/Leetchi) | ✅ Oui, e-wallet (Vinted, Malt) | ✅ API wallet | Sur devis / paliers volume | Tous | ★★★★ |
| **HelloAsso Checkout** | 🇫🇷 France | ⚠️ Non (encaissement pour l'asso, pas split multi-marchands piloté par un tiers) | ✅ API marque blanche (partielle) | **0% (pourboire libre)** | **Associations loi 1901 uniquement** | ★★★ |
| **Fintecture** | 🇫🇷 France (ACPR n°17248) | ❌ Non (A2A, pas de split marketplace natif) | ✅ API | Réduit vs carte | Plutôt B2B | ★★★ |
| **Powens** | 🇫🇷 France | ❌ Non (open banking) | ✅ API | Réduit vs carte | Plutôt B2B | ★★★ |

> PayPlug, Stancer, Mollie, Adyen, Lydia/Sumeria, Revolut : soit pas de vrai modèle marketplace/split multi-vendeurs équivalent Connect (PayPlug, Stancer, Lydia, Revolut), soit acteurs solides mais sans avantage décisif vs Lemonway/Mangopay pour notre cas (Mollie, Adyen). Écartés en première approche.

## 2. HelloAsso (question A) — le seul « zéro frais », mais asso-only

**Oui, HelloAsso propose un vrai moteur de paiement par API en marque blanche** (« HelloAsso Checkout »), et pas seulement un formulaire de collecte hébergé. Positionné explicitement comme « la 1ère solution de paiement par API », intégrable dans un SI, CRM, site, app mobile. Nuance importante : **marque blanche partielle** — la capture carte se fait historiquement sur une surface HelloAsso, à confirmer techniquement avant tout POC.
> Sources : [info.helloasso.com/solution/checkout](https://info.helloasso.com/solution/checkout), [dev.helloasso.com](https://dev.helloasso.com/), [blog HelloAsso Checkout](https://www.helloasso.com/blog/helloasso-checkout-quest-ce-que-cest/)

**Le modèle « zéro commission » est réel** : sans abonnement, sans commission, sans frais bancaires, sans limite de volume. Financé par la **contribution volontaire** (pourboire) du payeur, pré-remplie par défaut mais réductible à zéro par le contributeur.
> Sources : [info.helloasso.com/modele-economique](https://info.helloasso.com/modele-economique), page produit Checkout

**Oui, un tiers peut se brancher** : il existe un **programme partenaire actif** (éditeurs, intégrateurs, fédérations, collectivités) donnant accès à des clés API propres, via un **flux OAuth2** (« mire d'autorisation ») où chaque association accorde l'accès au partenaire. 40-50+ intégrations déjà en production, repo officiel + SDK PHP.
> Sources : [dev.helloasso.com/docs/mire-authorisation](https://dev.helloasso.com/docs/mire-authorisation), [info.helloasso.com/integrations](https://info.helloasso.com/integrations), [github.com/HelloAsso/mire-autorisation-sample](https://github.com/HelloAsso/mire-autorisation-sample)

**LA limite bloquante** : HelloAsso est **juridiquement réservé aux associations loi 1901** (« la seule API monétique dédiée au secteur associatif », fondement art. L561-5 du Code monétaire et financier). Depuis **juin 2025**, toute nouvelle association doit être vérifiée avant d'encaisser (erreur 409 sinon). Une plateforme accueillant aussi des non-assos **ne peut l'activer que pour ses Circles associatifs**, jamais pour l'ensemble.
> Sources : [changelog vérification obligatoire](https://dev.helloasso.com/changelog/vérification-des-associations-obligatoire), [intro API HelloAsso](https://dev.helloasso.com/docs/introduction-%C3%A0-lapi-de-helloasso)

**Point de vigilance technique** : depuis mars 2026, HelloAsso bloque l'embed en iframe de la mire d'autorisation — impacte le design d'intégration.

**Question ouverte non tranchée** : le programme partenaire vise-t-il un tiers **multi-tenant** (un SaaS qui branche le Checkout au nom de plusieurs assos différentes), ou seulement l'outillage propre d'une asso ? La doc est ambiguë sur le cas « broker multi-associations ». **À poser directement à HelloAsso.**

## 3. PSP marketplace FR/EU (question B) — Lemonway et Mangopay

Les deux seuls vrais équivalents Stripe Connect côté européen :

- **Lemonway** (Paris, agréé ACPR n°16568 depuis 2012) : établissement de paiement paneuropéen pour marketplaces. Split payment, collecte de commission, virements programmés, KYC/KYB des vendeurs, ségrégation des fonds, en API ou flux hébergés. Passeport UE ~28-29 pays. 1 400+ marketplaces + 200 plateformes de crowdfunding. **Meilleure ownership 100% française.**
> Sources : [euvetted.com/alternatives/stripe-connect](https://euvetted.com/alternatives/stripe-connect), [lemonway.com/about](https://www.lemonway.com/en/about-lemonway)

- **Mangopay** (Luxembourg, agréé CSSF depuis 2013, origine française — spin-off Leetchi) : modèle **e-wallet** (les fonds restent en wallet jusqu'au versement piloté par la plateforme), split payment, onboarding + KYC/KYB par API. 2 500+ plateformes dans 170 pays (Vinted, Malt, Wallapop). Ce modèle wallet est précisément celui qui permettrait de **mutualiser/différer le KYC**.
> Sources : [euvetted](https://euvetted.com/alternatives/stripe-connect), [ryftpay.com — best Stripe Connect alternatives 2026](https://www.ryftpay.com/blog/best-stripe-connect-alternatives-for-marketplaces-and-platforms-2026), [Wikipedia Mangopay](https://en.wikipedia.org/wiki/Mangopay)

**Cadre juridique confirmé** : pour encaisser pour compte de tiers, la voie sensée est de **déléguer à un PSP agréé** agissant comme agent de paiement (Stripe, Lemonway, Mangopay), pas d'obtenir soi-même l'agrément EP ACPR (~1M€, 3 ans+). ~70% des plateformes françaises ont fait ce choix. À noter : la croyance « l'opérateur DOIT être agréé EP » a été **réfutée** par l'analyse — c'est le PSP délégué qui porte l'agrément.
> Source : [deshoulieres-avocats.com — encaissement pour compte de tiers](https://www.deshoulieres-avocats.com/encaissement-pour-compte-de-tiers-et-marketplace-quel-cadre-juridique/)

**Réserve** : les tarifs précis de Lemonway/Mangopay ne sont **pas publics** (passés en mode devis). À obtenir en direct pour comparer objectivement à Stripe, surtout à **faible volume** (jeune plateforme, où le fixe et les minimums mensuels pèsent lourd).

## 4. Open banking / virement A2A (question C) — pas pour du grand public

Le **Pay by Bank / A2A** (Fintecture ACPR n°17248, Powens) laisse le payeur autoriser un virement depuis son app bancaire, **sans réseau carte** : coûts fortement réduits (~40% revendiqués), **chargeback quasi éliminé**, confirmation instantanée.

**Mais** : la redirection vers l'interface bancaire crée de la **friction en B2C**. Or les inscriptions à des événements sont du **B2C grand public sur mobile** — exactement le contexte où l'A2A convertit mal. De plus, Fintecture/Powens **ne gèrent pas nativement le split marketplace**. Donc : intéressant en **complément** pour de gros montants (ex. billetterie chère, sponsors), **pas** comme moteur principal d'inscriptions.
> Sources : [powens.com — guide Pay by Bank A2A](https://www.powens.com/fr/blog/guide-pay-by-bank-a2a/), [wise.com — Fintecture](https://wise.com/fr/blog/fintecture-paiement-virement-immediat)

## 5. Partenariat / zéro frais (question D) — illusoire à généraliser

**Aucune preuve** qu'un PSP marketplace (Lemonway, Mangopay, Stripe) accorde des conditions « zéro frais » à une plateforme parce qu'elle est gratuite ou à impact. Aucune claim confirmée sur ce point.

Pistes existantes mais limitées :
- **Mangopay** a une offre « charities » à creuser ([mangopay.com/press-and-media/charities-offer](https://mangopay.com/press-and-media/charities-offer)).
- **Stripe** a des remises nonprofit (partielles, pas du zéro).
- **HelloAsso** reste le **seul vrai zéro frais** du marché, mais au prix de la restriction asso-only.

**Tension centrale de toute l'étude** : aucun acteur ne combine (marketplace/split + KYC sous-marchands) **ET** (zéro frais). La gratuité totale visée par The Playground est **incompatible** avec un remplacement complet de Stripe Connect par un PSP marketplace classique.

## 6. Recommandation priorisée

1. **Garder Stripe Connect comme moteur par défaut.** C'est aujourd'hui le meilleur compromis DX + couverture universelle (assos ET non-assos). Rien dans l'étude ne justifie de l'abandonner en bloc.

2. **Ajouter HelloAsso en canal complémentaire, ciblé sur les Circles associatifs.** C'est le seul vrai zéro frais, et ça touche pile la douleur du Padel Girls Club. Avant tout dev :
   - Contacter HelloAsso (programme partenaire) pour trancher la **question multi-tenant** (un SaaS peut-il brancher le Checkout au nom de plusieurs assos ?).
   - Confirmer le niveau réel de **marque blanche** (capture carte sur quelle surface ?).

3. **Explorer le modèle wallet (Mangopay/Lemonway) seulement si la friction d'onboarding devient un bloqueur au volume.** C'est le seul levier qui réduit vraiment le KYC par orga (mutualisé/différé sous seuils). Chantier lourd (changement de flux de fonds, trésorerie, UX) — à ne lancer que si les données montrent que le KYC Stripe fait perdre trop d'organisateurs.

4. **Ne pas compter sur un partenariat zéro frais généralisé.** Il n'existe pas chez les PSP marketplace. Le « gratuit » sur les non-assos restera « frais Stripe absorbés », pas « zéro ».

5. **Ranger l'open banking (Fintecture/Powens) en option future** pour de gros montants ponctuels, jamais comme moteur d'inscriptions grand public.

### Qui contacter, sous quel angle

| Cible | Objectif | Angle |
|---|---|---|
| HelloAsso (partenariat) | Débloquer le multi-tenant asso + marque blanche | « Plateforme communautaire gratuite qui envoie du volume associatif vers HelloAsso » |
| Mangopay (sales + charities) | Tarifs faible volume + offre impact | Modèle wallet pour réduire la friction KYC |
| Lemonway (sales) | Tarifs faible volume, alternative FR | Ownership française, split payment |
