---
title: "Migrer votre communauté Meetup vers The Playground : guide pas à pas"
description: "Comment quitter Meetup sans casser votre communauté. La méthode complète pour transférer membres, événements et notoriété vers The Playground, en 4 à 8 semaines."
date: "2026-05-25"
keywords:
  - migrer meetup
  - quitter meetup
  - migration communauté meetup
  - exporter membres meetup
  - alternative meetup
---

Depuis le rachat par Bending Spoons en janvier 2024, beaucoup d'organisateurs ont vu leur abonnement Meetup augmenter fortement, l'API publique passer en payant en février 2025, et leurs membres être sollicités via Meetup+ ou des frais d'inscription. La question n'est plus tellement "faut-il quitter Meetup", mais "comment le faire sans casser ce qu'on a construit". Ce guide explique la méthode, en deux temps : d'abord la stratégie, ensuite les six étapes tactiques.

## Partie 1 : la stratégie de migration

### Ce que vous pouvez (et ne pouvez pas) récupérer de Meetup

Avant toute action technique, il faut comprendre ce que Meetup permet réellement d'exporter. C'est cette contrainte qui structure toute la migration.

|  | Récupérable | Non récupérable |
| --- | --- | --- |
| Liste des membres | Oui (noms, photos, en `.xls`) | Pas les emails (sauf Meetup Pro, sous conditions) |
| Attendees par événement | Oui (CSV par événement) | Pas l'historique global |
| Photos, discussions, événements passés | Non | Tout |
| Accès via API | Payant, restreint à GraphQL depuis février 2025 | Champs membres limités |

Le point critique : **sur le plan Standard ($16.49 à $47/mois), vous n'avez pas accès aux emails de vos membres**. C'est documenté noir sur blanc dans l'aide Meetup ("The Contact Members tool doesn't give you access to your members' contact details or their email addresses"). Le seul plan qui donne accès aux emails est Meetup Pro, à partir de $55 par groupe et par mois, et même là sous conditions strictes : le membre doit avoir fait un RSVP après votre passage en Pro (pas rétroactif sur vos membres existants), et avoir consenti explicitement à partager son email.

Autrement dit, pour récupérer les emails de vos propres membres, il faut payer le plan le plus cher, et accepter que vous ne récupérerez de toute façon qu'une fraction de votre base. C'est un choix de lock-in : sans les emails, vous ne pouvez pas contacter vos membres en dehors de Meetup, donc vous ne pouvez pas partir sans tout reconstruire. Cette mécanique ne va pas changer, c'est précisément ce qui retient les organisateurs sur la plateforme. Conséquence pratique pour votre migration : vous ne pourrez pas "exporter votre liste et envoyer un email à tout le monde pour annoncer le changement".

### L'implication : votre seul canal d'annonce, c'est Meetup lui-même

Tant que votre abonnement Meetup est actif, vous pouvez poster sur le groupe et envoyer des notifications aux membres via les outils intégrés. Une fois l'abonnement annulé, ce canal disparaît. Cette mécanique impose un séquencement très précis : on ne ferme pas Meetup avant d'avoir transféré sa base sur la nouvelle plateforme.

### Le principe : faire tourner les deux plateformes en parallèle

Migrer une communauté n'est pas une bascule instantanée. C'est une période de transition pendant laquelle vous faites cohabiter Meetup et The Playground, le temps que les membres prennent l'habitude du nouvel endroit. La plupart des organisateurs qui ont raté leur migration ont essayé d'aller trop vite : annonce sans rendez-vous concret, fermeture de Meetup avant que la masse critique ait bougé.

### Le calendrier réaliste

| Phase | Durée | Objectif |
| --- | --- | --- |
| Phase 1 | Semaine 1 | Préparer la Communauté Playground et les premiers événements |
| Phase 2 | Semaines 2 à 6 | Annoncer, organiser les premiers événements, faire vivre les deux plateformes |
| Phase 3 | Semaines 7 à 8 | Fermer le groupe Meetup |

Quatre à huit semaines selon votre fréquence d'événements. Plus vos événements sont fréquents, plus la migration est rapide : chaque événement est une occasion d'annoncer le changement et d'embarquer de nouveaux membres.

### Ce qu'il faut accepter à l'avance

