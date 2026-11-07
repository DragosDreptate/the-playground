# Stancer vs Stripe : un passage est-il possible et opportun ?

> Rédigé le 2026-11-07. Complète [`psp-alternatives-stripe.md`](psp-alternatives-stripe.md), qui écartait Stancer « en première approche » sans analyse détaillée.
> Sources de premier rang : conditions tarifaires Stancer (août 2024), CGU Stancer (octobre 2025), doc API v2 Stancer, pages tarifs et doc Stripe, code du repo. Les sources tierces sont signalées comme telles.

## 1. Verdict

**Possible : non, pas avec notre modèle actuel. Opportun : non.**

- Stancer n'a pas d'offre plateforme publique : ni création de comptes par API, ni onboarding délégué, ni reversement vers un tiers, ni split.
- Ses CGU réservent le service à un client qui encaisse pour son propre compte le prix de ce qu'il vend lui-même (art. 2 et 6 iv). The Playground ne peut donc pas encaisser pour ses Organisateurs.
- Le seul montage restant fait ouvrir un compte Stancer à chaque Organisateur. Il exclut les organisateurs sans activité professionnelle, ajoute un examen de conformité manuel, et casse le remboursement automatique à l'annulation.
- L'économie est réelle (0,14 € à 0,50 € par billet) mais trop faible face au chantier. Le snapshot de dev ne contient aucune inscription payée (§ 5).

## 2. Ce qu'on utilise vraiment de Stripe

Montage actuel (`src/infrastructure/services/stripe/stripe-payment-service.ts`) : comptes Connect Express, destination charges, Checkout hébergé, webhook qui crée l'inscription, remboursement automatique, codes promo natifs, lien vers le dashboard Express.

| Méthode du port `PaymentService` | Équivalent Stancer | État |
|---|---|---|
| `createConnectAccount` | Aucun : pas d'objet compte ou marchand dans l'API | ❌ Bloquant |
| `createOnboardingLink` | Aucun : souscription manuelle par chaque client dans l'Espace Client | ❌ Bloquant |
| `createLoginLink` | Aucun : connexion directe à l'Espace Client | ⚠️ Contournable |
| `getConnectAccountStatus` | Aucun | ❌ Bloquant |
| `createCheckoutSession` | `POST /v2/payment_intents`, page hébergée, redirection ou iframe | ✅ Proche. Métadonnées, expiration, consentement CGU et codes promo non vérifiés |
| `handleWebhookEvent` | Webhooks signés (`Stancer-Signature`, HMAC SHA256) | ⚠️ « Best effort », et aucun événement de remboursement listé |
| `refund` | Remboursement total ou partiel | ⚠️ Exige une provision suffisante (§ 4) |
| `receiptUrl` | Pas d'équivalent public trouvé par API | ⚠️ Reçu à produire nous-mêmes |

## 3. Benchmark

