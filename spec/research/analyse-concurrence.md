# Analyse concurrentielle - The Playground

> Dernière mise à jour : février 2026

---

## 1. Meetup.com (Référence modèle fonctionnel)

### Positionnement
Plateforme de découverte et gestion de communautés locales. Unique par son modèle de **groupes récurrents locaux** avec marketplace de découverte intégrée.

> **Pour The Playground** : Meetup est notre **référence modèle** (communautés persistantes, membres, événements récurrents). On reproduit ce modèle avec l'expérience Luma.

### Chiffres clés
- 60M+ membres inscrits
- 330 000+ groupes actifs dans 193 pays
- ~12M visites mensuelles
- ~63M$ de revenu (2025)
- Score Trustpilot : **1.1/5** (577 avis)

### Business model
Abonnement organisateur + upsell membres.

| Plan | Prix |
|------|------|
| Starter (limité) | Gratuit |
| Standard Organizer | ~11-22$/mois |
| Meetup Pro (1 mois) | ~35$/mois |
| Meetup Pro (annuel) | ~25$/mois |
| Meetup+ (côté membre) | Variable selon région |

Gestion de 3 groupes max en Standard. +30$/mois par groupe supplémentaire en Pro.

### Forces
- Effet réseau massif et découverte organique
- Position historique dominante sur les meetups locaux
- Marque reconnue mondialement
- Supporte présentiel + virtuel

### Faiblesses majeures
- **Lock-in des données** : impossible d'exporter les emails des membres
- **Pricing agressif** : triplement des prix en juin 2024 avec préavis minimal
- **Double monetisation** : organizers ET membres payent (Meetup+)
- **Support client** très mal noté, lent et inefficace
- **Bugs récurrents** : scheduling, messages, intégrations
- **Reach organique en baisse** : organisateurs rapportent -50% de nouveaux membres
- **Plateforme vieillissante** : UX décrite comme "unintuitive and unstable"

