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

- **ID** : séquentiel d'ajout (`#001`, `#002`…), stable même après réordonnancement.
- **Priorité** : `high` (bloque croissance/rétention, sécurité critique, bug impactant), `medium` (amélioration sensible), `low` (polish, confort).
- **Type** : `feature` | `evol` | `fix` | `chore` | `idea`.
- **Problème** : une phrase, deux courtes max. Si ça déborde → créer une spec.
- **Piste** : solution envisagée en une phrase, sinon `—`.
- **Spec** : lien si le sujet est creusé, sinon `—`.

---

| ID | Priorité | Type | Titre | Problème | Piste | Spec |
|----|----------|------|-------|----------|-------|------|
| #001 | high | feature | Rappel 1h avant événement | Participants loupent les événements malgré le rappel 24h. | Réutiliser l'infra cron 24h, champ `reminder1hSentAt`, fenêtre 50-70min. | — |
| #002 | high | feature | CTA "Créer le prochain événement" depuis un événement passé | Pas de nudge post-événement pour capitaliser sur l'élan. | Bouton sur la vue Organisateur d'un événement PAST, pré-remplir la même Communauté. | — |
| #003 | high | feature | Guide onboarding Organisateur | Time-to-first-event trop long, la welcome page oriente sans guide pas-à-pas. | Stepper 3 étapes (Créer Communauté → Créer événement → Partager). Objectif < 5 min. | — |
| #004 | high | chore | Stratégie migrations DB + rollback prod | `db:push` peut silencieusement supprimer des données en prod (drop+recreate sur renommage). | Passer à `prisma migrate` + snapshot Neon + PITR comme filet. | `spec/infra/db-migration-rollback-strategy.md` |
| #005 | high | chore | Rate limiting des actions sensibles | Aucune protection anti-abus sur les server actions (inscription, création). | Upstash Rate Limit. Cibles : 10 inscriptions/min/IP, 5 créations/heure/user. | — |
| #006 | medium | feature | Co-Organisateurs | Une seule personne peut gérer une Communauté. Bloquant pour les collectifs. | Plusieurs Organisateurs par Communauté, modèle de permissions simple. | `spec/features/co-organisateurs.md` |
| #007 | medium | feature | Export données Organisateur étendu | Export CSV par événement existe, mais pas à l'échelle Communauté (membres, historique, inscrits cumulés). | Ajouter un export CSV Communauté. | — |
| #008 | medium | feature | Assistant IA basique | Promesse produit non tenue. Rédaction description / email invitation chronophage. | SDK Anthropic via `AIService`. Description, email invitation, suggestions Communauté. | — |
| #009 | medium | feature | Stats Communauté basiques | L'Organisateur n'a pas de métriques de santé (tendance membres, taux de remplissage). | Bloc stats sur la page Communauté Organisateur. | — |
| #010 | medium | feature | Notification désinscription (opt-in Organisateur) | Seuls les événements payants notifient l'Organisateur en cas de désinscription. | Toggle dans le profil Organisateur pour activer aussi sur événements gratuits. | — |
| #011 | medium | evol | Refonte UX édition d'événement : actions contextuelles par statut | Combobox de statut ne scale pas. Chaque transition a des side-effects distincts (archivage, reset votes, emails, refunds). | Boutons contextuels au statut courant (ex. DRAFT → "Publier" / "Proposer au vote" / "Annuler"). | `spec/features/moment-proposed-vote.md` |
| #012 | medium | chore | Corriger vulnérabilités dépendances | `pnpm audit` remontait 6 high + 5 moderate (état 2026-02-27). À réévaluer. | Audit frais, tri par exploitabilité, mises à jour. | — |
| #013 | medium | chore | Retirer `unsafe-eval` du CSP | `script-src` inclut `'unsafe-eval'`, affaiblit la CSP. | Nonces CSP via middleware Next.js. | — |
| #014 | medium | chore | CI : `pnpm audit --audit-level=high` bloquant | Pas de gate CI qui échoue sur vulnérabilité high. | Job dédié dans la CI GitHub Actions. | — |
| #015 | medium | fix | OAuth Google dans les navigateurs in-app | Google refuse les WebViews (`Error 403: disallowed_useragent`), Instagram/WhatsApp/FB bloqués. | Détecter le user-agent, afficher un CTA "ouvrir dans mon navigateur" sur `/auth/error`. | — |
| #016 | low | chore | Pre-commit hooks (Husky + lint-staged) | Aucun hook git local, erreurs TS/lint détectées uniquement en CI. | Hooks `pre-commit` + `commit-msg` via Husky + lint-staged. | — |
| #017 | low | chore | CI : tests d'intégration | Les tests d'intégration (repositories, services) ne tournent pas en CI. | Job dédié avec service PostgreSQL GitHub Actions. | — |
| #018 | low | chore | CI : Lighthouse CI | Pas de garde-fou perf/a11y, régressions silencieuses possibles. | Lighthouse CI sur `/m/[slug]` et `/`. Seuils Perf ≥ 90, A11y ≥ 90. | — |
| #019 | low | chore | Accessibilité : axe-core dans Playwright | Promesse a11y sans outillage automatisé. | Intégrer axe-core dans les tests E2E existants. | — |
| #020 | low | chore | Bundle analyzer | Aucune visibilité sur la taille du bundle JS. | `@next/bundle-analyzer` + rapport en CI. | — |
| #021 | low | chore | Diagramme d'architecture (C4 niveau 2) | Architecture hexagonale documentée textuellement, sans schéma. | Diagramme C4 niveau 2 dans `spec/architecture.md`. | — |
| #022 | low | chore | Test unitaire `joinCircleDirectly` | Fichier de test dédié manquant. | Ajouter `__tests__/joinCircleDirectly.test.ts`. | — |
| #023 | low | chore | E2E : rejoindre une Communauté directement | Parcours `JoinCircleButton` (sans événement) non couvert en E2E. | Nouveau spec Playwright basé sur l'infra existante. | — |
| #024 | low | fix | Page `/changelog` bilingue | `CHANGELOG.md` rédigé en FR uniquement, la page EN affiche du FR. | Deux fichiers FR/EN, ou accepter le FR partout (contenu technique). | — |