| Critère | Stripe (Connect Express) | Stancer |
|---|---|---|
| **Carte EEE standard** | 1,5 % + 0,25 € | **0,7 % + 0,15 € HT** |
| **Carte EEE premium** | 2,8 % + 0,25 € | 0,7 % + 0,15 €, mais facturation au coût réel + 10 % si interchange et frais de réseau dépassent la commission variable |
| **Carte hors EEE** | UK 2,5 % + 0,25 €, internationale 3,15 % + 0,25 € (+ 2 % si conversion) | 2,5 % + 0,25 € HT |
| **Réseaux** | Larges, dont Apple Pay et Google Pay via Checkout | CB, Visa, Mastercard |
| **Apple Pay / Google Pay en ligne** | ✅ Oui | Non confirmé : doc muette sur le web, sources tierces contradictoires |
| **Remboursement** | Frais initiaux non rendus | Montant des frais non précisé. Exige une provision suffisante |
| **Litige perdu ou reçu** | 20 € reçu + 20 € si contestation | 3 € (CB) ou 25 € (Visa, Mastercard) par impayé, plus commission selon la doc |
| **Reversement** | 2 à 7 jours selon notre spec (non revérifié) | Au plus tard 7 jours ouvrés. Anticipé : 2 % du montant, sur demande |
| **Frais plateforme** | Compte actif 2 €/mois, virement 0,25 % + 0,10 € si la plateforme gère la tarification | Sans objet : pas d'offre plateforme |
| **Compte inactif** | Non relevé | 30 € par an et par compte |
| **Garantie** | Non relevée | Gage-espèces : 1 € au départ, ajustable selon les encaissements et contestations, restitué 13 mois après la fin du contrat |
| **Qui peut ouvrir un compte** | Particuliers et entreprises, large couverture de pays (à revérifier par pays) | Personne physique ou morale **en France**, **pour une activité professionnelle** |
| **Onboarding** | Formulaire hébergé, pilotable par API | Dossier examiné manuellement, « quelques jours ». Des avis parlent de plusieurs semaines |
| **Multi-entités** | Natif | « Vous devez créer un compte distinct » par entité juridique |
| **Webhooks** | Signés, retries sur plusieurs jours | Signés, 15 essais sur ~1,5 jour, « un webhook peut ne jamais vous être délivré » |
| **SDK** | Officiel Node/TypeScript mature | TypeScript annoncé par une page de doc, absent des autres. PHP et Python restent en v1 par défaut |
| **Codes promo Checkout** | ✅ Natif | Seuls des intitulés de rôles les évoquent |
| **Régulation** | Établissement européen (non revérifié ici) | Établissement de paiement français, ACPR n° 11758, groupe Iliad |
| **Sécurité, hébergement** | PCI (non revérifié ici) | PCI DSS niveau 1, hébergé en France chez Scaleway |
| **Réputation** | Non relevée, pas de comparaison possible | Trustpilot 3,1/5 sur 169 avis, 47 % de 1 étoile. Plaintes : fonds bloqués, délai de reversement, support, clôtures sans préavis. Avis non vérifiés, souvent côté TPE |

### Économie par billet (carte EEE standard)

| Prix du billet | Stripe | Stancer (HT) | Écart |
|---|---:|---:|---:|
| 5 € | 0,33 € | 0,19 € | 0,14 € |
| 10 € | 0,40 € | 0,22 € | 0,18 € |
| 15 € | 0,48 € | 0,26 € | 0,22 € |
| 35 € | 0,78 € | 0,40 € | 0,38 € |
| 50 € | 1,00 € | 0,50 € | 0,50 € |

Soit environ 220 € pour 1 000 billets à 15 €. Le traitement TVA des deux grilles reste à comparer.

## 4. Les trois montages examinés

### A. The Playground encaisse sur un compte Stancer unique, puis reverse

**Impossible.**

- CGU art. 2 : le client agit « pour son propre compte ».
- CGU art. 6 (iv) : services utilisés uniquement pour des ventes ou prestations « qu'il fournit ou qu'il réalise lui-même ».
- CGU art. 3.5 : aucun virement sortant, hors remboursement d'un payeur.
- Les « Comptes d'Encaissement » séparent les flux d'une même entité. Ils ne servent pas à gérer des tiers.

### B. Chaque Organisateur ouvre son compte et nous confie ses clés API

**Contractuellement envisageable, produit dégradé.**

- **Organisateurs exclus** : un bénévole sans activité professionnelle, ou une communauté hors de France. Le cas des associations reste à confirmer avec Stancer.
- **Friction** : dossier, gage-espèces, examen manuel. C'est l'inverse du besoin relevé dans l'étude PSP, où le KYC par Organisateur est déjà la douleur principale.
- **Remboursements cassés** : Stancer n'exécute un remboursement qu'avec une provision suffisante (CGU 7.5), et le compte ne peut pas être débiteur (3.5). Une annulation d'événement après le reversement peut donc ne pas rembourser les Participants. Notre produit promet aujourd'hui le contraire.
- **Sécurité** : clés secrètes de paiement de chaque Communauté à chiffrer et stocker. Pas d'OAuth documenté.
- **Fiabilité** : l'inscription naît du webhook. Il faudrait une réconciliation, puisqu'un webhook peut ne jamais arriver, et un suivi des remboursements sans événement dédié.
- **Mobile** : Apple Pay et Google Pay à confirmer, alors que le parcours Participant est mobile d'abord.
- **Coût** : port `PaymentService` à repenser (il décrit un modèle Connect), schéma, route webhook par Communauté, UI, emails, CGU, confidentialité, Aide, landing, blog, tests. Environ 200 références aux champs Stripe dans `src/`. Gros chantier, selon mon estimation.

