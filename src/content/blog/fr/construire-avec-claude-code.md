---
title: "Ce que j'ai appris en construisant The Playground avec Claude Code"
description: "Récit d'un Product Builder depuis les tranchées. Deux mois, 1 780 commits, pas une ligne de code tapée à la main : retour d'expérience sur la construction d'un SaaS en solo avec une IA."
date: "2026-04-17"
author: "Dragos Dreptate"
keywords:
  - claude code
  - IA
  - product builder
  - retour d'expérience
  - build saas solo
  - architecture hexagonale
  - agents ia
---

*Récit d'un Product Builder depuis les tranchées.*

## Ce que j'ai construit, en bref

19 février 2026, 19h53 : premier commit, un `Initial commit: Next.js 16 + Auth.js v5 + Prisma 7 + i18n`.

16 avril 2026, 22h23 : `docs(spec): ajouter la spec statut Proposé et vote Communauté sur un événement`.

Deux mois pile. Entre les deux, [The Playground](https://the-playground.fr) : une plateforme gratuite pour animer des communautés autour d'événements, **créée en France, en code ouvert sur GitHub, déployée sur des serveurs en Europe**. Le modèle communautaire de [Meetup](https://www.meetup.com), l'expérience premium de [Luma](https://lu.ma), gratuite, zéro commission. En production, avec ses premiers utilisateurs, communautés et événements.

1 780 commits, 373 PR, 64 000 lignes, 110 fichiers de tests, 10 versions livrées, architecture hexagonale stricte. Stack : Next.js 16, Auth.js v5, Prisma 7 + Neon, Stripe Connect, Resend, Sentry, PostHog, Vercel. Un seul développeur, ses soirées et ses week-ends.

Le tout construit avec [Claude Code](https://claude.com/claude-code). Je n'ai jamais tapé la moindre ligne de code. Je n'ai jamais relu ce qu'il a écrit non plus. Ce qui vérifie le code n'est pas mon œil humain, c'est une chaîne d'agents et d'outils.

C'est le cœur du récit qui suit.

---

## Jour 1 : neuf commits pour un socle qui tient

Le premier soir, en moins de quatre heures, la plateforme était déployée sur Vercel avec :

- Next.js 16 App Router
- Auth.js v5 configuré avec magic link
- Prisma 7 connecté à Neon PostgreSQL serverless
- Tailwind 4 + shadcn/ui
- next-intl pour le bilinguisme FR/EN

Aucun de ces composants n'est trivial à brancher. Chacun a ses pièges. Auth.js v5 est encore instable, Prisma 7 change le runtime pour Vercel, next-intl impose une structure de routing précise, Neon demande un adaptateur serverless spécifique.

Sans l'IA, ce premier soir aurait duré une semaine. Pas parce que c'est compliqué individuellement. Parce que c'est compliqué **ensemble**, et que chaque erreur de configuration te coûte une heure de documentation et de traces d'erreur à déchiffrer.

Avec l'IA, ça devient un dialogue. Je décris ce que je veux, elle propose, on ajuste. Quand Vercel casse au deploy parce que `@prisma/client` n'est pas dans les bonnes dépendances, elle le voit avant moi dans les logs. Quand Neon réclame un adaptateur spécifique pour le runtime serverless, elle connaît le nom.

Et comme le socle était en place, la soirée ne s'est pas arrêtée là. Avant minuit, les deux premières features métier étaient écrites : le CRUD `Circle` (les Communautés) à 21h42, le CRUD `Moment` (les événements) à 23h37. Avec pages publiques partageables, formulaires, validations. Le tout sur la première vraie architecture hexagonale du projet.

> **Premier apprentissage :** le coût d'entrée d'un projet neuf s'est effondré. Ce qui prenait des semaines prend des heures. Mais ça ne dit rien de ce qui vient après.

---

## Le vrai rôle de Claude Code : pas un copilote, un binôme exigeant

Il y a une image qui circule beaucoup sur l'IA et le code. Le "copilote". Tu tapes quelques lignes, l'IA complète le reste. Autocomplétion sous stéroïdes.

Ce n'est pas comme ça que j'ai travaillé.

Claude Code, dans sa version CLI, ne fait pas de l'autocomplétion. C'est un agent. Tu lui donnes un objectif, il lit le code, pose des questions, planifie, exécute, vérifie. Quand il se trompe, il se corrige. Quand tu te trompes, il le signale.

Un exemple concret. Feature "Réseaux de communautés" (v2.6.0). Une soirée de build, un mardi, 21h à 22h30. À l'ouverture de la PR, le diff se découpe en trois commits par couche :

```
feat(network): add CircleNetwork schema, domain model, ports and usecases
feat(network): add Prisma adapter and admin server actions
feat(network): add public page, badge, admin pages and i18n
```

Domaine, infrastructure, UI. Trois couches, trois commits. Ce n'est pas que l'agent écrit dans cet ordre ligne après ligne, c'est que le diff est *pensé* dans cet ordre. La séparation hexagonale est inscrite dans l'artefact final, relisible, versionnable.

Puis vient le reste de la soirée : les tests unitaires et E2E, quelques `fix(network)` d'ajustement UX, un `refactor(network)` qui nettoie, la mise à jour de la page d'aide. À 22h30, merge. Ce n'est pas un exploit de vitesse brute, c'est le rythme d'un binôme qui respecte une architecture. L'IA sait lire un `CLAUDE.md` qui impose l'hexagonal, elle sait qu'on ne commence pas par l'UI, elle sait qu'un usecase ne doit pas importer Prisma. Les couches s'enchaînent dans le bon ordre parce que l'ordre est écrit noir sur blanc dans les règles du projet.

Quand je m'égare (par exemple, je demande un shortcut qui violerait la séparation des couches), elle le signale. Elle explique pourquoi ça poserait problème plus tard, et propose l'alternative qui respecte le contrat.

> **Deuxième apprentissage :** un agent IA bien cadré n'exécute pas bêtement. Il t'aide à tenir tes propres règles quand la fatigue te pousserait à les contourner.

---

## L'architecture comme garde-fou : l'IA amplifie la dette autant qu'elle amplifie la vélocité

Voici ce que personne ne dit assez fort.

**L'IA ne simplifie pas la complexité d'un système. Elle l'amplifie.**

Si le cadre est flou, tu génères 10 fois plus de code flou, 10 fois plus vite. Au bout de deux semaines, ton projet est un champ de ruines illisible et chaque modification casse trois autres choses.

Si le cadre est clair, tu génères 10 fois plus de code propre, 10 fois plus vite. Au bout de deux mois, tu as un SaaS qui tient la route.

Chez moi, le cadre s'appelle l'architecture hexagonale. C'est une discipline que j'ai imposée dès le jour 1. Le domaine ne dépend de rien. Les ports sont des interfaces TypeScript. Les adapters implémentent les ports. Les usecases orchestrent.

Le fichier `CLAUDE.md` du projet fait 600 lignes. Il contient :

- La vision produit et les règles métier
- Le contrat strict de l'architecture hexagonale (quelle couche peut importer quelle couche)
- Les règles du design system (variants de boutons, tailles, tokens)
- La stratégie de tests (BDD lightweight, test.each pour les spec by example)
- Les décisions architecturales datées

Ce fichier est lu par l'IA à chaque session. C'est un contrat moral entre moi et l'agent. Il fixe les invariants que je veux préserver même quand je suis fatigué à 23h et que j'aurais la tentation de bricoler une solution rapide.

Les commits le montrent. Quasi systématiquement, une feature se termine par un commit `refactor(...)` qui nettoie ce qui vient d'être produit. C'est devenu un réflexe imposé par la mémoire long terme de l'agent : après chaque implémentation, relire le code produit et le simplifier.

Ce n'est pas une option. C'est une règle.

> **Troisième apprentissage :** le cadre que tu poses avant le premier commit décide de ce que le projet sera au commit 1 780. L'IA ne t'en fait pas cadeau, elle ne fait que répliquer ce qui est déjà là.

---

## La mémoire long terme, ou comment ne pas répéter les mêmes conneries

Claude Code maintient un répertoire de mémoire persistante. Des fichiers markdown que l'agent écrit pour lui-même, et qu'il relit au début de chaque session.

Mon répertoire contient aujourd'hui une vingtaine de fichiers, chacun dédié à un sujet précis. Exemples :

- `feedback_workflow_git.md` : les règles de branching systématique (une branche par feature, jamais de commit direct sur main, PR avec titre conventionnel).
- `feedback_accents_agents.md` : rappel que tout le français écrit doit porter ses accents.
- `feedback_tests_never_red.md` : ne jamais laisser un test en rouge, même flaky.
- `feedback_release_process.md` : la checklist complète de montée de version avec Release Please.
- `feedback_email_content_separation.md` : tout email doit séparer contenu (`.md` éditable) et template React.

Chaque fichier est né d'une erreur. La première fois qu'elle a été commise, je l'ai signalée. L'agent a créé le fichier. Les fois suivantes, il le relit avant d'agir. L'erreur ne se répète plus.

C'est l'équivalent d'un onboarding continu pour un collègue qui ne quitte jamais l'équipe.

Plus intéressant encore : ce mécanisme m'a forcé à **formaliser mes propres règles**. Quand je m'énerve parce que l'agent a pris un raccourci, je me demande : cette règle, est-ce que je l'ai écrite quelque part ? Si non, c'est de ma faute. J'écris la règle. La prochaine fois, elle sera tenue.

Au bout de deux mois, j'ai une documentation vivante de mes préférences d'ingénieur que je n'avais jamais pris le temps d'écrire pour moi-même.

> **Quatrième apprentissage :** travailler avec un agent IA, c'est écrire en même temps le code et le contrat qui gouverne comment ce code doit être écrit. Les deux s'entraînent mutuellement.

---

## Produit, spec, exploratoire : comment on décide quoi construire

Jusqu'ici j'ai parlé de code, d'architecture, de tests. C'est la moitié du sujet.

L'autre moitié, celle dont on parle encore moins quand on parle d'IA, c'est **le travail amont**. Comment on décide quoi construire, comment on explore une idée floue, comment on la transforme en quelque chose d'exécutable. C'est le territoire du produit, de la spec, des mockups, du backlog. Et c'est là que l'IA change autant le métier, peut-être plus, que côté code.

Sur The Playground, aucune feature significative n'est arrivée directement en implémentation. Chaque fois, il y a eu un **cycle exploratoire** avant la première ligne de code. Et ce cycle, l'agent y joue un rôle actif.

**1. La conversation exploratoire.**

J'arrive avec une idée floue, souvent mal formulée. Exemple vécu : "il faudrait pouvoir regrouper plusieurs Communautés sous une page commune, un truc genre fédération". L'agent ne se jette pas sur le code. Il pose des questions : qui en aurait besoin ? quels cas concrets tu as en tête ? quelles alternatives existent (Meetup Pro, Eventbrite Organization) ? quel impact sur le modèle de données ? quelles tensions potentielles avec les Communautés existantes ?

Au bout de 20 à 30 minutes de dialogue, l'idée floue est devenue un périmètre clair. Ce périmètre n'est pas arbitraire : il a été sculpté par des questions que je me serais posées tout seul, mais plus lentement, et souvent après avoir déjà fait construire du code inutile.

**2. Le mockup HTML comme artefact intermédiaire.**

Avant toute implémentation, je demande à l'agent un **mockup HTML interactif**. Fichier `.mockup.html` autonome, Tailwind inline, navigation cliquable. Pas du wireframe, du visuel précis, au pixel près, qui montre ce que verrait l'utilisateur.

Ça a l'air anodin. C'est fondamental. Un mockup HTML oblige à trancher sur des détails qui sont invisibles dans une spec textuelle : hiérarchie visuelle, ordre des champs, états vides, états d'erreur, comportement mobile. Et comme c'est l'agent qui le produit en quelques minutes, le coût d'itération est nul. J'en ai parfois trois versions avant d'en valider une. Ce qui aurait pris une journée avec un designer externe prend une heure.

Le mockup devient ensuite la **référence partagée** pour l'implémentation. L'agent qui code relit le mockup. Je n'ai pas besoin de décrire l'UI dans un ticket, elle est déjà exprimée.

**3. La spec markdown, écrite par l'agent à partir de la conversation.**

Une fois le périmètre clarifié et le mockup validé, je demande à l'agent de **rédiger la spec** dans un fichier markdown sous `spec/`. Il synthétise la conversation, structure les sections (contexte, problème, solution, impacts techniques, risques, étapes), liste les décisions prises avec leur raison.

Je relis la spec (ça, je la relis, parce que c'est du texte d'intention, pas du code), je corrige ce qui ne reflète pas ma pensée, j'ajoute ce qui manque. Souvent très peu. L'agent a bien saisi l'échange.

La spec devient le document de référence pour les sessions suivantes, qui peuvent être à plusieurs jours d'intervalle. Sans spec, l'agent oublierait le contexte. Avec spec, il reprend exactement là où on s'est arrêté.

**4. Le backlog vivant.**

Parallèlement, un `BACKLOG.md` centralise toutes les idées à venir, priorisées P0/P1/P2, avec pour chaque entrée le problème visé, le périmètre envisagé, et le statut. L'agent lit le backlog, peut proposer des regroupements, signaler des dépendances entre entrées, suggérer des découpages.

Le backlog n'est pas un outil externe type Linear ou Jira. C'est un fichier dans le repo, versionné, accessible à l'agent en lecture et en écriture. Il se met à jour au fil des retours utilisateurs et des arbitrages. Il devient la mémoire produit du projet, consultable à tout moment.

**5. La discipline "une question n'est pas instruction".**

Une règle dure, née de plusieurs frustrations : quand je pose une question ("est-ce qu'on devrait pouvoir marquer un événement comme proposé avant qu'il soit publié ?"), l'agent ne l'interprète **pas** comme une instruction à implémenter. Il analyse l'impact, présente les trade-offs, demande confirmation avant d'écrire la moindre ligne.

Ça paraît évident. En pratique, sans cette règle explicite, un agent zélé se jette sur l'implémentation au premier signal. Et tu te retrouves avec 200 lignes de code sur une feature que tu n'avais pas encore décidé de faire.

Cette règle transforme la conversation en vrai **atelier produit**. J'explore sans risque. Je peux dire "et si on faisait X ?" sans craindre que X soit déjà à moitié codé quand je veux revenir en arrière.

> **Cinquième apprentissage :** l'IA ne fait pas que remplacer l'exécution technique. Elle remplace aussi une partie du travail de product management : reformulation d'idées floues, production rapide d'artefacts intermédiaires (mockups, specs), maintien d'une mémoire produit vivante. Le CPO ou le CPTO qui veut comprendre où va son métier a intérêt à regarder ça de près. Le produit ne se délègue pas à l'IA, mais sa **mise en forme** change radicalement. C'est la naissance d'un nouveau rôle, celui de Product Builder.

---

## Ce que l'IA fait mal

Tout n'est pas rose. Il y a des classes de problèmes où l'IA dérape systématiquement. En voici trois, vécues en direct.

**1. L'angle mort sur les effets de bord.**

Quand tu demandes "ajoute un champ `website` à la Communauté", l'IA le fait proprement : migration, formulaire, validation, affichage sur la page. Mais elle ne va pas d'elle-même mettre à jour les douze autres endroits où ce champ devrait apparaître : l'email d'invitation, l'export CSV, l'API publique, les traductions FR et EN, la page d'aide, le sitemap, les données structurées SEO, le dashboard Organisateur. Elle raisonne localement, bien. Elle raisonne transversalement, mal.

C'est précisément pour ça qu'on a des agents dédiés qui repassent derrière, chacun spécialisé sur un axe transversal : `docs-coherence-guardian` pour la cohérence documentation et code, `i18n-guardian` pour les clés oubliées entre `fr.json` et `en.json`, `test-coverage-guardian` pour les parcours E2E manquants. Sans cette chaîne, les effets de bord s'accumulent silencieusement. Avec elle, ils se voient et se corrigent à la PR suivante.

Corollaire : **l'IA est redoutable pour résoudre des problèmes bien posés, médiocre pour percevoir la portée réelle d'un changement**. Le travail humain n'est pas de relire le code, mais de concevoir les agents qui traquent ce que l'agent principal n'aurait pas vu.

**2. La sur-ingénierie silencieuse.**

Sans instruction contraire, elle ajoute de la défense en profondeur : validations redondantes, try/catch partout, fallbacks pour des cas qui ne se produiront jamais. Le code marche, mais il gonfle.

Il a fallu une règle explicite dans `CLAUDE.md` :

> Ne jamais ajouter de gestion d'erreur, de fallback ou de validation pour des scénarios qui ne peuvent pas arriver. Faire confiance au code interne et aux garanties du framework. Ne valider qu'aux frontières du système (input utilisateur, API externes).

Avec cette règle, le code a maigri. Sans elle, il grossissait à chaque feature.

**3. Les hallucinations sur les librairies récentes.**

Next.js 16, Auth.js v5, Prisma 7. Trois piliers du stack, tous sortis récemment. L'IA invente parfois des APIs qui n'existent pas, ou qui existaient dans une version antérieure. Je ne le vois pas en relisant, puisque je ne relis pas. Je le vois à deux endroits : la CI qui échoue en typecheck ou au build, et les agents de revue qui tournent sur la PR. Les deux couches suffisent, dans la grande majorité des cas, à faire remonter l'hallucination avant le merge.

Quand il reste un doute sur une API "trop magique", je ne plonge pas dans le code. Je demande à l'agent de pointer la documentation officielle, version précise. S'il n'y arrive pas, c'est probablement qu'elle n'existe pas et on corrige.

> **Sixième apprentissage :** l'IA ne dispense pas de contrôler, mais le contrôle se déplace. Ce qui était autrefois une relecture humaine ligne par ligne devient un système de vérifications automatisées : CI stricte, tests, agents de revue spécialisés, observabilité. Le développeur industrialise la méfiance au lieu de l'exercer à la main.

---

## Les agents qui vérifient les autres agents

C'est un sujet qui, à mes yeux, est fondamental et qui change complètement la donne.

Quand l'IA écrit 100% du code et que je ne le relis pas à la main, la question devient : qui garantit que ce qui part en prod est sain ? La réponse n'est pas "la confiance". La réponse est une **chaîne d'agents et d'outils spécialisés**, chacun ayant une responsabilité claire sur un axe précis.

Sur The Playground, cette chaîne ressemble à ça :

- **`security-guardian`** : audit de sécurité à 6 dimensions (RBAC, IDOR, CSRF, CSP, validation des inputs, RGPD, CI/CD, secrets). Lancé régulièrement, et systématiquement après une feature sensible.
- **`performance-guardian`** : détection des N+1 queries, index manquants, régressions de bundle JS, problèmes Core Web Vitals.
- **`test-coverage-guardian`** : vérifie la couverture des usecases et des parcours E2E, crée les tests manquants.
- **`i18n-guardian`** : détecte les textes hardcodés en français ou en anglais, les clés désynchronisées entre `fr.json` et `en.json`, les namespaces manquants.
- **`docs-coherence-guardian`** : audite la cohérence entre la documentation, la page Aide, et l'état réel du code. Met à jour les documents qui ont dérivé.
- **`dast-runner`** : scan OWASP ZAP automatique sur la preview et la prod.

Ces agents sont spécialisés, lancés à la demande ou en CI, et ils produisent des rapports que l'agent principal peut ensuite exploiter pour corriger. Un guardian qui trouve une faille, c'est une nouvelle tâche pour Claude Code. Un guardian qui trouve un texte hardcodé, c'est une correction i18n enchaînée.

À cela s'ajoutent les couches classiques mais rendues plus strictes par la règle "le code n'est pas relu" :

- **TypeScript strict** partout, typecheck bloquant en CI.
- **Vitest** : 86 fichiers de tests unitaires (domaine + usecases avec ports mockés, BDD lightweight en Given/When/Then natif).
- **Playwright** : 24 scénarios E2E qui rejouent les parcours critiques (inscription événement, paiement Stripe, liste d'attente, check-in).
- **axe-core** intégré dans Playwright pour l'accessibilité.
- **Lighthouse CI** sur les pages événement (l'unité virale, doit être rapide).
- **pnpm audit** en CI pour détecter les CVE dans les dépendances.
- **Sentry + PostHog** pour attraper ce qui glisse quand même jusqu'en production.

Ce que cette chaîne permet : je peux livrer une feature à 23h sans avoir lu une seule ligne du diff, la merger le lendemain matin, et dormir tranquille. Pas parce que je fais confiance à l'agent qui a écrit. Parce que je fais confiance aux **autres agents** qui ont vérifié après lui, chacun sur son axe.

> **Septième apprentissage :** on ne remplace pas la relecture humaine par rien. On la remplace par un système d'agents spécialisés dont le rôle est précisément de trouver ce que l'agent principal n'a pas vu. Le travail humain devient la conception de cette chaîne, pas son exécution.

---

## L'observabilité : la dernière ligne de défense

Un truc dont on parle peu : un projet fait avec l'IA ne marche vraiment que si **la boucle de feedback est quasi temps réel**.

Mon stack de télémétrie :

- **Vercel** pour le déploiement. Chaque PR génère une URL de preview, chaque merge déploie en prod.
- **Sentry** pour les erreurs. Chaque exception en prod arrive avec stack trace complète.
- **PostHog** pour le produit. Qui fait quoi, combien de temps, à quel moment il part.
- **Slack** pour les signaux critiques (nouvelle inscription, nouveau commentaire, alertes admin).

Quand une feature part en prod, je vois en quelques minutes si elle casse, si elle est utilisée, si elle génère de la friction. Sentry me remonte un pic d'exceptions sur tel composant, PostHog me montre qu'un bouton est vu mais pas cliqué, ou cliqué puis abandonné juste après.

Avec cette boucle, l'IA devient un exécuteur de corrections rapides. Je vois, je décris, elle corrige, on déploie. En une heure, un bug identifié à 9h est résolu en prod à 10h.

Sans cette boucle, l'IA produirait du code dans le vide. C'est l'observabilité, couplée au monitoring en temps réel, qui donne du sens aux itérations.

> **Huitième apprentissage :** l'observabilité n'est plus un luxe, c'est un multiplicateur de l'IA. Ton agent n'est utile que si tu peux lui dire, chiffres à l'appui, ce qui marche et ce qui ne marche pas.

---

## Ce qui reste profondément humain

Voilà où je veux arriver.

Sur deux mois, l'IA a écrit tout le code. Vraiment tout. Pas une seule ligne tapée à la main. Et pas de relecture ligne à ligne non plus. Les seules choses que j'ai écrites moi-même, ce sont les prompts et en partie les documents d'intention : spécifications, messages marketing, décisions produit.

Mais il y a des choses qu'elle n'a pas faites.

**Elle n'a pas décidé quoi construire.**

Le modèle "community-centric" qui différencie The Playground de Luma et de Meetup, c'est une conviction produit. Elle vient d'années à animer ou à participer à des communautés, d'avoir vu Meetup s'enfermer dans son modèle, d'avoir vu Luma briller sur la page événement et s'arrêter là. L'IA ne pouvait pas formuler ce diagnostic. Elle l'a traduit en code, très bien. Mais la thèse, c'est la mienne.

**Elle n'a pas écouté les utilisateurs.**

Il y a [Chris Deniaud](https://www.linkedin.com/in/christophe-deniaud/), organisateur d'Agile Bordeaux, la première communauté active sur la plateforme, qui me remonte des irritants concrets depuis le terrain, à chaque événement qu'il organise. Il y a [Fatima](https://www.linkedin.com/in/fzhamil/), qui a testé la plateforme et partagé des retours détaillés sur LinkedIn, bugs inclus. Il y a [Greg](https://www.linkedin.com/in/greg-lhotellier/), organisateur de [Dev With AI](https://www.devw.ai/) qui m'a expliqué pourquoi il hésite à migrer depuis Luma, malgré son envie : sa communauté de 800 membres déjà construite, les webhooks de son automatisation déjà en place, la découvrabilité gratuite que Luma lui offre. Il y a [La Grappe Numérique](https://www.lagrappenumerique.fr/#/), réseau de communautés bordelaises, dont l'invitation à pitcher a fait naître la fonctionnalité Réseaux que je décrivais plus haut.

Ces retours, c'est moi qui les ai cherchés, écoutés, digérés. C'est moi qui ai décidé lesquels transformer en features prioritaires et lesquels reporter.

**Elle n'a pas arbitré les tensions.**

Faire un produit gratuit à 100% ou prélever une commission de 1% pour pérenniser ? Ouvrir la découverte publique ou la réserver aux communautés invitées ? Imposer la connexion obligatoire ou permettre l'exploration anonyme ? Ces arbitrages sont venus de conversations avec des utilisateurs, d'hésitations personnelles, de nuits blanches. L'IA aide à explorer les trade-offs. Elle ne tranche pas.

> **Neuvième apprentissage :** l'IA n'a pas remplacé le développeur ni le product manager. Elle a remplacé la partie "taper du code", une grande partie de la vérification, et une bonne moitié de la mise en forme produit (specs, mockups, backlog). Elle n'a pas remplacé la vision, l'écoute des utilisateurs, les arbitrages stratégiques. Ce qui était rare avant l'IA est devenu encore plus rare, et encore plus précieux.

---

## Ce que ça change pour ceux qui codent

Je garde la dernière observation pour la fin.

Pendant longtemps, le développeur senior était celui qui savait écrire du code propre dans des systèmes complexes. C'était son capital.

Ce capital ne vaut plus grand-chose. Ou plutôt, il vaut encore quelque chose, mais pour une raison très différente et sous une casquette différente, celle de Product Builder. Il sait **juger les décisions** dans un système complexe. Il sait dire "cette abstraction est prématurée", "ce test ne teste rien", "cette optimisation va nous coûter cher en lisibilité", "cette dépendance va nous verrouiller dans six mois".

Le Product Builder devient un **architecte d'un système d'agents**. Il construit le cadre dans lequel les agents travaillent : les règles écrites, les contrats d'architecture, les garde-fous de tests, les agents de revue spécialisés, les boucles d'observabilité. Il oriente l'exécution, il tranche les arbitrages produit et techniques. L'écriture et la relecture sont déléguées. L'intelligence structurante reste chez lui.

Ce que j'ai vécu ces deux mois, c'est ce passage. Dès le premier jour, je me suis interdit d'écrire la moindre ligne de code et d'en relire une seule à la main. Pas par idéologie, mais parce que chaque fois que j'aurais été tenté de "reprendre le contrôle" en tapant moi-même, j'aurais manqué l'occasion de formaliser la règle qui empêchait le problème de se répéter. Me priver du clavier m'oblige à écrire la règle. La prochaine fois, l'agent la tient tout seul, et un autre agent vérifie qu'il l'a tenue.

Aujourd'hui, à la 373e PR mergée, je ne me vois plus travailler autrement. Non pas parce que c'est plus rapide (même si ça l'est). Parce que c'est **intellectuellement plus juste**. Je passe mon temps à décider, à arbitrer, à écouter les utilisateurs, à formuler des questions, à relier les signaux. Pas à taper ni à relire du code.

---

## Ce que je ne sais pas encore

Je veux être honnête sur le périmètre.

C'est une expérience **solo**. Je n'ai pas testé cette méthode avec trois développeurs, encore moins avec trente. Comment se partage le `CLAUDE.md` entre plusieurs mains ? Comment on fait vivre les règles quand chacun a son style ? Comment un nouvel arrivant prend le train en route ? Je ne sais pas.

C'est une expérience sur **deux mois**. Un SaaS neuf, bâti d'un trait, avec une architecture que j'ai posée moi-même le jour 1. Je ne sais pas ce que donne cette méthode sur un monolithe legacy de cinq ans, avec dix ans de dette, des modules que personne ne comprend plus et une couverture de tests qui plafonne à 20%. Mon intuition est que ça marche aussi, mais à condition de commencer par un gros travail de documentation et de délimitation. Je n'ai pas la preuve.

C'est une expérience sur **un stack moderne** (Next.js, Prisma, Auth.js, Vercel). L'IA connaît ces outils. Elle serait probablement plus hésitante sur du COBOL, du SAP ABAP, du Ruby on Rails 3.2 d'entreprise. Je n'ai pas testé.

Et c'est une expérience d'un développeur qui a vingt-cinq ans de métier derrière lui. Mon intuition architecturale, celle qui me permet de juger en trois secondes si une proposition de l'agent tient ou dérape, elle vient de là. Je ne sais pas à quoi ressemblerait cette méthode pour un junior qui démarre. Peut-être qu'elle marche aussi, avec un autre cadre. Peut-être pas.

À prendre comme ça : le retour d'un solo, sur deux mois, sur un produit neuf, avec un stack moderne, par quelqu'un qui a déjà beaucoup codé avant. Chaque paramètre compte.

---

## En conclusion

Deux mois, 1 780 commits, une plateforme SaaS en production. Un seul développeur. Des soirées et des week-ends.

Ce n'est pas un exploit. C'est la nouvelle normalité pour qui veut s'y mettre sérieusement.

Ce qui a rendu ça possible :

- Un cadre architectural posé avant la première ligne
- Des règles écrites, vivantes, améliorées à chaque erreur
- Une boucle de feedback temps réel (déploiement, monitoring d'erreurs, observabilité produit)
- Une chaîne d'agents de revue qui industrialise la méfiance à la place de la relecture humaine
- Une conviction produit qui précède la technique, nourrie par des retours utilisateurs réels

Ce qui, autrefois, comptait et ne compte plus :

- Les compétences brutes de développement
- La connaissance des langages et des frameworks à jour
- La mémoire des patterns

Ce qui reste rare, et ce qui va continuer à l'être, c'est **savoir quoi construire, pour qui, et pourquoi**.

L'IA donne les outils à ceux qui ont la vision. Elle ne donne pas la vision à ceux qui ont les outils.

The Playground est en ligne. Si vous animez une communauté, je serais heureux que vous la regardiez.

→ [the-playground.fr](https://the-playground.fr)

Et pour ceux qui veulent voir comment c'est fait, le repo est public sur [GitHub](https://github.com/DragosDreptate/the-playground).