Vous ne récupérerez pas 100% de vos membres. Un taux de transition réaliste se situe entre 40 et 60% sur les trois premiers mois, puis remonte ensuite si vous restez actif. Les membres inactifs depuis longtemps ne reviendront pas, quelle que soit la plateforme : ils ne venaient déjà plus à vos événements. La migration agit comme un filtre. Ceux qui suivent sont vos vrais membres.

## Partie 2 : les six étapes tactiques

### Étape 1 : créer votre Communauté sur The Playground (jour 1)

Reprenez exactement ce qui définit votre groupe Meetup, sans réinventer :

- **Nom** : gardez-le identique si possible, ça facilite la reconnaissance par les membres.
- **Description** : recopiez celle de Meetup, ajustez si elle date.
- **Image de couverture** : en format carré (1:1), c'est le standard sur The Playground.
- **Statut public ou privé** : alignez-vous sur ce que vous aviez.

Notez l'URL de votre nouvelle Communauté. Vous allez la coller partout dans les semaines qui viennent.

### Étape 2 : recréer vos prochains événements (jour 2)

Migrez seulement les deux ou trois prochains événements. Inutile de recréer l'historique : Meetup ne le met plus vraiment en valeur de toute façon, et personne n'ira chercher un événement passé sur votre nouvelle Communauté.

Pour chaque événement à venir :
- Titre, date, heure, lieu, description
- Image de couverture (carrée)
- Capacité si vous en imposez une
- Prix si l'événement est payant

Créez-les en Brouillon. Vous les publierez au moment de l'annonce officielle, pas avant. Un événement publié sans annonce envoie un signal flou à la communauté.

### Étape 3 : télécharger vos données Meetup (jour 2 ou 3)

**Liste des membres**. Connectez-vous à Meetup, puis ouvrez l'URL `https://www.meetup.com/[nom-du-groupe]/members/?op=csv`. Le fichier téléchargé est un `.xls`. Ouvrez-le dans Excel ou Google Sheets et exportez-le en CSV si besoin.

**Attendees du prochain événement**. Depuis la page de l'événement sur Meetup : Organizer Tools → Manage Attendees → Tools → Download attendees.

