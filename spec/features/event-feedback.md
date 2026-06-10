# Évaluation des événements et des Communautés — feedback post-événement

> Issue backlog : [#523](https://github.com/DragosDreptate/the-playground/issues/523)
> Statut : **benchmark réalisé (2026-06-10)** — cadrage produit à faire avant toute implémentation.

## 1. Benchmark Luma

Source principale : [help.luma.com — Collect Feedback from your Event Guests](https://help.luma.com/p/collect-feedback-from-your-event-guests)

- **Mécanisme natif, activé par défaut (opt-out)** : email automatique envoyé aux invités dès la fin de l'événement. Désactivable par événement (Manage Event > Blasts) ou globalement (Calendar > Settings > Options).
- **Format** : échelle d'**emojis** dans l'email (1 tap), clic → page de commentaire texte libre optionnel. Pas d'étoiles, pas de NPS, pas de questions personnalisables.
- **Le mail de feedback EST le mail de remerciement** : un seul envoi porte les deux fonctions (timing et contenu personnalisables par l'organisateur).
- **Restitution** : onglet Insights de l'événement, section Feedback, export CSV. **100 % privé** : visible uniquement par l'organisateur, aucune note publique sur les événements, les calendars ou les organisateurs.
- **Limites** : échelle fixe non configurable (les organisateurs exigeants passent par Google Forms/Typeform via Zapier, réservé au plan payant), pas de vue agrégée cross-événements, aucune boucle de réputation publique (des cas de scam d'événements non tenus restent invisibles).

## 2. Benchmark Meetup

Sources principales : [help.meetup.com — Sharing feedback about an event](https://help.meetup.com/hc/en-us/articles/360015131592), [Reviewing my group's event ratings](https://help.meetup.com/hc/en-us/articles/17755240553101), [blog Meetup 2023](https://www.meetup.com/blog/more-event-feedback-for-organizers/) et [2025](https://www.meetup.com/blog/16-recent-meetup-improvements-you-might-have-missed/)

- **Rating d'événement systématique** : prompt in-app après l'événement pour tout participant "going". Note **1-5 étoiles** + tags prédéfinis + texte libre structuré ("What people liked" / "What went wrong") + question "Would attend again". Pas de sollicitation email documentée.
- **Friction asymétrique** : commentaire texte **obligatoire pour 1-3 étoiles**, optionnel pour 4-5 (anti-notes sèches).
- **Feedback définitif** : ni modifiable ni supprimable, même par son auteur. Seul recours : signalement modéré par Meetup.
- **Historique en zigzag** : note de groupe publique (époque ancienne) → retirée → feedback privé organisateur (2018-2023, enrichi août 2023) → **re-publicisation complète en mars 2025**.
- **Depuis mars 2025** : note moyenne **publique** du groupe (moyenne de tous les événements passés), affichée sur la page du groupe et les pages événement, **seuil de 5 ratings minimum** avant affichage. Reviews publiques et **non anonymes** (rattachées au profil du membre). Droit de réponse publique du primary organizer. Justification Meetup : conversion RSVP mesurablement supérieure quand la note est visible.
- **Restitution organisateur** : page "Event Feedback Overview" (taux de présence, breakdown des notes, % would attend again, verbatims, comparaison entre événements du groupe, filtres).
- **Critiques** : forte anxiété des organisateurs (notes vengeresses irréversibles alors qu'ils paient l'abonnement), réactions défensives documentées (guides demandant aux membres de contacter l'organisateur avant de noter < 4), pas de pondération temporelle de la moyenne.

## 3. Autres plateformes et bonnes pratiques

### Mécanismes observés

| Plateforme | Mécanisme | Visibilité |
|---|---|---|
| Eventbrite | Email auto post-événement, 1-5 étoiles + qualité/prix + tags (US/CA/UK, événements payants) | Dashboard organisateur (exposition publique partielle incertaine) |
| Heylo | Bouton "Submit feedback" permanent (pull, pas de push), étoiles + commentaire, option anonyme | Privé admins ; partage externe avec consentement du membre |
| RingCentral Events (ex-Hopin) | Pop-up in-app à la fin (2 échelles 1-10 + 2 textes libres), désactivable | Privé organisateur |
| Bevy | Forms/surveys custom par chapitre | Privé organisateur |
| Partiful | Pas de survey — album photo partagé + récap annuel "After Party" (type Spotify Wrapped) | Souvenir social partageable |
| Posh | Rien d'identifié | — |

### Timing et formats qui maximisent la réponse

- **Fenêtre 24-48h** : consensus fort. Envoi sous 24h = taux max ; après 1 semaine, le taux chute de moitié. Taux typique email : 20-30 %.
- **Question embarquée dans l'email (1 tap)** : 15-25 % de réponse vs 6-15 % pour un lien vers formulaire externe. Recommandation : **1-2 questions max**, boutons cliquables in-email.
- **Coupler remerciement + feedback dans le même email** : recommandation explicite (un seul envoi, souvenir frais).
- Relances : 1-2 max, espacées de 3-5 jours.

### Anti-fatigue

- **Frequency cap** : pas plus d'une sollicitation feedback par personne par ~30 jours (suppression list cross-événements).
- **Micro-format** plutôt que questionnaire.
- **Pattern pull (Heylo)** : zéro email, bouton permanent → zéro fatigue, volume plus faible.
- Désactivable par l'organisateur (RingCentral).
- Opt-out granulaire "emails de feedback" : non documenté chez les plateformes étudiées.

### Public vs privé — le trade-off

- **Le privé domine** chez les plateformes communautaires (Heylo, Bevy, Luma). Le rating public agrégé est l'apanage des plateformes transactionnelles (Eventbrite partiellement, Meetup depuis 2025).
- Risques du public documentés par la recherche : inflation des notes (perte de pouvoir informatif), review bombing, démotivation des organisateurs bénévoles sur une seule note injuste, concentration sur les acteurs déjà populaires (contraire à un annuaire de découverte sans ranking).
- Mitigations observées (Meetup) : seuil minimal de ratings avant affichage, texte obligatoire sur les mauvaises notes, droit de réponse.
- **Espace différenciant identifié** : aucune plateforme ne ferme la boucle vers le participant ("tu as dit X, on a changé Y") ni ne rend le feedback utile au participant lui-même.

## 4. Questions de cadrage à trancher (avant implémentation)

1. **Privé ou public ?** Feedback privé organisateur (modèle Luma/Heylo) vs note publique (modèle Meetup 2025). Tension directe avec le principe "pas d'algorithme de ranking global" et avec la protection des Organisateurs bénévoles. Piste intermédiaire : privé d'abord, social proof choisi (testimonials avec consentement).
2. **Niveau d'agrégation** : feedback par événement seulement, ou remontée agrégée au niveau Circle (vue cross-événements pour l'Organisateur) ?
3. **Format** : emoji 1-tap dans l'email (modèle Luma, friction minimale, cohérent mobile-first) vs étoiles + texte structuré (modèle Meetup, plus riche).
4. **Couplage avec l'email de remerciement** : un seul email post-événement "merci + feedback" (recommandation unanime du benchmark).
5. **Anti-fatigue** : frequency cap par utilisateur, intégration avec les préférences de notifications existantes, désactivation par l'Organisateur.
6. **Boucle de valeur participant** : qu'est-ce que le Participant y gagne ? (historique, badges de participation, récap — cf. Partiful/Heylo). Potentiel différenciant.
7. **Modération** : feedback modifiable/supprimable ? Droit de réponse de l'Organisateur ? (Les deux irritants majeurs de Meetup sont l'irréversibilité et l'exposition publique.)
