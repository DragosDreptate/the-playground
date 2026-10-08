# Trouver tous les événements de sa ville au même endroit

> Statut : **Cadrage**, non implémenté. Ouvert le 2026-10-08.
> Base existante : le Radar organisateur ([local-events-watcher.md](local-events-watcher.md)), qui interroge déjà Luma, Eventbrite et Meetup.

## Problème

1. **The Playground manque encore de masse.** Pas assez de trafic, de Communautés et d'événements pour qu'un visiteur y trouve d'emblée de quoi remplir son agenda. Sans visiteurs, les Organisateurs ne viennent pas ; sans Organisateurs, pas de visiteurs.
2. **Chercher ses événements est pénible pour tout le monde.** Une soirée produit est sur Luma, un meetup tech sur Meetup, un atelier sur Eventbrite, une conférence sur HelloAsso ou Weezevent. Pour savoir ce qui se passe dans sa ville sur un sujet, il faut ouvrir cinq sites, refaire cinq recherches, et on en rate toujours.

## Opportunité

Faire de The Playground **l'endroit où l'on cherche ses événements**, toutes plateformes confondues. La recherche devient une porte d'entrée : on vient pour trouver un événement ailleurs, on découvre au passage les Communautés et les événements hébergés ici, et une partie des visiteurs reste.

C'est un levier d'acquisition, pas une fin en soi : chaque visite doit avoir une chance de se convertir (inscription, adhésion à une Communauté, création d'une Communauté).

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
