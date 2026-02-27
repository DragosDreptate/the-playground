# Local Events Watcher — Exploration produit

> Fonctionnalité exploratoire : radar d'événements concurrents pour les Organisateurs.
> Ce document trace toutes les discussions, hypothèses et décisions prises sur ce sujet.
> **Aucune implémentation n'est liée à ce document pour l'instant.**
>
> Statut : **En pause** — à reprendre quand l'état DRAFT est implémenté
> Dernière mise à jour : 2026-02-25

---

## Concept

Un **radar d'intelligence compétitive** pour les Organisateurs.

Au moment de créer ou de publier un événement, l'Organisateur peut voir en un coup d'œil **tous les événements qui ciblent un public similaire** dans sa région, à la même période.

Critères de matching (4 axes) :
1. **Lieu** — même ville / même région / rayon géographique
2. **Date/heure** — même jour, ou fenêtre temporelle proche (à définir)
3. **Thématique** — catégorie, mots-clés, tags
4. **Contenu** — similarité sémantique entre descriptions (IA)

Sources : APIs officielles des plateformes événementielles concurrentes (scraping exclu).

---

## Valeur produit

### Pour l'Organisateur

- **Éviter les conflits de date** avec un événement majeur du même écosystème
- **Ajuster le positionnement** de son événement (titre, description, prix) en fonction de l'offre existante
- **Identifier des partenaires potentiels** (co-organisation, cross-promotion) — cercles non concurrents sur le même sujet
- **Mesurer la densité** de son marché local

### Pour The Playground

- Différenciation par rapport à Luma, Meetup, Eventbrite (aucun ne propose ça)
- Stickiness : l'Organisateur revient sur la plateforme pour l'intelligence, pas seulement pour créer des événements
- Levier futur vers le Plan Pro (données enrichies, alertes, historique)

---

## Audit des sources — Résultats de recherche

> Recherche effectuée le 2026-02-25. Décision : APIs officielles uniquement, pas de scraping.
> Sources retenues par l'Organisateur : Meetup, Luma, Eventbrite, Helloasso, Weezevent.

### Verdict par plateforme

| Plateforme | API publique ? | Recherche par lieu/date ? | Auth | Verdict |
| --- | --- | --- | --- | --- |
| **Meetup.com** | ✅ GraphQL (OAuth2 gratuit) | ✅ Oui (lat/lon + date range) | OAuth2 free | ✅ **VIABLE** |
| **Luma (lu.ma)** | ⚠️ REST (Luma Plus payant) | ❌ Non — lecture seul calendrier propre | Abonnement payant | ❌ **HORS SCOPE** |
| **Eventbrite** | ⚠️ REST (OAuth2 free) | ❌ **Search API supprimée en 2020** (définitivement) | OAuth2 | ❌ **HORS SCOPE** |
| **Helloasso** | ⚠️ REST v5 (API key) | ❌ Non — lookup par org ID uniquement | API key free | ❌ **HORS SCOPE** |
| **Weezevent** | ⚠️ REST (API key) | ⚠️ Incertain — recherche par date OK, lieu flou | API key | ❓ **À CREUSER** |

### Analyse critique

**Seul Meetup dispose d'une vraie API de découverte publique** avec recherche par localisation et plage de dates. Les 4 autres sources prévues ne permettent pas de chercher des événements tiers via une API officielle.

**Détail plateforme par plateforme :**

- **Meetup** : API GraphQL (`api.meetup.com/gql-ext`). Recherche par lat/lon, date range, pagination curseur. OAuth2 gratuit. Seule source pleinement viable.
- **Luma** : API REST uniquement pour gérer son propre calendrier. Aucun endpoint de découverte globale. Nécessite Luma Plus (abonnement payant) même pour ça. **Luma bloque délibérément l'accès tiers à ses données.**
- **Eventbrite** : La Search API (endpoint `/v3/events/search`) a été **supprimée définitivement en février 2020**. Seuls les lookups par org ID ou venue ID restent disponibles — inutilisables pour notre cas d'usage.
- **Helloasso** : API v5 bien documentée mais scoped aux organisations. Pour trouver des événements d'une orga, il faut son slug/ID. Aucune recherche géographique globale.
- **Weezevent** : API documentée (`api.weezevent.com`). Fusionne avec Eventix → renommé Weeztix en 2025. Search par date semble disponible, mais support de la recherche géographique flou. À investiguer plus en détail.