### C. The Playground devient vendeur des billets

**Hors sujet.** Changement de statut juridique et fiscal, contraire au principe d'intermédiaire technique.

## 5. Usage réel

Mesuré sur la base de dev le 2026-11-07, copie de production dont l'utilisateur le plus récent date du 2026-10-02 :

- 2 Communautés sur 51 ont un compte Connect.
- 1 événement payant, passé, à 35 €.
- 0 inscription payée ou remboursée sur 507.

Dragos confirme le même jour qu'aucun paiement Stripe n'a eu lieu en production. Il n'y a donc pas d'historique à migrer, mais les blocages du § 4 restent entiers et le gain reste nul à ce volume.

## 6. Recommandation

1. **Rester sur Stripe Connect.**
2. **Ne pas lancer de POC Stancer.** Aucun développement tant que la question 1 ci-dessous n'a pas de réponse positive.
3. **Envoyer un email à Stancer** (coût : 10 minutes), car l'absence d'offre plateforme n'est constatée que dans les pages publiques :
   1. Avez-vous une offre plateforme ou marketplace, avec comptes créés par API et reversements vers des tiers ?
   2. Un éditeur peut-il opérer l'API au nom de ses clients, avec un accès délégué ?
   3. Une association loi 1901 ou un organisateur sans SIRET est-il éligible ?
   4. La billetterie d'événements futurs est-elle acceptée, avec quelle réserve ?
   5. Apple Pay et Google Pay sont-ils disponibles sur la page de paiement en ligne ?
   6. Comment rembourser quand le solde est insuffisant ?

**Quand rouvrir le sujet** : si Stancer lance une offre plateforme, ou pour encaisser des revenus propres à The Playground (futur Plan Pro), un cas que ses CGU autorisent.

## Limites de cette analyse

- La grille Stancer date d'août 2024. Un extrait de la page officielle, vu via un moteur de recherche, confirme le 0,7 % + 0,15 €. Le site public lui-même n'a pas pu être lu (rendu en JavaScript).
- Trustpilot : première page seulement.
- La référence OpenAPI de Stancer n'a pas été lue.
- Doc Stancer parfois incohérente : délai de reversement en jours ou jours ouvrés, liste des SDK, remboursement sur TPE.

## Sources

**Stancer**

- [Conditions tarifaires](https://stancer.com/fr/pricing-conditions.pdf)
- [CGU](https://www.stancer.com/fr/cgu.pdf)
- [API v2](https://docs.stancer.com/fr/API.html)
- [Souscrire](https://docs.stancer.com/fr/Subscribe.html)
- [Reversements](https://docs.stancer.com/fr/Concepts/Payouts.html)
- [Remboursements](https://docs.stancer.com/fr/Concepts/Refunds.html)
- [Contestations](https://docs.stancer.com/fr/Concepts/Disputes.html)
- [SDK](https://docs.stancer.com/fr/CMS/SDK.html)
- [Trustpilot](https://fr.trustpilot.com/review/www.stancer.com)

**Stripe**

- [Tarifs France](https://stripe.com/fr/pricing)
- [Tarifs Connect](https://stripe.com/fr/connect/pricing)
- [Destination charges](https://docs.stripe.com/connect/destination-charges)
- [Types de charges](https://docs.stripe.com/connect/charges)
- [Frais sur remboursements](https://support.stripe.com/questions/understanding-fees-for-refunded-payments)

**Sources tierces, contradictoires entre elles**

- [Independant.io](https://independant.io/avis/stancer/)
- [ConnectBanque](https://www.connectbanque.com/fr/avis/stancer)
- [La Fabrique du Net](https://www.lafabriquedunet.fr/logiciel/stancer)
- [MonCRMFrançais](https://www.moncrmfrancais.fr/blog/stancer-vs-stripe-2026/)
