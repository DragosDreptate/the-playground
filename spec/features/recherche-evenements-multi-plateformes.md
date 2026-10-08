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
| Luma | ✅ Déjà interrogée | Recherche par ville et mot-clé |
| Eventbrite | ✅ Déjà interrogée | Recherche par ville, mot-clé et dates |
| Meetup | ✅ Déjà interrogée | Recherche par position, mot-clé et dates |
| OpenAgenda | À explorer | API publique documentée, très présente sur les agendas culturels et institutionnels en France |
| Mobilizon | À explorer | Logiciel libre et fédéré, API ouverte. Retirée du Radar pour faible volume, à réévaluer pour un usage grand public |
| Weezevent | À explorer | Recherche géographique non confirmée (voir le Radar) |
| HelloAsso | À explorer | Pas de recherche géographique publique connue |
| Billetweb, Sortir à Paris, agendas locaux | À explorer | À qualifier une par une |

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