### Problème structurant (partiellement résolu)

> ~~Le choix "APIs officielles uniquement" + la liste des 5 sources sont largement incompatibles.~~
>
> **Mise à jour** : après analyse, deux stratégies complémentaires permettent de couvrir l'essentiel :
> - **API Google Events (SerpAPI)** → couvre Luma, Eventbrite, Facebook Events via l'indexation Google
> - **Scraping direct Luma** → envisageable à faible volume (voir section dédiée ci-dessous)

### Luma — Scraping direct envisageable à faible volume

**Analyse technique :**
- `robots.txt` : les pages événements, Discover, et pages ville ne sont **pas bloquées**
- Structure : Next.js avec données injectées dans `<script id="__NEXT_DATA__">` → **simple ****`fetch`**** HTTP suffit**, pas besoin de headless browser
- Scrapers Apify publics existants (`lu-ma-scraper`, `luma-event-scraper`) non bloqués par Luma → preuve de faisabilité

**URL structure Luma :**
- Page ville : `https://lu.ma/{ville}` (ex: `/paris`, `/london`, `/amsterdam`)
- Page Discover globale : `https://lu.ma/discover`
- Filtre catégorie : paramètre `k` dans l'URL (ex: `?k=t` pour tech)

**Stratégie de fetch :**
```
fetch('https://lu.ma/paris')
  → parser HTML → extraire <script id="__NEXT_DATA__">
  → JSON.parse → events[] dans pageProps.initialData
  → filtrer client-side par date (± fenêtre autour de la date cible)
```

**Limitations :**
- Pas de filtre date côté Luma → récupérer tous les events de la page ville → filtrage local
- Structure `pageProps` peut changer sans préavis (risque de maintenance)
- CGU Luma probablement violée (mais données publiques, volume minimal, usage non-commercial)

**Verdict :** viable pour le MVP à faible volume. Risque faible si fréquence basse (< quelques dizaines de req/jour).

### Pistes alternatives à explorer

1. ✅ **SerpAPI / équivalent** → couvre toutes les plateformes indexées par Google
2. ✅ **Scraping Luma direct** → viable à faible volume (voir ci-dessus)
3. **Weezevent à confirmer** — si la recherche géographique est disponible via leur API

## Questions ouvertes — À résoudre

### 1. Périmètre des sources (révisé)

Compte tenu de l'audit, quelles sources retenir ?

**Options :**
- **Option A — Meetup seul** : seule source vraiment viable. Simple, fiable, couvre la cible tech/communautés.
- **Option B — Meetup + Weezevent** (si search géo confirmée) : ajoute la couverture FR mainstream.
- **Option C — Meetup + Google Events via SerpAPI** : couverture maximale (tous les événements indexés par Google, toutes plateformes confondues), mais dépendance à une API tierce payante.
- **Option D — Attendre** que Luma/Eventbrite ouvrent leurs APIs (pas de signal en ce sens).

**Questions :**
- On réduit le scope MVP à Meetup uniquement ?
- On explore SerpAPI/Google Events pour pallier les sources manquantes ?
- Weezevent vaut-il d'être investigué en détail ?

### 2. Ciblage des résultats — axes disponibles

Au-delà de la date et du lieu (axes de base), plusieurs leviers permettent d'améliorer la précision et la pertinence.

#### Axe A — Lieu (géographie)