À quoi ça sert vraiment ? Pas à contacter directement (vous n'avez pas les emails sur le plan Standard), mais à :
- Garder une trace de qui était membre avant la migration.
- Repérer vos membres les plus actifs pour les solliciter individuellement (via messages Meetup) au moment de la bascule.
- Mesurer plus tard votre taux de transition.

### Étape 4 : annoncer la migration à vos membres (début semaine 2)

C'est le moment le plus important. Une seule règle : être transparent, court, avec un rendez-vous concret.

**Template d'annonce** (à publier en post de groupe Meetup + à envoyer en message aux membres via les outils Meetup) :

> Bonjour à tous,
>
> Nous déménageons sur une nouvelle plateforme : The Playground.
>
> Pourquoi : [votre raison, en une phrase. Exemple : "Meetup est devenu payant pour les organisateurs et pour les membres. Nous voulons une plateforme gratuite et plus fluide."]
>
> Notre Communauté est ici : [URL Playground]
>
> Notre prochain événement, [titre + date], est déjà ouvert aux inscriptions : [URL événement]
>
> Nous gardons ce groupe Meetup actif encore quelques semaines, le temps que tout le monde fasse la transition. Au plaisir de vous retrouver de l'autre côté.

Multipliez les canaux : groupe Meetup, WhatsApp si vous en avez un, LinkedIn en post personnel (pas en page entreprise), votre signature email. Plus le message tourne, plus la transition s'enclenche.

Le piège à éviter : annoncer la migration sans avoir un premier événement Playground publié. Sans rendez-vous concret, les membres ne bougent pas, ils notent vaguement "il faut que je m'inscrive là-bas un jour", et n'y reviennent jamais.

### Étape 5 : réussir les premiers événements Playground (semaines 2 à 6)

Le premier événement sur The Playground est critique. Il prouve que la communauté existe encore et installe le réflexe "je m'inscris sur Playground" pour la suite.

Quelques tactiques qui aident :

- **Amorcer la preuve sociale**. Demandez à deux ou trois habitués de s'inscrire en premier. Les avatars visibles sur la page événement déclenchent les inscriptions des autres.
- **Partager le lien plusieurs fois**, à des moments différents (lundi matin, jeudi soir, week-end). Un seul post ne suffit pas.
- **Rappeler sur Meetup 48 heures avant l'événement**, avec le lien direct vers la page Playground. C'est l'utilisation légitime de votre abonnement Meetup pendant la transition.

Sur The Playground, l'inscription à un événement inscrit automatiquement le Participant à la Communauté. C'est différent de Meetup où il faut d'abord rejoindre le groupe, puis faire un RSVP. Moins de friction, meilleure conversion.

Après l'événement, recommencez : annoncez le prochain dans la semaine, sur les deux plateformes. La régularité crée l'habitude.

### Étape 6 : fermer le groupe Meetup proprement (semaines 7 à 8)

Quand fermer : après deux ou trois événements réussis sur The Playground, quand vous constatez que la base d'inscrits tourne et que les nouveaux membres viennent directement par le canal Playground. Pas avant.

Comment fermer :

1. **Publier un dernier message** en haut du groupe Meetup :

> Ce groupe sera fermé le [date]. Notre communauté continue ici : [URL Playground]. Tous nos prochains événements y sont publiés. Merci à tous ceux qui ont fait vivre ce groupe pendant [X] années.

2. **Laisser ce message visible deux semaines**, le temps que les membres les moins actifs le voient passer.
3. **Annuler l'abonnement Meetup** avant la date de renouvellement (sinon vous payez un cycle pour rien).
4. **Supprimer le groupe ou le laisser inactif**. Le supprimer est plus propre, mais c'est irréversible. Le laisser inactif garde une trace publique, ce qui peut aider les anciens membres à retrouver le chemin de votre nouvelle Communauté.

## FAQ migration

### Vais-je perdre des membres ?

Oui, c'est inévitable. Comptez 40 à 60% de transition sur les trois premiers mois, puis une remontée progressive si vous restez actif. Les membres inactifs depuis six mois ou plus ne suivront pas, mais ils ne participaient déjà plus.

### Combien de temps faut-il prévoir ?

Quatre à huit semaines selon votre rythme d'événements. Avec un événement par mois, comptez deux mois pleins. Avec un événement par semaine, c'est plus rapide : moins de risque que les membres oublient le changement entre deux annonces.

### Faut-il garder les deux plateformes en parallèle longtemps ?

Non. Plus la période parallèle dure, plus elle dilue l'attention des membres, et plus vous payez Meetup pour un canal que vous êtes en train d'abandonner. Quatre à six semaines est un bon équilibre.

### Comment compenser la perte de visibilité de l'annuaire Meetup ?

C'est une vraie perte si vous comptiez sur la découverte organique pour recruter de nouveaux membres. Trois leviers compensent partiellement :
- La page Découvrir de The Playground (annuaire des Communautés publiques).
- Un post LinkedIn personnel à chaque nouvel événement (le canal le plus performant pour les meetups professionnels).
- Le bouche à oreille des membres existants, qui reste le meilleur canal de recrutement en réalité.

### J'ai des événements payants en cours sur Meetup, comment gérer ?

Honorez les événements déjà vendus sur Meetup jusqu'à leur date. Pour les nouveaux événements, basculez sur The Playground avec Stripe Connect : l'organisateur reçoit le paiement directement, sans commission plateforme. Seuls les frais Stripe standards (environ 2.9% + 0.30€) s'appliquent.

### Et si certains membres refusent de quitter Meetup ?

C'est leur choix. Ne forcez pas, ne supprimez personne. Le message d'annonce et les rappels réguliers suffisent. La majorité des réfractaires finit par migrer après le deuxième ou troisième événement annoncé. Ceux qui ne migrent jamais étaient probablement déjà déconnectés de la communauté.

## En résumé

La migration depuis Meetup n'est pas un risque, c'est un filtre. Les membres qui suivent sont ceux qui font réellement vivre votre communauté. Les autres étaient déjà partis, même s'ils restaient techniquement inscrits.

Quitter Meetup, c'est aussi reprendre le contrôle : votre Communauté, vos membres, vos données, sans frais ni paywall pour personne. Le travail tient en 4 à 8 semaines. Le bénéfice dure des années.