### Contexte critique : acquisition Bending Spoons (janvier 2024)
- Bending Spoons (propriétaire d'Evernote, WeTransfer, Vimeo) a racheté Meetup
- Pattern connu : acquisition → layoffs massifs → hausse des prix → extraction maximale
- Licenciements de ~10% du staff, relocalisation US → Europe
- Triplement des prix quelques mois après l'acquisition
- **Bending Spoons rachète aussi Eventbrite (décembre 2025, ~500M$)** → même propriétaire pour les 2 plus grosses plateformes
- Migration d'organisateurs en cours vers Lu.ma et Heylo

### Opportunité pour The Playground
Le mécontentement massif des organisateurs Meetup est une **fenêtre d'opportunité historique**. Les douleurs principales (lock-in, pricing, UX) sont exactement ce que The Playground adresse.

---

## 2. Eventbrite

### Positionnement
Marketplace de billetterie événementielle self-service. Leader mondial du ticketing mid-market.

### Business model
Gratuit pour les événements gratuits. Commissions sur les tickets payants.

| Élément | Coût |
|---------|------|
| Service fee | 3.7% + 1.79$ par ticket |
| Payment processing | 2.9% par commande |
| Eventbrite Pro | à partir de 15$/mois |
| Fee effective par ticket | ~10-14% |

### Forces
- Marketplace avec découverte organique massive
- Simplicité d'utilisation
- Pas de coûts upfront
- Scalable (10 à 100 000+ participants)
- Reconnaissance de marque mondiale

### Faiblesses
- Fees élevées (10-14% par ticket)
- Pages concurrentes recommandées sur les event pages
- Analytics basiques
- Personnalisation limitée (templates imposés)
- Email marketing en upsell
- Support client critiqué

### Contexte
Rachat par Bending Spoons (décembre 2025) pour ~500M$. Consolidation avec Meetup sous le même propriétaire → risque de hausse de prix et réduction des features.

### Pertinence pour The Playground
Eventbrite est un concurrent **indirect** : orienté billetterie one-shot, pas communauté récurrente. La consolidation Meetup+Eventbrite sous Bending Spoons renforce l'opportunité pour des alternatives indépendantes.

---

## 3. Luma (lu.ma) (Référence UX/design)

### Positionnement
Plateforme d'événements **event-centric** (malgré leur marketing "community-first"), design premium. Favori de l'écosystème tech/startup.

> **Pour The Playground** : Luma est notre **référence UI/UX uniquement**. On calque le design et l'ergonomie, mais pas le modèle (event-centric, sans rétention communautaire).

### Business model

| Plan | Prix | Fee sur événements payants |
|------|------|---------------------------|
| Free | 0$ | 5% + Stripe fees (~8% total) |
| Plus | 59$/mois (annuel) | 0% (Stripe fees uniquement) |
| Enterprise | Custom | Custom |

### Forces
- **Design exceptionnel** : les pages événements sont les plus belles du marché
- Modèle community-native avec calendriers et abonnés
- Communication multi-canal (email, SMS, push, WhatsApp)
- Intégration Zoom native
- Tier gratuit généreux (événements et invités illimités)
- Croissance rapide (+30% YoY en sign-ups créateurs)
- API + Zapier

### Faiblesses
- **Event-centric, pas de rétention communautaire** : pas de groupe persistant, pas de page communauté, les participants repartent après l'événement
- **Pas de marketplace de découverte** : il faut apporter sa propre audience
- 5% fee sur le tier gratuit
- App mobile limitée
- Suspensions de comptes sans préavis rapportées
- Pas adapté aux très gros événements (10 000+)
- Features enterprise limitées

### Pertinence pour The Playground
Luma est notre **référence UI/UX** : design des pages événement, friction minimale, mobile-first. Mais pas notre référence modèle — Luma est event-centric (l'événement est terminal), The Playground est community-centric (l'événement mène à la Communauté). La page Communauté (absente chez Luma) est notre avantage structurel pour la rétention.

---

## 4. Bevy

### Positionnement
Plateforme enterprise de gestion de communautés décentralisées. White-label.

### Business model

| Plan | Prix |
|------|------|
| Starter | 49$/mois |
| Pro | 1 000$/mois |
| Enterprise | 1 500$+/mois |

### Forces
- White-label (domaine propre du client)
- Modèle chapters/leaders pour communautés globales
- Intégrations CRM profondes (Salesforce, HubSpot, Marketo)
- SOC 2, ISO 27001, GDPR
- 20+ langues
- 4.8/5 sur G2

### Faiblesses
- Prix prohibitif pour petites communautés
- Pricing opaque
- Structure rigide (impose un modèle chapter/leader)
- Fonctionnalités de discussion limitées
- Overkill pour < 20 événements/an

### Pertinence pour The Playground
Bevy cible un segment très différent (enterprise DevRel). Pas un concurrent direct mais une source d'inspiration pour les features multi-communautés et le modèle white-label.

---

## 5. Circle.so

### Positionnement
Plateforme all-in-one pour créateurs : communauté + cours + membership.

### Business model

| Plan | Prix | Transaction fee |
|------|------|----------------|
| Professional | 89$/mois | 4% |
| Business | 199$/mois | réduit |
| Enterprise | 399$/mois | 0.5% |

### Forces
- All-in-one (communauté, cours, events, paiements)
- Gamification (Circle 3.0)
- Workflows d'automatisation
- Apps mobile brandées
- 17 000+ créateurs/marques

### Faiblesses
- Transaction fees qui scaling mal (4% sur 50K$/mois = 2K$/mois de fees)
- Pas de plan gratuit
- Email Hub payant en supplément
- Pas adapté aux communautés event-first

### Pertinence pour The Playground
Circle.so est orienté **communautés de contenu/cours**, pas événements. Concurrent indirect. Le modèle de transaction fees est un anti-pattern que The Playground doit éviter.

---

## 6. Kommunity

### Positionnement
Plateforme communauté + événements, née en Turquie. Positionnement "Eventbrite+" à bas prix.

### Business model

| Plan | Prix | Fee |
|------|------|-----|
| Free | 0$ | 5% sur événements payants |
| Paid | à partir de 7.99$/mois | réduit |

### Forces
- Très abordable
- Combinaison communauté + événements
- Ticketing intégré
- Streaming live (KLive)
- Supporte 10 à 100 000+ participants

### Faiblesses
- Faible notoriété hors Turquie
- Personnalisation limitée
- Pas d'envoi email via SMTP propre
- Écosystème d'intégrations réduit

### Pertinence pour The Playground
Modèle économique proche de celui envisagé pour The Playground. Preuve que le positionnement gratuit + commission fonctionne. Faible menace en Europe.

---

## 7. Mobilizon

### Positionnement
Alternative open source et fédérée à Meetup. Développé par Framasoft (France).

### Business model
Gratuit, open source (AGPL-3.0). Auto-hébergé ou instances publiques.

### Chiffres
- 79 instances mondiales
- ~4 200 groupes
- ~377 000 événements créés (cumulé)

### Forces
- 100% gratuit et open source
- Souveraineté totale des données
- Fédéré via ActivityPub (Fediverse)
- Pas de tracking, pas de pub
- Stack moderne (Elixir/Phoenix + Vue.js)

### Faiblesses
- Adoption très limitée
- UX moins polie que les solutions commerciales
- Pas d'effet réseau
- Auto-hébergement complexe
- Pas de paiement intégré
- Pas d'app mobile native
- Ressources de développement limitées (passage à l'association Kaihuri en 2024)

### Pertinence pour The Playground
Mobilizon valide la demande pour une alternative ouverte et souveraine. Ses limites (UX, adoption, pas de paiement) montrent qu'une approche SaaS managée est nécessaire pour toucher un public large.

---

## 8. Autres acteurs notables

| Plateforme | Focus | Prix | Note |
|------------|-------|------|------|
| **Skool** | Communauté + cours | 99$/mois flat, 0% fee | Croissance rapide, alternative simple à Circle |
| **Mighty Networks** | Communauté + app brandée | 95-425$/mois | "Votre propre réseau social" |
| **Geneva** | Chat communautaire | Gratuit | Chat-first, communautés sociales |
| **Heylo** | Gestion de groupes récurrents | Variable | Cité comme alternative Meetup |
| **Discourse** | Forum de discussion | Gratuit (self-hosted) ou 50$/mois | Open source, standard du forum |
| **Facebook Events/Groups** | Événements + groupes | Gratuit | Reach massif mais algorithmique et cluttered |

---

## 9. Synthèse comparative

| Critère | Meetup | Eventbrite | Luma | Bevy | The Playground (cible) |
|---------|--------|-----------|------|------|----------------------|
| **Approche** | Community-centric | Event-centric | Event-centric | Community enterprise | **Community-centric** |
| **Modèle** | Abo organisateur | Commission tickets | Freemium + commission | SaaS enterprise | **100% gratuit (Stripe fees only)** |
| **Communauté persistante** | Oui (groupes) | Non | Non | Oui (chapters) | **Oui (Circles)** |
| **Rétention membres** | Oui (basique) | Non | Non | Oui | **Oui (page Communauté)** |
| **Discovery** | Oui (fort) | Oui (fort) | Non | Non | **Répertoire simple (sans algo)** |
| **Récurrence native** | Basique | Non | Partielle (calendriers) | Oui | **Oui (Tracks)** |
| **Ownership données** | Non (lock-in) | Limité | Export CSV | White-label | **Oui (export total CSV/JSON + API)** |
| **Coût organisateur** | 11-35$/mois | 0$ (fees sur tickets) | 0-69$/mois | 49-1500$/mois | **0$** |
| **Fee événements payants** | N/A | ~10-14% | 5-8% | 0% | **0% (Stripe fees only ~2.9%)** |
| **IA intégrée** | Non | Basique | Non | Non | **Oui (dès MVP)** |
| **Multi-communautés** | Non (1 orga = 1 groupe) | Non | Non | Oui (chapters) | **Oui (Circles)** |
| **UX/Design** | Daté | Fonctionnel | Excellent | Fonctionnel | **Design-first (benchmark Luma)** |
| **Mobile-first** | Non | Partiel | Partiel | Non | **Oui** |
| **Page event partageable** | Basique | Oui | Excellent | Non | **Oui (porte d'entrée virale)** |

---

## 10. Opportunités stratégiques pour The Playground

### 1. Timing parfait
L'acquisition de Meetup ET Eventbrite par Bending Spoons crée un **exode massif d'organisateurs** cherchant des alternatives. Fenêtre d'opportunité de 12-18 mois.

### 2. Positionnement différenciant confirmé : modèle Meetup + expérience Luma + 100% gratuit
- **Community-centric** (comme Meetup) avec UX premium (comme Luma) — aucun concurrent ne combine les deux
- **Page Communauté = couche de rétention** : prochains événements, membres, identité — ce que Luma n'a pas, en mieux que Meetup
- **100% gratuit (0% commission plateforme)** vs Meetup (abo payant), Luma (5% fee), Eventbrite (10-14% fee)
- **Ownership total des données** (export CSV/JSON + API) vs Meetup (lock-in total)
- **Récurrence native (Tracks)** vs Eventbrite (one-shot) et Luma (calendriers basiques)
- **IA intégrée dès le MVP** : aucun concurrent ne propose d'assistant IA natif pour les organisateurs
- **Répertoire public** de Circles : découverte simple que Luma n'offre pas, sans l'algorithme de Meetup
- **L'événement comme porte d'entrée virale** : page autonome design premium (benchmark Luma), mais qui mène à la Communauté (contrairement à Luma où l'événement est terminal)

### 3. Faiblesses des concurrents à exploiter
- Meetup : prix, lock-in, UX datée, support inexistant, acquisition Bending Spoons → **on prend leur modèle avec une meilleure UX**
- Eventbrite : fees élevées, pas de communauté, rachat Bending Spoons
- Luma : event-centric sans rétention, pas de découverte, fees 5%, pas de récurrence native → **on prend leur UX avec un vrai modèle communautaire**
- Mobilizon : UX limitée, pas de paiement, adoption faible

### 4. Risques à surveiller
- **Effet réseau** : le plus grand défi. Meetup a 60M de membres. Stratégie d'amorçage : dogfooding + ciblage communautés tech FR/EU
- **Luma** : très forte dynamique dans le tech. Risque de devenir le standard avant que The Playground ne soit prêt
- **Consolidation Bending Spoons** : si Meetup+Eventbrite fusionnent bien, la plateforme combinée serait redoutable
- **Monétisation** : le modèle 100% gratuit signifie 0 revenu tant que le Plan Pro n'est pas lancé. Nécessite un plan de financement clair pour la phase de croissance

### 5. Quick wins potentiels
- Outil de **migration depuis Meetup** (import de groupes/membres)
- Cibler les communautés tech françaises/européennes en premier (marché de niche moins compétitif)
- Partenariat avec des communautés existantes mécontentes de Meetup pour du dogfooding
- Pages événement au design premium comme vitrine du produit (chaque événement partagé est une pub pour la plateforme)