**Meetup GraphQL**
- Paramètres : `lat` + `lon` + `radius` (en miles, 0–100 ou `smart`)
- Nécessite un geocoding préalable : adresse de l'événement → lat/lon
- Rayon `smart` : Meetup ajuste dynamiquement selon la densité de groupes dans la zone

**SerpAPI**
- Paramètre `q` : inclure la ville directement dans la query (`"tech meetup Paris"`)
- Paramètre `location` : point de référence géographique pour Google
- Pas de rayon en km explicite — Google gère la proximité

**Service de geocoding nécessaire pour Meetup :**
| Option | Coût | Précision | Notes |
| --- | --- | --- | --- |
| Nominatim (OpenStreetMap) | Gratuit | Bonne | Rate limit : 1 req/s, usage commercial ok si attribution |
| Google Maps Geocoding API | $5/1000 req | Excellente | Payant, très précis |
| Adresse Vercel / next.js native | — | — | Pas de geocoding natif |

→ **Nominatim** semble suffisant pour le MVP (1 req/s acceptable, événements créés rarement en rafale).

#### Axe B — Date (temporal)

**Meetup GraphQL**
- Date exacte : `startDateRange` / `endDateRange` au format ISO 8601
- Ex : événement le 15 mars → `startDateRange: "2026-03-15T00:00:00"`, `endDateRange: "2026-03-15T23:59:59"`

**SerpAPI — comportement ****`htichips`**** clarifié**
- Filtres disponibles : `today`, `tomorrow`, `week`, `next_week`, `month`, `next_month` (combinables avec virgule)
- `date:month` = **mois calendaire courant** (1er au dernier jour du mois), PAS les 30 prochains jours
- `date:next_month` = mois calendaire suivant
- Conséquence : créer un événement le 25 du mois + `date:month` → seulement 3–6 jours de couverture (quasi inutile seul)
- **La réponse inclut un champ ****`start_date`**** structuré** → filtrage client-side par date exacte toujours possible
- ⚠️ À confirmer par un test réel en implémentation

**Stratégie : combiner les filtres selon l'horizon, puis filtrer client-side sur ****`start_date`**

| Horizon de l'événement | htichips à combiner | Notes |
| --- | --- | --- |
| Aujourd'hui / demain | `date:today,date:tomorrow` | Précis |
| Ce week-end | `date:weekend` | Samedi–dimanche courant |
| Cette semaine | `date:week` | Jusqu'à dimanche |
| Semaine prochaine | `date:next_week` | Lundi–dimanche suivant |
| Dans 2–5 semaines | `date:month,date:next_month` | Couvre jusqu'à fin du mois suivant |
| Dans 6–8 semaines | `date:next_month` | Mois suivant uniquement |
| Au-delà de 2 mois | ⚠️ Pas de filtre adapté | Non viable — Meetup seul |

**Filtre format événement :** `event_type:Virtual-Event` pour isoler ou exclure les événements en ligne (combinable avec les filtres date).

→ **SerpAPI viable jusqu'à \~8 semaines d'horizon.** Toujours coupler avec filtrage client-side sur `start_date`.

#### Axe C — Audience similaire (thématique)

C'est le levier de ciblage le plus puissant. Plusieurs niveaux de précision :

**Niveau 1 — Catégorie Communauté → categoryId Meetup**
Meetup expose une taxonomie de Topic Categories. Mapper nos catégories Communauté :
```
TECH         → Meetup topic "Technology" (ID à récupérer via Topics API)
SPORT        → Meetup topic "Sports & Fitness"
ART_CULTURE  → Meetup topic "Arts & Culture"
BUSINESS     → Meetup topic "Career & Business"
...
```
Simple, zéro coût, bonne précision.

**Niveau 2 — Catégorie Communauté → mots-clés de requête**
Enrichir la query `q` avec des termes représentatifs de la catégorie :
```
TECH         → "tech developer startup coding"
SPORT        → "sport fitness yoga running"
ART_CULTURE  → "art culture expo vernissage"
SCIENCE_EDUCATION → "science formation atelier"
```
Applicable sur les deux sources (Meetup + SerpAPI).

