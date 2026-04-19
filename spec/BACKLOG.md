# Backlog — The Playground

> Liste unique des choses à faire. Items ajoutés uniquement sur demande explicite.
> Chaque item tient sur une ligne. Si le sujet demande à être creusé, on lie une spec.
>
> **Ordre** : toujours trié par priorité (high → medium → low). Réordonné à chaque ajout ou changement de priorité.
> **Retiré quand livré** (l'historique vit dans `CHANGELOG.md` et git).
> **Idées non qualifiées** : voir `spec/ideas.md`.
> **Décisions architecturales et produit** : voir `spec/decisions.md`.

---

## Format

- **ID** : séquentiel, reflète la position courante dans la liste. Renuméroté à chaque ajout, suppression ou changement de priorité.
- **Priorité** : `high` (bloque croissance/rétention, sécurité critique, bug impactant), `medium` (amélioration sensible), `low` (polish, confort).
- **Type** : `feature` | `evol` | `fix` | `chore` | `idea`.
- **Problème** : une phrase, deux courtes max. Si ça déborde → créer une spec.
- **Piste** : solution envisagée en une phrase, sinon `—`.
- **Spec** : lien si le sujet est creusé, sinon `—`.
- **Images** : screenshot/référence visuelle dans `spec/assets/backlog/<nom>.ext`, lien markdown depuis la cellule `Problème` ou `Spec`. Pour un mockup complet : `spec/mockups/<slug>.mockup.html`.

---

| ID | Priorité | Type | Titre | Problème | Piste | Spec |
| --- | --- | --- | --- | --- | --- | --- |
| #001 | medium | feature | Notification désinscription (opt-in Organisateur) | Seuls les événements payants notifient l'Organisateur en cas de désinscription. | Toggle dans le profil Organisateur pour activer aussi sur événements gratuits. | — |
| #002 | medium | evol | Refonte UX édition d'événement : actions contextuelles par statut | Combobox de statut ne scale pas. Chaque transition a des side-effects distincts (archivage, reset votes, emails, refunds). | Boutons contextuels au statut courant (ex. DRAFT → "Publier" / "Proposer au vote" / "Annuler"). | `spec/features/moment-proposed-vote.md` |
| #003 | medium | evol | Filtrer "À la une" aux Communautés actives | La section "À la une" peut afficher des Communautés sans activité récente, ce qui dégrade la qualité de la découverte. | Ne sélectionner que les Communautés avec au moins un événement à venir ou passé dans les 30 derniers jours. | — |
| #004 | medium | evol | OG:image Communauté et événement avec cover intégrée | Les OG:images actuelles n'incluent pas la cover, ce qui affaiblit la qualité visuelle des liens partagés (canal principal de distribution). | Refonte des routes OG (`opengraph-image.tsx`) pour intégrer la cover de la Communauté et de l'événement dans le visuel. | — |
| #005 | medium | feature | Contacter l'Organisateur depuis la page Communauté / événement | Pas de canal direct pour poser une question à l'Organisateur avant inscription, le Participant passe par des workarounds (commentaire public, inscription forcée). Réf. Luma : [luma-event-reference.png](./assets/backlog/luma-event-reference.png) (lien "Contacter l'organisateur" colonne gauche). | Bouton "Contacter" sur pages Communauté et événement (authentifié requis). Envoi via `EmailService`, `reply-to` = email du Participant. | — |
| #006 | medium | evol | Refondre la page Communauté mobile sur le modèle de la page événement | Sur mobile, la page Communauté a une architecture différente (CTA "Rejoindre" sous la ligne de flottaison, hiérarchie visuelle moins efficace). La page événement est déjà optimisée mobile avec CTA dominant above-the-fold. | Aligner l'architecture mobile Communauté sur celle de la page événement (CTA "Rejoindre" dominant en tête, hiérarchie info claire). Mockup à faire avant implémentation. | — |
| #007 | medium | evol | Thèmes Communauté en collection de tags (curés + libres) | `category` (enum unique) + `customCategory` capture mal la richesse réelle d'une Communauté multi-sujets, et empêche la découverte par thème fin. Réf. Luma : [luma-event-reference.png](./assets/backlog/luma-event-reference.png) (chips "# IA", "# Arts et Culture"). | Remplacer par une collection de tags : vocabulaire curé par la plateforme (autocomplete) + tags libres autorisés. Impacts : schema Prisma, UI création/édition Communauté, filtres Explorer, migration des catégories existantes. | à créer |
| #008 | medium | feature | Invitations email pour un événement (parité avec Communauté) | L'Organisateur peut inviter par email à une Communauté, mais pas directement à un événement spécifique. Pour mobiliser un sous-ensemble de contacts sur un événement ciblé, pas de workflow natif. | Étendre le système `bulk-invite` au niveau Événement (formulaire emails + message personnalisable, envoi via `EmailService`, lien vers `/m/[slug]`). | `spec/features/bulk-invite.md` (à étendre) |
| #009 | medium | fix | Erreur `OAuthAccountNotLinked` silencieuse au login | Si un utilisateur s'est inscrit via un provider (ex: magic link) puis essaie de se connecter via un autre (ex: Google avec le même email), Auth.js bloque avec `OAuthAccountNotLinked`, mais aucune traduction n'existe et `errors.Default` s'affiche. L'utilisateur reste bloqué sans comprendre. | Ajouter une clé i18n dédiée (`errors.OAuthAccountNotLinked`) expliquant la méthode de connexion à utiliser, et/ou activer `allowDangerousEmailAccountLinking: true` sur Google/GitHub (risque faible car les deux providers vérifient l'email). | — |
| #010 | low | feature | Rappel 1h avant événement | Participants loupent les événements malgré le rappel 24h. | Réutiliser l'infra cron 24h, champ `reminder1hSentAt`, fenêtre 50-70min. | — |
| #011 | low | chore | Stratégie migrations DB + rollback prod | `db:push` peut silencieusement supprimer des données en prod (drop+recreate sur renommage). | Passer à `prisma migrate` + snapshot Neon + PITR comme filet. | `spec/infra/db-migration-rollback-strategy.md` |
| #012 | low | chore | Rate limiting des actions sensibles | Aucune protection anti-abus sur les server actions (inscription, création). | Upstash Rate Limit. Cibles : 10 inscriptions/min/IP, 5 créations/heure/user. | — |
| #013 | low | feature | Export données Organisateur étendu | Export CSV par événement existe, mais pas à l'échelle Communauté (membres, historique, inscrits cumulés). | Ajouter un export CSV Communauté. | — |
| #014 | low | feature | Stats Communauté basiques | L'Organisateur n'a pas de métriques de santé (tendance membres, taux de remplissage). | Bloc stats sur la page Communauté Organisateur. | — |
| #015 | low | fix | OAuth Google dans les navigateurs in-app | Google refuse les WebViews (`Error 403: disallowed_useragent`), Instagram/WhatsApp/FB bloqués. | Détecter le user-agent, afficher un CTA "ouvrir dans mon navigateur" sur `/auth/error`. | — |
| #016 | low | chore | CI : tests d'intégration | Les tests d'intégration (repositories, services) ne tournent pas en CI. | Job dédié avec service PostgreSQL GitHub Actions. | — |
| #017 | low | chore | Test unitaire `joinCircleDirectly` | Fichier de test dédié manquant. | Ajouter `__tests__/joinCircleDirectly.test.ts`. | — |
| #018 | low | chore | E2E : rejoindre une Communauté directement | Parcours `JoinCircleButton` (sans événement) non couvert en E2E. | Nouveau spec Playwright basé sur l'infra existante. | — |
| #019 | low | fix | Page `/changelog` bilingue | `CHANGELOG.md` rédigé en FR uniquement, la page EN affiche du FR. | Deux fichiers FR/EN, ou accepter le FR partout (contenu technique). | — |
