# Trouver tous les événements de sa ville au même endroit

> Statut : **Cadrage**, non implémenté. Ouvert le 2026-10-08.
> Base existante : le Radar organisateur ([local-events-watcher.md](local-events-watcher.md)), qui interroge déjà Luma, Eventbrite et Meetup.

## Problème

1. **The Playground manque encore de masse.** Pas assez de trafic, de Communautés et d'événements pour qu'un visiteur y trouve d'emblée de quoi remplir son agenda. Sans visiteurs, les Organisateurs ne viennent pas ; sans Organisateurs, pas de visiteurs.
2. **Chercher ses événements est pénible pour tout le monde.** Une soirée produit est sur Luma, un meetup tech sur Meetup, un atelier sur Eventbrite, une conférence sur HelloAsso ou Weezevent. Pour savoir ce qui se passe dans sa ville sur un sujet, il faut ouvrir cinq sites, refaire cinq recherches, et on en rate toujours.

## Opportunité

Faire de The Playground **l'endroit où l'on cherche ses événements**, toutes plateformes confondues. La recherche devient une porte d'entrée : on vient pour trouver un événement ailleurs, on découvre au passage les Communautés et les événements hébergés ici, et une partie des visiteurs reste.

C'est un levier d'acquisition, pas une fin en soi : chaque visite doit avoir une chance de se convertir (inscription, adhésion à une Communauté, création d'une Communauté).

## Paysage concurrentiel (recherche du 2026-10-08)

**Constat : en France, aucun site grand public établi ne réunit les événements de Luma, Meetup et Eventbrite en un seul endroit.** Ce qui s'en approche se range en trois familles.

**Agrégateurs tech européens** (les plus proches de cette spec)

| Acteur | Ce qu'il fait | Limites relevées |
|---|---|---|
| [Brainberg](https://brainberg.eu/) ([code](https://github.com/Pwuts/brainberg)) | Agenda tech européen (meetups, conférences, hackathons, ateliers). Sources : Luma, Meetup, Eventbrite, dev.events, confs.tech, plus des pages d'événements lues par leurs données structurées. Collecte planifiée, dédoublonnage entre sources. ~1 400 événements à venir annoncés en Europe. Projet solo, TypeScript | Rate beaucoup d'événements (constaté par Dragos, expliqué par le code : voir l'analyse ci-dessous). Paris absent des villes mises en avant. Licence MIT annoncée sur le site, mais aucun fichier de licence dans le dépôt : s'en inspirer, ne pas copier |
| [dev.events](https://dev.events/EU/FR) | Conférences, meetups et hackathons pour développeurs, filtrables par ville française et par thème | Public développeurs uniquement. Mode d'alimentation non documenté (saisie ou collecte) |

**Agrégateurs généralistes**

| Acteur | Ce qu'il fait | Limites relevées |
|---|---|---|
| [AllEvents](https://allevents.in/paris/startup) | Agenda mondial (40 000+ villes) alimenté par plusieurs sources, avec des pages Paris par thème | Fiches périmées, doublons, qualité inégale (avis relevés dans les comparatifs) |
| [OpenAgenda](https://openagenda.com/) | Agendas ouverts et fédérés : un événement saisi une fois, diffusé sur plusieurs agendas. Très utilisé par les communes et la culture | N'importe pas Luma ni Meetup. Absent des communautés tech. Reste candidat comme **source** (voir le tableau des plateformes) |

**Outils d'extraction et assistants** (briques ou services, pas des sites de découverte)

| Acteur | Ce qu'il fait |
|---|---|
| [Events Finder](https://apify.com/luis.pinto/events-finder) et [Event Scraper Pro](https://apify.com/webdatalabs/event-scraper-pro) (Apify) | Extraient Luma, Eventbrite et Meetup en une passe et fusionnent les résultats. Events Finder note chaque événement avec un modèle d'IA selon un profil, comme notre Radar |
| [Scouty](https://www.meetscouty.com/blog/best-event-discovery-apps-2026) | Assistant IA qui surveille le web et prévient sur WhatsApp quand un événement correspond aux centres d'intérêt décrits. Américain, pas de couverture française annoncée |

**Ce qu'on trouve aujourd'hui côté France** : les pages de chaque plateforme, qui ne montrent que leurs propres événements ([Luma Paris](https://luma.com/paris), [Meetup](https://www.meetup.com/fr-FR/find/)), des communautés qui tiennent leur propre agenda ([AI Tinkerers Paris](https://paris.aitinkerers.org/)), et des listes tenues à la main (agenda de Maddyness, guides annuels, newsletters).

**Ce qu'on en retient**

1. **La place est libre en France** : personne ne couvre « tous les événements de ma ville, toutes plateformes confondues », bien fini et en français.
2. **Le concept est validé ailleurs**, et les acteurs existants butent sur nos difficultés déjà notées : dédoublonnage entre plateformes, collecte quotidienne, qualité dans la durée (voir « Fiabilité et surveillance »). La qualité des résultats est donc le premier critère de différence.
3. **Aucun ne va au-delà de la liste.** Notre différence structurelle : un événement trouvé ailleurs peut mener vers une Communauté qui dure (cf. positionnement community-centric). C'est elle qui transforme l'outil de recherche en levier d'acquisition.
4. **Le code de Brainberg a été lu** (analyse ci-dessous) : il confirme que la couverture se joue sur la façon d'interroger chaque source, et donne une base de dédoublonnage réutilisable en idée.

Points non vérifiés : mode d'alimentation de dev.events, chiffres d'AllEvents (tirés d'un comparatif tiers).

### Analyse du code de Brainberg (2026-10-09)

Lecture du dépôt `Pwuts/brainberg` (dernier commit de juillet 2026), centrée sur les points qui nous concernent.

**Pourquoi il rate des événements : chaque source est interrogée de façon étroite**

| Source | Ce que fait Brainberg | Conséquence | Notre approche (Radar) |
|---|---|---|---|
| Luma | Ne lit que des **calendriers Luma ajoutés à la main** par l'admin (`scraperSources`), paginés en entier | Aucun événement hors de ces calendriers. Pas de découverte par ville | Recherche par coordonnées sur toute la ville (`discover/get-paginated-events`) |
| Meetup | Lit la page HTML `meetup.com/find` par ville (données `__NEXT_DATA__`), **catégorie Tech uniquement**, **première page seulement** (aucune pagination) | Quelques dizaines d'événements par ville au mieux | API GraphQL du site, paginée par curseur |
| Eventbrite | API Eventbrite avec jeton (`/v3/destination/search/`), mot-clé fixe `tech`, **par pays** (pas par ville), **10 pages au plus par pays** | Un plafond pour toute la France, quel que soit le volume réel | Page de recherche HTML par ville (JSON-LD) |
| Toutes | Filtre de mots exclus sur le titre (soirée, yoga, cocktail…), puis **modération par Claude Haiku** des nouveaux événements, qui peut rejeter ou mettre en attente | Le périmètre « tech » est voulu, mais des faux rejets sont possibles sans relecture | Pas de filtre éditorial au-delà du mot-clé |

Leçon pour nous : **la couverture dépend d'abord de la façon d'interroger chaque source**, avant toute question de dédoublonnage ou d'affichage. Nos mesures du radar (voir « Volumes mesurés ») couvrent déjà beaucoup plus large.

**Dédoublonnage entre sources : trois couches, une base réutilisable en idée**

1. **Même lien** : toutes les URL connues de l'événement (page, inscription, source) sont normalisées et stockées comme empreintes. Une URL déjà vue = même événement.
2. **Empreinte exacte** : titre normalisé (minuscules, sans année, sans « meetup », « conference »…) + jour + ville, ou « online ».
3. **Rapprochement approximatif** : mots du titre en commun à plus de 60 % (indice de Jaccard), début à moins d'un jour d'écart, même ville si les deux en ont une.

En cas de doublon, l'événement garde **toutes ses sources** (table de liaison), et une source plus fiable peut écraser les champs : Eventbrite > Meetup > Luma. Les pourcentages de doublons attrapés par couche, dans leur document de cadrage (`plans/archive/data-source-analysis.md`), sont des estimations, pas des mesures.

Défauts à ne pas reproduire :
- **La normalisation supprime les lettres accentuées** (`[^a-z0-9]`) : « Café IA » devient « caf ia ». Sans effet entre deux titres identiques, mais elle fausse le rapprochement approximatif en français. Il faut d'abord retirer les accents, puis normaliser.
- **Le rapprochement approximatif ne compare que 50 candidats**, pris sur toute l'Europe à ±1 jour, sans filtre de ville ni tri. Au volume de Paris (des centaines d'événements par mois et par source), des doublons passeraient à travers. Il faut filtrer par ville ou par distance avant de comparer.
- **La ville comparée est un texte** : « Paris » et « Paris 11e » ne correspondent pas. Comparer plutôt une distance entre coordonnées.

**Collecte planifiée et fiabilité**

- Une route protégée par un secret lance toutes les collectes, une par une, ou une seule source. Chaque passage est journalisé (`scraperRuns`) : trouvés, créés, mis à jour, doublons, rejetés, en attente, erreurs. Un écran d'admin permet de prévisualiser une collecte avant de l'enregistrer.
- Aucune alerte quand une source tombe à zéro : le compteur existe, personne n'est prévenu. C'est le même défaut que celui relevé sur notre radar (« Fiabilité et surveillance »).
- **Événements annulés ou supprimés à la source : non traités.** La date de dernière vue est enregistrée mais rien ne s'en sert. Un événement annulé reste affiché. À prévoir chez nous si on stocke les événements.

**Géocodage** : Nominatim (OpenStreetMap), gratuit mais limité à une requête par seconde, pour les villes inconnues et les adresses sans coordonnées. Les villes sont une table de ~100 entrées, complétée au fil des collectes.

**Ce qu'on en retient pour #630**

1. **Reprendre l'idée du dédoublonnage en trois couches** (lien, empreinte exacte, rapprochement approximatif), en corrigeant les trois défauts ci-dessus, et garder toutes les sources d'un même événement.
2. **Journaliser chaque collecte par source**, comme `scraperRuns`, et y brancher l'alerte qui leur manque.
3. **Prévoir dès le départ la disparition des événements annulés**, en s'appuyant sur la date de dernière vue.
4. **Ne rien copier tel quel** tant qu'aucune licence n'est publiée dans le dépôt.
5. **Piste à vérifier** : l'API Eventbrite `/v3/destination/search/` avec un jeton personnel et une pagination par `continuation`. Si elle accepte une recherche par ville, elle serait plus solide que notre lecture de la page HTML. Non testé.

## Solution envisagée

### Étape 1. Une page publique de recherche multi-plateformes

- Ville, période, mot-clé : une seule recherche, les résultats de toutes les plateformes réunis, dédupliqués, triés par date.
- **Le plus de plateformes possible**, ajoutées au fil de l'eau. La base technique existe : le Radar organisateur interroge déjà trois plateformes avec la même forme de résultat.
- Chaque résultat renvoie **directement vers la page de l'hébergeur** de l'événement. The Playground ne republie pas le contenu et ne prend pas l'inscription.
- Les événements hébergés sur The Playground apparaissent dans les mêmes résultats, mis en avant.

### Étape 2. Les événements des autres plateformes dans l'Explorer

- L'Explorer, aujourd'hui annuaire de Communautés publiques, affiche aussi ces événements, avec le même renvoi vers l'hébergeur.
- Les événements The Playground restent distingués (badge, place, parcours d'inscription intégré).

## Plateformes candidates

| Plateforme | État | Remarque |
|---|---|---|
| Luma | ✅ Déjà interrogée | API non officielle : recherche par coordonnées et mot-clé (voir « Acquis du radar ») |
| Eventbrite | ✅ Déjà interrogée | Page de recherche (JSON-LD) : ville, mot-clé, dates. Recherche floue |
| Meetup | ✅ Déjà interrogée | API GraphQL interne du site, non documentée : position, rayon, mot-clé, dates |
| OpenAgenda | À explorer | API publique documentée, très présente sur les agendas culturels et institutionnels en France |
| Mobilizon | À explorer | Logiciel libre et fédéré, API ouverte. Retirée du Radar pour faible volume, à réévaluer pour un usage grand public |
| Weezevent | À explorer | Recherche géographique non confirmée (voir le Radar) |
| HelloAsso | À explorer | Pas de recherche géographique publique connue |
| Billetweb, Sortir à Paris, agendas locaux | À explorer | À qualifier une par une |

## Acquis du radar (2026-10-08)

Travail fait sur le Radar organisateur et le lab (`/lab/events-radar`) en octobre 2026, réutilisable ici. Détail technique dans [local-events-watcher.md](local-events-watcher.md) et `spec/decisions.md` (entrées du 2026-10-08).

### Comportement réel des trois sources

**Luma** (`api.lu.ma/discover/get-paginated-events`, API non officielle, sans authentification)
- **Ignore le nom de ville** (`near`) et place la recherche d'après l'adresse IP de l'appelant. En prod (serveurs Vercel), on obtenait 1 événement parisien sur 7. Il faut passer `latitude` et `longitude`.
- **Avec un mot-clé, 50 résultats au plus**, sans aucune page suivante : `has_more` vaut `false`, et aucun paramètre d'offset ou de curseur ne change rien (tous testés).
- **Sans mot-clé, pagination par curseur** (`has_more`, `next_cursor`, renvoyé en `pagination_cursor`), dans l'ordre des dates de début. On peut donc parcourir toute une ville sur une période, ce qui compte pour une collecte planifiée (Q3).
- `pagination_limit` plafonne à 50. Les résultats d'une page ne sont pas triés par date.
- Il faut filtrer soi-même : présentiel (`location_type: offline`) et ville (`featured_city.slug`, `geo_address_info.city_state`). Ce filtre par nom écarte aujourd'hui les communes voisines (Boulogne-Billancourt pour Paris).

**Eventbrite** (page `eventbrite.fr/d/<pays--ville>/events/?q=&start_date=&end_date=&page=N`, lecture du JSON-LD)
- Événements dans une `ItemList` JSON-LD, 20 par page. La page expose `page_count` et `object_count`.
- **Recherche floue** : « IA » à Paris du 08/10 au 01/11 annonce 1 481 résultats (49 pages), **plus que sans mot-clé** (1 251). La pertinence s'effondre vite : 12 titres sur 20 liés à l'IA en page 1, 1 sur 20 en page 3, aucun en pages 10 et 30. Un mot-clé introuvable renvoie des résultats génériques.
- La ville passe par un identifiant d'URL (`france--paris`), aujourd'hui pris dans une table de 11 villes.

**Meetup** (`www.meetup.com/gql2`, API GraphQL interne du site, non documentée, sans authentification)
- Avec mot-clé : `eventSearch`. Sans mot-clé : `recommendedEvents` (`eventSearch` ne renvoie rien sans texte).
- Filtres respectés : position, rayon (25 km), présentiel (`eventType: PHYSICAL`), plage de dates en UTC, élargie d'un jour puis refiltrée sur la date locale.
- **Pagination par curseur** (`first: 50`, `after`, `pageInfo { hasNextPage endCursor }`). L'API filtre déjà sur la période, donc chaque page reste dans la fenêtre.
- La page de recherche du site ignore les dates demandées : seule l'API les respecte.
- **Choix assumé pour le radar** (décision E2) parce que le volume est inférieur à une requête par mois, **à réévaluer explicitement pour une page publique** (Q1, Q3). D'après ce qu'on en sait, sans vérification, l'API officielle est réservée aux abonnés Meetup Pro.

### Volumes mesurés (Paris, du 08/10 au 01/11/2026)

| Recherche | Luma | Eventbrite | Meetup |
|---|---|---|---|
| « IA », une page (radar actuel) | 7 | 10 gardés | 10 |
| « IA », toutes les pages (lab) | 13 (plafond de 50 de l'API) | 1 481 annoncés, surtout hors sujet | 58 (60 au total côté API) |
| Sans mot-clé, toutes les pages | 212 (limite de 10 pages) | 1 251 annoncés | 420 (limite de 10 pages, sans doute davantage) |

Durée d'une recherche du lab sans mot-clé, Luma et Meetup réunis : environ 7 s. À l'échelle d'une grande ville, on parle de **plusieurs centaines à plus d'un millier d'événements par mois et par source**, ce qui plaide pour la collecte planifiée avec stockage (Q3) plutôt que pour une recherche à la volée.

### Géocodage

- La position vient de la **recherche de lieux de Google Places** (`places:searchText`), avec la même clé que l'autocomplétion d'adresse, via l'adapter `createGooglePlacesService` du port `PlacesService`. `regionCode: "fr"` oriente les noms ambigus (Valence, Saint-Denis) vers la France sans exclure les autres pays.
- L'API Geocoding de Google n'est pas activée sur le projet. Sans facturation Google active, Luma et Meetup ne renvoient plus rien.
- Coût : un appel au tarif « Pro » de Text Search (le champ position y oblige). C'est dans le quota gratuit au volume du radar, **à chiffrer pour une page publique**. Un cache par ville le réduirait presque à zéro.
- **Piste** : le formulaire d'événement reçoit déjà les coordonnées de l'autocomplétion, mais ne garde que le texte. Les stocker sur l'événement servirait directement l'Explorer et la mise en avant des événements The Playground par proximité (changement de schéma).

### Fiabilité et surveillance

- Meetup et Eventbrite ont rendu **zéro événement en silence pendant une durée inconnue**, après des changements de format de leurs pages. Le radar écrit maintenant un avertissement quand une source répond hors du format attendu, mais personne ne le lit. Une page publique aura besoin d'une vraie alerte, par exemple un nombre de résultats anormalement bas par source.
- Le dédoublonnage ne se fait que par URL. Un même événement publié sur Luma et sur Eventbrite apparaît deux fois : il faudra un dédoublonnage entre plateformes (titre, date, lieu).

### Code disponible

- `src/lib/events-radar.ts` : une fonction par source, au format commun `EventResult`, avec filtrage par période, présentiel et ville.
- **Branche locale en pause** `feat/lab-radar-sans-plafond` (commit `7e117986`, ni poussée ni relue). Elle ajoute le mode `RadarDepth` (`top` pour le radar organisateur, `all` pour lire toutes les pages), la pagination de Luma et de Meetup, une limite de sécurité de 10 pages par source et par mot-clé, et 8 tests. Elle est à reprendre au démarrage de cette issue.
- **Choix en attente pour Eventbrite** en mode « tout » :
  1. paginer tant que titres et descriptions contiennent un mot-clé, avec la même limite (recommandé) ;
  2. paginer jusqu'à la limite sans filtre (surtout du bruit) ;
  3. garder la première page.

### Pistes notées, non traitées

- Communes voisines exclues côté Luma par le filtre sur le nom de ville, alors que Meetup garde un rayon de 25 km.
- Noms de ville non normalisés (espaces, accents, noms français comme « Londres »).
- Plusieurs tables parallèles pour les mêmes 11 villes (`LUMA_LOCATION_TERMS`, `EVENTBRITE_LOCATION`, `EVENTBRITE_COUNTRY`). Une page publique devra couvrir n'importe quelle ville, donc se passer de ces tables : identifiant Eventbrite d'une ville quelconque, filtre de ville Luma par distance plutôt que par nom.
- Deux intégrations Google Places : la route d'autocomplétion appelle Google directement, sans passer par l'adapter.

## Questions à trancher avant d'implémenter

1. **Q1. Cadre juridique et conditions d'utilisation.** Chaque plateforme a ses conditions d'utilisation, et les bases de données sont protégées en droit européen. Ce qui passe pour un usage ponctuel et interne (le Radar) ne passe pas forcément pour une page publique à fort trafic. Priorité aux sources ouvertes ou disposant d'une API officielle, analyse plateforme par plateforme.
2. **Q2. Cohérence avec le positionnement.** The Playground est centré sur les Communautés, sans marketplace ni flux d'événements. Afficher massivement des événements externes rapproche d'un agrégateur. Comment chaque recherche ramène-t-elle vers une Communauté ? Quelle place pour les événements The Playground ?
3. **Q3. Recherche à la volée ou collecte planifiée.** Le Radar interroge les plateformes au moment de la demande, à moins d'une requête par mois. Une page publique multiplie le volume : collecte périodique avec stockage, fraîcheur des données, dédoublonnage entre plateformes, retrait des événements annulés.
4. **Q4. Image vis-à-vis des plateformes.** Se présenter comme l'alternative à Meetup et Luma tout en affichant leurs événements : vitrine qui leur envoie du trafic, ou concurrence frontale ?
5. **Q5. Mesure du succès.** Visites de la page, clics sortants, et surtout conversions vers The Playground (inscriptions, adhésions, créations de Communauté). Quel seuil pour juger que la page amène du monde ?
6. **Q6. Référencement.** Une page de recherche est une porte d'entrée naturelle depuis les moteurs de recherche (« événements tech Lyon cette semaine »). Pages indexables par ville et thème ?

## Découpage proposé

1. **Lot 1** : page de recherche publique sur les trois plateformes existantes, avec les événements The Playground, et mesure des visites et conversions.
2. **Lot 2** : ajout de plateformes, en commençant par les sources ouvertes (OpenAgenda, Mobilizon).
3. **Lot 3** : collecte planifiée et stockage, si le volume le justifie (Q3).
4. **Lot 4** : intégration dans l'Explorer.

Chaque lot se décide au vu des mesures du précédent.