**Niveau 3 — Titre de l'événement → mots-clés extraits**
Extraire les 3–5 termes les plus significatifs du titre de l'événement créé, les injecter dans la query.
- Ex : "Workshop React avancé Paris" → query enrichie avec "react workshop javascript"
- Peut se faire avec un `split` + stopwords simples (sans IA)
- Ou via un prompt Claude léger : "extrait 3 mots-clés de ce titre d'événement"

**Niveau 4 — Description → mots-clés (IA)**
Analyse sémantique de la description complète → extraction des thèmes principaux → enrichissement de la query.
- Plus précis mais plus coûteux (appel Claude ou embeddings)
- À réserver en V2

→ **MVP recommandé : Niveau 1 + Niveau 2** (catégorie → topic Meetup + mots-clés fixes par catégorie). Simple, gratuit, pertinent.

#### Axe D — Post-fetch filtering (côté serveur/client)

Après réception des résultats bruts, plusieurs filtres supplémentaires applicables :

1. **Filtre date exact** (pour SerpAPI) — conserver uniquement les résultats dont `start_date` correspond à la date de l'événement ± 1 jour
2. **Filtre distance réelle** — calculer la distance en km entre l'adresse de l'événement et celle des résultats (via formule Haversine, sans API)
3. **Déduplications** — un même événement Meetup peut apparaître dans Meetup API ET SerpAPI → dédupliquer par URL ou titre normalisé
4. **Filtre format** — exclure les événements en ligne des résultats géographiques (ou les segmenter dans un onglet séparé)
5. **Score de pertinence composite** — combiner : catégorie matchée (booléen) + mots-clés partagés (count) + distance (km) → score 0–100 → afficher par score décroissant

#### Axe E — Format de l'événement (en ligne vs présentiel)

- Si l'événement The Playground est **en ligne** : le radar géographique n'a pas de sens → afficher les événements en ligne concurrents sur le même thème (global)
- Si **présentiel** : radar géographique normal
- Détection : champ `locationType` de l'entité Moment (`ONLINE` vs `PHYSICAL`)

### 3. Définition du rayon géographique

Qu'est-ce qu'un "événement proche" en termes de lieu ?

| Option | Avantage | Inconvénient |
| --- | --- | --- |
| Même ville exacte | Simple, fiable | Trop restrictif pour petites villes |
| Rayon en km configurable (ex : 30km) | Flexible | Requiert geocoding + calcul de distance |
| Même département | Simple (code INSEE) | Pas de sens géographique réel |
| Même zone de chalandise (NUTS-3) | Pertinent économiquement | Complexe à implémenter |
| Même "région événementielle" (custom) | Pertinent | Nécessite une définition manuelle |

**Questions :**
- L'Organisateur configure le rayon lui-même ?
- Default : ville ou rayon de X km ?
- Online events : traitement spécial (visibilité mondiale, donc out of scope ?)

### 3. Fenêtre temporelle

Qu'est-ce qu'un "conflit de date" ?

| Option | Description |
| --- | --- |
| Même jour exact | Jour J uniquement |
| ±1 jour | Veille + lendemain |
| Même week-end | Si événement le week-end |
| Même semaine | Lundi → dimanche |
| Même heure ± 2h | Fenêtre fine (conflit direct) |

**Questions :**
- Distinguer "même heure" (conflit direct) vs "même semaine" (concurrence indirecte) ?
- Visualisation différente selon la temporalité du conflit ?

### 4. Matching sémantique

Comment mesurer la similarité entre deux événements ?

