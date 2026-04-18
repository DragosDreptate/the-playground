# Backlog — The Playground

> Liste unique des choses à faire. Items ajoutés uniquement sur demande explicite.
> Chaque item est cadré en 5 champs fixes. Si le sujet demande à être creusé, on lie une spec.
>
> **Retiré quand livré** (l'historique vit dans `CHANGELOG.md` et git).
> **Idées non qualifiées** : voir `spec/ideas.md`.
> **Décisions architecturales et produit** : voir `spec/decisions.md`.

---

## Format d'un item

```markdown
## #NNN — Titre court
- **Type** : feature | evol | fix | chore | idea
- **Priorité** : high | medium | low
- **Ajouté** : YYYY-MM-DD
- **Problème** : une phrase, parfois deux.
- **Piste** : la piste de solution si on en a une, sinon `—`.
- **Spec** : `spec/features/xxx.md` si le sujet est creusé, sinon `—`.
```

---

## #001 — Rappel 1h avant événement
- **Type** : feature
- **Priorité** : high
- **Ajouté** : 2026-04-18
- **Problème** : les Participants loupent les événements, surtout quand le rappel 24h est lu puis oublié.
- **Piste** : réutiliser l'infra cron 24h (template, batch). Ajouter champ `reminder1hSentAt`, fenêtre 50-70min.
- **Spec** : —

## #002 — CTA "Créer le prochain événement" depuis un événement passé
- **Type** : feature
- **Priorité** : high
- **Ajouté** : 2026-04-18
- **Problème** : post-événement l'Organisateur n'a pas de nudge pour capitaliser sur l'élan et relancer sa Communauté.
- **Piste** : sur la vue Organisateur d'un événement `PAST`, ajouter un bouton "Programmer le prochain événement" qui pré-remplit la même Communauté.
- **Spec** : —

## #003 — Guide onboarding Organisateur
- **Type** : feature
- **Priorité** : high
- **Ajouté** : 2026-04-18
- **Problème** : la welcome page oriente mais pas de guide pas-à-pas. Time-to-first-event trop long.
- **Piste** : stepper 3 étapes (Créer Communauté → Créer événement → Partager le lien). Objectif < 5 min.
- **Spec** : —

## #004 — Stratégie migrations DB + rollback prod
- **Type** : chore
- **Priorité** : high
- **Ajouté** : 2026-04-18
- **Problème** : `db:push` peut silencieusement supprimer des données en prod (drop+recreate sur renommage). Risque data loss.
- **Piste** : passer à `prisma migrate` + snapshot Neon + PITR comme filet.
- **Spec** : `spec/infra/db-migration-rollback-strategy.md`

## #005 — Rate limiting des actions sensibles
- **Type** : chore
- **Priorité** : high
- **Ajouté** : 2026-04-18
- **Problème** : aucune protection anti-abus sur les server actions (inscription, création).
- **Piste** : Upstash Rate Limit. Limites cibles : 10 inscriptions/min/IP, 5 créations/heure/user.
- **Spec** : —

## #006 — Co-Organisateurs
- **Type** : feature
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : une seule personne peut gérer une Communauté aujourd'hui. Blocant pour les collectifs.
- **Piste** : plusieurs Organisateurs par Communauté, avec modèle de permissions simple.
- **Spec** : `spec/features/co-organisateurs.md`

## #007 — Export données Organisateur étendu
- **Type** : feature
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : l'export CSV par événement existe, mais pas d'export global (membres Communauté, historique événements, inscrits cumulés).
- **Piste** : ajouter un export CSV à l'échelle Communauté.
- **Spec** : —

## #008 — Assistant IA basique
- **Type** : feature
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : promesse produit (IA basique dès le MVP) non tenue. Rédaction description / email invitation chronophage pour l'Organisateur.
- **Piste** : SDK Anthropic (Claude) via adapter `AIService`. Description événement, email invitation, suggestions Communauté.
- **Spec** : —

## #009 — Stats Communauté basiques
- **Type** : feature
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : l'Organisateur n'a pas de métriques de santé de sa Communauté (tendance membres, taux de remplissage).
- **Piste** : bloc stats sur la page Communauté Organisateur.
- **Spec** : —

## #010 — Notification désinscription (opt-in Organisateur)
- **Type** : feature
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : seuls les événements payants notifient l'Organisateur en cas de désinscription. Meetup notifie systématiquement.
- **Piste** : toggle dans le profil Organisateur pour activer les notifications sur événements gratuits.
- **Spec** : —

## #011 — Refonte UX édition d'événement : actions contextuelles par statut
- **Type** : evol
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : le combobox de statut dans le formulaire d'édition ne scale pas. Chaque transition a des side-effects distincts (archivage commentaires, reset votes, emails, refunds Stripe).
- **Piste** : remplacer le combobox par des boutons contextuels au statut courant (ex. `DRAFT` → "Publier" / "Proposer au vote" / "Annuler" ; `PUBLISHED` → "Annuler l'événement").
- **Spec** : `spec/features/moment-proposed-vote.md` (recommandation dans la section dédiée)

## #012 — Corriger vulnérabilités dépendances
- **Type** : chore
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : `pnpm audit` remontait 6 high + 5 moderate (état 2026-02-27). À réévaluer.
- **Piste** : lancer un audit frais, trier par exploitabilité réelle, mettre à jour.
- **Spec** : —

## #013 — Retirer `unsafe-eval` du CSP
- **Type** : chore
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : `script-src` inclut `'unsafe-eval'`, ce qui affaiblit la CSP.
- **Piste** : nonces CSP via middleware Next.js.
- **Spec** : —

## #014 — CI : `pnpm audit --audit-level=high` bloquant
- **Type** : chore
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : pas de gate CI qui échoue en cas de vulnérabilité high. Les alertes passent inaperçues.
- **Piste** : job dédié dans la CI GitHub Actions.
- **Spec** : —

## #015 — Fix OAuth Google dans les navigateurs in-app
- **Type** : fix
- **Priorité** : medium
- **Ajouté** : 2026-04-18
- **Problème** : Google refuse les WebViews (`Error 403: disallowed_useragent`). Un utilisateur qui ouvre un lien depuis Instagram/WhatsApp/Facebook est bloqué. Workaround actuel : ouvrir dans le navigateur externe manuellement.
- **Piste** : détecter le user-agent, afficher un message explicatif sur `/auth/error` avec CTA "ouvrir dans mon navigateur".
- **Spec** : —

## #016 — Pre-commit hooks (Husky + lint-staged)
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : aucun hook git local, erreurs TS/lint détectées uniquement en CI (cycle lent).
- **Piste** : hooks `pre-commit` + `commit-msg` via Husky + lint-staged.
- **Spec** : —

## #017 — CI : tests d'intégration
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : les tests d'intégration (repositories, services) ne sont pas lancés en CI.
- **Piste** : job dédié avec service PostgreSQL GitHub Actions.
- **Spec** : —

## #018 — CI : Lighthouse CI
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : pas de garde-fou perf/a11y sur les pages critiques. Régressions possibles sans alerte.
- **Piste** : Lighthouse CI sur `/m/[slug]` et `/`. Seuils Performance ≥ 90, A11y ≥ 90.
- **Spec** : —

## #019 — Accessibilité : axe-core dans Playwright
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : promesse produit a11y sans outillage automatisé.
- **Piste** : intégrer axe-core dans les tests E2E existants.
- **Spec** : —

## #020 — Bundle analyzer
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : aucune visibilité sur la taille du bundle JS, dérives possibles.
- **Piste** : `@next/bundle-analyzer` + rapport en CI.
- **Spec** : —

## #021 — Diagramme d'architecture (C4 niveau 2)
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : architecture hexagonale documentée textuellement (CLAUDE.md) mais sans schéma visuel.
- **Piste** : diagramme C4 niveau 2 dans `spec/architecture.md`.
- **Spec** : —

## #022 — Test unitaire `joinCircleDirectly`
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : fichier de test dédié manquant pour ce usecase.
- **Piste** : ajouter un fichier `__tests__/joinCircleDirectly.test.ts`.
- **Spec** : —

## #023 — E2E : rejoindre une Communauté directement
- **Type** : chore
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : parcours `JoinCircleButton` (sans événement) non couvert en E2E.
- **Piste** : nouveau spec Playwright basé sur l'infra E2E existante.
- **Spec** : —

## #024 — Page `/changelog` bilingue
- **Type** : fix
- **Priorité** : low
- **Ajouté** : 2026-04-18
- **Problème** : `CHANGELOG.md` rédigé en FR uniquement, la page EN affiche du FR.
- **Piste** : deux fichiers FR/EN, ou accepter le FR partout (contenu technique).
- **Spec** : —
