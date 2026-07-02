---
name: verify-plan
description: Audit exhaustif d'un plan d'implémentation construit dans la session courante, AVANT d'écrire la moindre ligne de code. Confronte le plan à l'intention (fidélité à la demande, scope creep, arbitrages pris dans la session), à la véracité (hypothèses sur le code réel), à la cohérence (archi hexagonale, réutilisation de l'existant, design system, terminologie Circle/Moment), à la complétude (toutes les couches schema→UI, DB dev+prod, tests, i18n FR/EN, mobile, états, page Aide, notifs, sitemap) et aux régressions (call sites, comportements connexes, tests qui cassent, choix délibérés). Déclenchée par "verify-plan", "vérifie le plan", "audite le plan", "le plan est-il prêt à implémenter ?", "/verify-plan". À utiliser AVANT d'implémenter. Différent de /code-review (revue de code déjà écrit) et de challenge-spec (qui n'attaque QUE la véracité factuelle d'une spec, pas l'intention/cohérence/complétude/régressions).
---

# verify-plan

Audit exhaustif d'un plan d'implémentation construit dans la session courante, AVANT d'écrire la moindre ligne de code. Confronte le plan à l'intention, au code existant et aux règles du projet.

## Objectif

Ce n'est PAS une revue de code (il n'y a pas encore de code) ni une checklist technique. C'est un **audit de plan** : le plan reflète-t-il fidèlement la demande ? Ses affirmations sur le code existant sont-elles vraies ? Est-il complet, cohérent avec l'existant, et sans risque de régression ?

> Un plan faux coûte beaucoup plus cher une fois implémenté. Chaque affirmation du plan doit être vérifiée contre le code réel, jamais acceptée sur parole — y compris si c'est moi qui ai écrit le plan.

## Exécution

### Étape 0 — Identifier le plan et son périmètre

Retrouver le plan dans la conversation courante : le dernier plan d'implémentation présenté (étapes, fichiers à créer/modifier, choix techniques).

Si aucun plan n'a été construit dans la session → **STOP**. Informer l'utilisateur qu'il n'y a pas de plan à auditer.

Reconstituer explicitement :
- **L'objectif** : quel problème ce plan résout-il ?
- **Le périmètre** : quels fichiers/couches/parcours le plan touche-t-il ?
- **Les hypothèses** : quelles affirmations le plan fait-il sur le code existant (fichiers, fonctions, schémas, comportements) ?

### Étape 1 — Confronter le plan à l'intention

Retrouver la source de l'intention. Chercher dans cet ordre :

1. **La conversation courante** — la demande initiale, la spec, les précisions et arbitrages donnés par l'utilisateur au fil de la session. Si l'utilisateur a tranché un point en cours de route, c'est sa dernière position qui fait foi.
2. **CLAUDE.md** — règles métier, positionnement community-centric, décisions documentées. Le plan les respecte-t-il ?
3. **La spec ou l'issue liée** — si le plan découle d'un fichier `spec/` ou d'une issue GitHub, relire la source.

Pour chaque étape du plan, se poser :
- **Est-ce que ça répond à ce qui a été demandé ?** Pas plus, pas moins. Signaler le scope creep (le plan en fait trop) autant que les manques.
- **Le plan contredit-il un arbitrage pris dans la session ?** Une option écartée par l'utilisateur ne doit pas réapparaître.
- **Les choix techniques sont-ils justifiés par la demande**, ou sont-ce des préférences non sollicitées ?

### Étape 2 — Vérifier la véracité du plan (pas d'erreurs)

Chaque affirmation factuelle du plan doit être confrontée au code réel. Lire les fichiers concernés :

- **Fichiers et chemins** : les fichiers que le plan prévoit de modifier existent-ils, au chemin indiqué ?
- **Fonctions, types et signatures** : les usecases, ports, repositories, actions et composants que le plan référence existent-ils avec la forme décrite ? Les signatures supposées sont-elles exactes ?
- **Schema Prisma** : les modèles, champs, enums et contraintes que le plan suppose sont-ils conformes à `prisma/schema.prisma` ?
- **Comportement existant** : quand le plan affirme "actuellement le code fait X", vérifier que c'est vrai en lisant le code.
- **Clés i18n** : les namespaces et clés que le plan prévoit de réutiliser existent-ils dans fr.json/en.json ?

Toute hypothèse fausse est un ❌ : le plan bâtit dessus.

### Étape 3 — Confronter à l'existant (cohérence)

Lire le code autour des zones que le plan touche pour détecter les incohérences :

- **Architecture hexagonale** : le plan respecte-t-il le sens des imports (domaine pur, ports/adapters, usecases injectés) ? Prévoit-il bien chaque couche au bon endroit ?
- **Patterns divergents** : le plan propose-t-il de faire différemment d'un code similaire existant (gestion d'erreur, format de retour, nommage, structure de server action) ? Si oui, est-ce justifié ou est-ce une dérive ?
- **Réutilisation** : le plan prévoit-il de créer quelque chose qui existe déjà (composant, helper, usecase, clé i18n) ?
- **Design system** : si le plan ajoute des boutons/UI, respecte-t-il les règles du design system (un seul `default` par page, variants, tailles) ?
- **Terminologie** : code = termes EN (Circle, Moment, Host, Player), user-facing = FR/EN (Communauté/Community, événement/Event, Rejoindre vs S'inscrire) ?

### Étape 4 — Vérifier la complétude (pas d'oublis)

Examiner si le plan couvre toute la surface attendue :

**Couches touchées** — si le plan ajoute/modifie un usecase ou un champ :
- Toutes les couches sont-elles prévues : schema Prisma → modèle domaine → port → repository (mapping) → usecase → server action → composant UI ?
- Le push DB est-il prévu sur les DEUX branches (dev + prod) si le schema change ?
- Une migration ou un backfill des données existantes est-il nécessaire et prévu ?

**Parcours utilisateur** — si c'est une feature user-facing :
- Le parcours Organisateur est-il couvert de bout en bout ? Le parcours Participant ?
- Les clés i18n FR ET EN sont-elles prévues ?
- Le cas mobile est-il considéré (sans modifier le comportement mobile existant sans demande explicite) ?
- Tous les états sont-ils traités : vide, chargement, erreur, DRAFT/PUBLISHED/CANCELLED/PAST, liste d'attente, non-membre vs membre vs Host ?

**Oublis classiques du projet** :
- [ ] **Tests** : le plan prévoit-il les tests unitaires des usecases et l'impact sur les E2E ?
- [ ] **Sécurité** : auth + autorisation dans les server actions, isolation multi-tenant ?
- [ ] **Notifications/emails** : le nouveau comportement impacte-t-il des emails existants, ou en nécessite-t-il de nouveaux ?
- [ ] **Page Aide** : feature user-facing → mise à jour prévue ?
- [ ] **Sitemap / OG / Explorer** : si le plan touche la visibilité publique d'entités (Moments, Circles) ?

### Étape 5 — Anticiper les régressions

Pour chaque fichier/fonction que le plan prévoit de modifier, identifier ce qui en dépend déjà :

- **Call sites** : qui appelle les fonctions/usecases/actions modifiés ? Le changement de signature ou de comportement casse-t-il un appelant non mentionné dans le plan ?
- **Comportements connexes** : si le plan touche l'inscription, quel impact sur la liste d'attente, la promotion automatique, le compteur de participants, l'adhésion auto au Circle, la page Communauté ?
- **Données en base** : le nouveau code est-il compatible avec les données existantes (anciennes rows sans le nouveau champ, états historiques) ?
- **Tests existants** : quels tests unitaires/E2E vont casser ? Le plan prévoit-il leur mise à jour ?
- **Comportements volontaires** : le plan ne "corrige"-t-il pas un comportement qui est en réalité un choix délibéré documenté (ex: notif unique à l'adhésion via événement) ?

## Rapport final

Structurer le rapport en 3 sections :

### 1. Résumé du plan
En 2-3 phrases : qu'est-ce que le plan propose, quel était l'objectif.

### 2. Findings

Classer les constats par étape d'audit (intention / véracité / cohérence / complétude / régressions), avec un des 3 niveaux :
- ✅ **Conforme** — le point est vérifié et solide
- ⚠️ **À vérifier** — un point d'attention, un cas limite non couvert, ou une hypothèse non confirmée
- ❌ **Problème** — une affirmation fausse, un écart avec la demande, un oubli bloquant, ou une régression probable

Pour chaque ⚠️ ou ❌, indiquer :
- **Quoi** : description concrète du problème
- **Où** : l'étape du plan concernée, et le fichier:ligne du code réel qui le prouve
- **Pourquoi** : en quoi c'est un problème (référence à la demande, au CLAUDE.md, ou au code existant)
- **Correction du plan** : comment amender le plan (pas le code — le code n'existe pas encore)

### 3. Verdict global

- **Plan prêt à implémenter** — fidèle à l'intention, hypothèses vérifiées, complet, sans régression identifiée
- **Ajustements mineurs suggérés** — des ⚠️ non bloquants, l'implémentation peut démarrer en les gardant en tête
- **Plan à corriger** — au moins un ❌, lister les amendements à apporter au plan avant toute implémentation