| Approche | Description | Coût |
| --- | --- | --- |
| **Catégories / tags** | Matching sur catégories normalisées (TECH, SPORT, etc.) | Faible |
| **Mots-clés TF-IDF** | Extraction et comparaison de mots significatifs | Faible-moyen |
| **Embeddings** | Vectorisation des descriptions + similarité cosinus | Moyen (appel API LLM) |
| **LLM classifier** | Prompt Claude : "ces deux événements ciblent-ils le même public ?" | Élevé |
| **Hybride** | Catégories + embeddings (rapide + pertinent) | Moyen |

**Questions :**
- Quelle précision est acceptable ? (faux positifs vs faux négatifs)
- L'embeddings sur descriptions implique un appel API par paire d'événements scrapés — coût à modéliser
- On utilise Claude (déjà dans le stack) ou un modèle dédié embeddings (text-embedding-3-small d'OpenAI) ?

### 5. UX — Où et quand afficher ça ?

**Dépendance confirmée : état ****`DRAFT`**** requis**
L'état `DRAFT` est un prérequis pour le cas d'usage principal du Radar. Sans `DRAFT`, l'événement est immédiatement public à la création — l'Organisateur n'a plus de fenêtre pour consulter le Radar et ajuster.

Avec `DRAFT` : `Créer → DRAFT → consulter Radar → ajuster si besoin → Publier`

**Parcours cible (avec DRAFT) :**
```
Formulaire création → sauvegarde DRAFT → page événement DRAFT → [Radar accessible] → Publier
```

**Deux points d'entrée :**

| Point d'entrée | Description | Moment |
| --- | --- | --- |
| **A — Formulaire de création** | Signal léger après saisie date + lieu : "X événements similaires détectés" → lien vers le Radar complet | Pendant la création |
| **B — Page événement DRAFT** | Vue complète du Radar (onglet ou section) — accessible tant que l'événement est en DRAFT ou publié | Avant et après publication |

**Format d'affichage — 3 options mockupées :**

| Option | Description | Fichier mockup |
|---|---|---|
| **A — Onglet "Radar"** | Tab bar Détails / Inscriptions / Radar sur la page événement dashboard. Cards avec dots de conflit (rouge/amber/gris) et légende. | `spec/mockups/radar-option-a-tab.mockup.html` |
| **B — Section inline** | Section intégrée dans la page DRAFT sous le bouton Publier. Fond légèrement différencié, skeleton loader. | `spec/mockups/radar-option-b-inline.mockup.html` |
| **C — Modale** | Bouton "Radar" avec badge numérique dans le header. Modale avec séparation "Même jour / Même semaine", backdrop blur. | `spec/mockups/radar-option-c-modal.mockup.html` |

**Questions ouvertes :**
- Quelle option UX retenir parmi A / B / C ?
- Le Radar reste-il accessible après publication (pour monitoring continu) ?
- Déclenchement : automatique à l'ouverture de la page DRAFT ou on-demand (bouton) ?

### 6. Fraîcheur des données

| Approche | Description | Complexité |
| --- | --- | --- |
| **Temps réel** | Scraping au moment de la demande | Élevée, lente (5-30s) |
| **Cache quotidien** | Job CRON scrape toutes les 24h | Moyenne |
| **Cache à la création** | Scraping déclenché à la publication de l'événement | Faible |
| **On-demand avec cache** | Scraping si cache > 4h, sinon données cachées | Moyenne |

### 6. Légalité et éthique

**Décision** : APIs officielles uniquement. Pas de scraping.

**Implications RGPD** : les données retournées par les APIs (nom d'événement, organisateur, lieu, date) sont des données publiques publiées volontairement par les organisateurs. Usage en lecture seule, pas de stockage longue durée → risque RGPD minimal.

**Point à préciser** : on stocke les résultats en cache (TTL court) ou on affiche à la volée ? Si cache : durée maximale à définir (suggestion : 24h).

---

## Hypothèses initiales (à valider)

1. La valeur principale est l'**évitement de conflit de date pour une audience similaire** — pas l'analyse concurrentielle fine
2. Les Organisateurs actifs (qui créent souvent des événements) sont les utilisateurs cibles, pas les débutants
3. La couverture France > couverture globale au départ
4. ~~Eventbrite + Meetup couvrent 80% du cas d'usage FR~~ → **Meetup seul est viable via API officielle** (Eventbrite Search API supprimée en 2020)
5. Un cache de 24h est acceptable pour ce type d'information
6. Le matching par **catégorie + rayon géographique** suffit pour un MVP — l'IA (embeddings) est un nice-to-have V2
7. **Audience similaire = même catégorie Communauté** (TECH, SPORT, ART_CULTURE, etc.) — pas de matching sémantique au MVP

---

## Approches techniques (révisées post-audit)

### Option A — Meetup seul (MVP minimal)

**Source unique** : Meetup GraphQL API
- ✅ Recherche par lat/lon + date range nativement
- ✅ OAuth2 gratuit
- ✅ Audience cible parfaitement alignée (communautés tech, sport, culture)
- ⚠️ Couverture partielle — les événements Eventbrite/Luma absents
- Complexité : faible

**Stack** :
```
Meetup GraphQL endpoint → Server Action → cache Redis/Vercel KV (TTL 24h) → affichage Radar
```

### Option B — Meetup + Weezevent (MVP FR étendu)

Ajoute Weezevent si la recherche géographique est confirmée.
- ✅ Double couverture FR
- ⚠️ Weezevent search géo à valider techniquement
- Complexité : faible-moyenne

### Option C — Meetup + API Google Events (couverture maximale)

Un proxy API (SerpAPI ou équivalent) qui retourne les résultats "Events" de Google Search — lequel indexe Luma, Eventbrite, Facebook Events, Meetup, etc.
- ✅ Couverture toutes plateformes confondues (tout ce que Google indexe)
- ✅ Légal (on interroge une API officielle, pas les plateformes directement)
- ✅ Free tier disponible selon le fournisseur choisi
- ⚠️ Dépendance à un tiers supplémentaire
- ⚠️ Fraîcheur des données dépend de l'indexation Google (pas temps réel)
- ⚠️ Pas de date arbitraire côté input — workaround : filtres fixes + filtrage client-side sur `start_date` retourné
- Complexité : faible (API REST simple)

**Filtres disponibles (communs à tous les fournisseurs, car c'est le comportement Google) :**
```
htichips = date:today | date:tomorrow | date:week | date:weekend |
           date:next_week | date:month | date:next_month
           (combinables avec virgule)

event_type = Virtual-Event   ← exclure ou isoler les événements en ligne
```

**Comparatif des fournisseurs :**

| Service | Free tier | Prix payant | Google Events | Notes |
| --- | --- | --- | --- | --- |
| **SerpAPI** | 250 req/mois | $75/5k ($15/1k) | ✅ Mature, bien documenté | Référence du marché |
| **HasData** | 200 req/mois | $49/mois 40k (~$1.2/1k) | ✅ Endpoint dédié | Beaucoup moins cher à l'échelle |
| **SearchAPI.io** | 100 req (crédit unique) | $4/1k → $1/1k | ✅ Endpoint dédié | Free tier trop limité |
| **Serper.dev** | 2 500 req (crédit unique) | $1/1k → $0.30/1k | ⚠️ Non confirmé events | Meilleur prix général, mais events flou |
| **Apify** | $5 crédit offert | ~$1–3/1k | ✅ Actor dédié (partiel) | Pay-per-use, certains actors dépréciés |

→ **SerpAPI pour le MVP** (mieux documenté pour Google Events, free tier récurrent 250/mois). **HasData en V2** si la plateforme monte en volume (10× moins cher).

### Option D — Hybride Meetup + SerpAPI

Meetup pour la richesse des données communautaires (catégories, membres, groupes), SerpAPI pour la couverture des plateformes non accessibles via API (Luma, Eventbrite, FB Events).
- Meilleure couverture + données structurées Meetup
- Free tier SerpAPI viable pour le MVP
- ❌ Même limitation date que Option C : SerpAPI ne supporte pas les dates arbitraires
- Complexité : moyenne
- Coût MVP : $0 (SerpAPI free + Meetup OAuth gratuit)

### Recommandation provisoire (révisée)

> **Meetup GraphQL seul reste la source la plus précise** pour la recherche par date exacte + lieu. SerpAPI apporte de la couverture (Luma, Eventbrite) mais avec une précision temporelle dégradée (`date:month` uniquement pour les événements futurs à +7 jours).
>
> Question ouverte : est-ce qu'une couverture large mais avec filtre de date imprécis (SerpAPI) vaut mieux que Meetup seul avec date exacte ?

---

## Inspirations / références

- **Luma "Conflicts"** : Luma affiche déjà en interne les conflits de date entre événements du même créateur (pas entre créateurs différents)
- **Eventbrite "Event Recommendations"** : pour les Participants, pas pour les Organisateurs
- **PredictHQ** : le leader des APIs d'événements agrégés — https://www.predicthq.com/
- **Ticketmaster Discovery API** : events + performances à large échelle
- **Google Events** (via structured data) : les événements indexés avec schema.org/Event pourraient être récupérés via une API Knowledge Graph — à creuser

---

## Journal des décisions

> Les décisions structurantes sont tracées ici au fil de la discussion.

| Date | Sujet | Décision | Raison |
| --- | --- | --- | --- |
| 2026-02-25 | Création du document | Exploration ouverte, aucune implémentation | Cadrage initial |
| 2026-02-25 | Approche légale | **APIs officielles uniquement** — pas de scraping | Risque légal, maintenabilité |
| 2026-02-25 | Sources souhaitées | Meetup, Luma, Eventbrite, Helloasso, Weezevent | Choix initial utilisateur |
| 2026-02-25 | Sources réellement viables | **Meetup** (API GraphQL) + **SerpAPI Google Events** (proxy) + **Luma scraping direct** (faible volume) | Audit API : Eventbrite Search API supprimée 2020, Helloasso sans recherche géo. Luma scrapeable via **NEXT\_DATA** sans headless browser. |
| 2026-02-25 | Valeur principale | **Éviter les conflits de date pour une audience similaire** | Décision utilisateur |
| 2026-02-25 | UX placement | **Onglet ou modale "Radar"** — à affiner | Décision utilisateur (en cours) |
| 2026-02-25 | Matching sémantique | **Par catégorie Communauté** (MVP) — embeddings en V2 | Pragmatisme, coût minimal |
| — | Rayon géographique | À décider | — |
| — | Fenêtre temporelle | À décider | — |
| — | Fraîcheur données / cache | À décider | — |
| 2026-02-25 | Sources MVP | **Meetup + SerpAPI (Option D)** — free tier SerpAPI (250 req/mois) viable pour le MVP avec cache 24h | Couverture max à coût $0 |

---

## Points bloquants identifiés

1. ~~Légalité du scraping~~ → **résolu** : APIs officielles uniquement
2. **Couverture limitée** — Luma (concurrent direct) est inaccessible via API. Eventbrite Search API supprimée définitivement. On couvre surtout l'écosystème Meetup (communautés), moins l'écosystème pro/corporate.
3. **Weezevent à confirmer** — la recherche géographique via leur API est documentée de façon floue. Nécessite un test technique.
4. **Rayon géographique** — le lieu saisi par l'Organisateur peut être une adresse, une ville, ou "en ligne". Il faut un geocoding (lat/lon) pour requêter Meetup. Quel service de geocoding ? (Google Maps Geocoding, Nominatim/OpenStreetMap, etc.)
5. **Événements "en ligne"** — out of scope du radar géographique ? À clarifier.
6. **Décision sources MVP** — Meetup seul suffisant, ou besoin de SerpAPI pour couvrir Luma/Eventbrite ?

---

*Document vivant — mis à jour à chaque session de travail sur ce sujet.*
