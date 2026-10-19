# Scripts de mesure : recherche multi-plateformes (#630)

Scripts ponctuels ayant servi au cadrage de [`spec/features/recherche-evenements-multi-plateformes.md`](../../features/recherche-evenements-multi-plateformes.md). Ils ne font que lire, avec un en-tête qui nous nomme, une pause de 1,5 s entre deux requêtes et un arrêt sur une réponse 429, conformément au principe d'accès aux plateformes.

| Script | Ce qu'il mesure | Requêtes |
|---|---|---|
| `mesure-volume.mjs` | Nombre d'événements à Paris sur 7, 30 et 60 jours, par source, sans et avec mot-clé | ~32 |
| `test-acces.mjs` | Accès aux trois plateformes, taille de page Meetup, tri Meetup, point d'accès Eventbrite sans jeton | ~25 |

Lancer depuis ce dossier avec Node 22 : `node mesure-volume.mjs > resultat.json` (mettre `TODAY` à jour avant). Les résultats du 2026-10-09 sont recopiés dans la spec (« Mesure de volume à Paris », « Test d'accès aux plateformes »).
