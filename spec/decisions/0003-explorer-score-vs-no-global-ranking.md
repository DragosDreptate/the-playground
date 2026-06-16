# ADR-0003 — Score de pertinence Explorer, compatible avec « pas de ranking global »

- **Date** : 2026-03-13
- **Statut** : Accepté
- **Références** : `spec/features/explorer-rating.md` ; `src/app/api/cron/recalculate-scores/route.ts`

## Contexte

Deux exigences entrent en tension :

1. `CLAUDE.md` pose un principe structurant : **« Pas d'algorithme de ranking global »** (on ne construit ni feed social, ni boucle d'optimisation pour l'engagement, ni classement personnalisé).
2. La page **Découvrir / Explorer** (annuaire public des Communautés et événements) doit bien présenter ses entrées dans **un ordre**. Un tri purement aléatoire ou strictement chronologique dégrade la découverte (les Communautés actives et pertinentes doivent remonter).

Il faut donc ordonner l'Explorer sans réintroduire par la bande le ranking global qu'on a explicitement banni.

## Décision

Introduire un `explorerScore` (entier 0-100, **invisible** côté UI) :

- Calculé par un **cron quotidien** (`/api/cron/recalculate-scores`) à partir de signaux **objectifs** : nombre de membres, inscriptions, récence.
- **Override admin** possible (`overrideScore`) et exclusion manuelle (`excludedFromExplorer`).
- Données `@test.playground` exclues, Communautés démo (`isDemo`) capées.

## Pourquoi ce n'est pas le « ranking global » interdit

- **Scope limité** à une seule page d'annuaire (l'Explorer), pas un classement appliqué partout dans le produit.
- **Déterministe et non personnalisé** : le même ordre pour tout le monde, aucune boucle d'optimisation par utilisateur, aucun signal comportemental individuel.
- **Reprenable à la main** : l'admin peut surcharger ou exclure, ce n'est pas une boîte noire auto-renforçante.

## Alternatives écartées

- **Tri aléatoire ou purement chronologique** — écarté : découverte pauvre, les Communautés actives ne ressortent pas.
- **Ranking personnalisé par utilisateur (façon feed)** — écarté : violerait frontalement le principe, et ajouterait une complexité (et une dépendance comportementale) qu'on ne veut pas.

## Conséquences

- L'Explorer est ordonné utilement sans devenir un feed.
- **À ne pas « corriger »** : quelqu'un qui lit le principe « pas de ranking global » dans `CLAUDE.md` pourrait croire que ce score le viole et vouloir le retirer. C'est un **écart délibéré et cadré** (scope Explorer, déterministe, override-able) ; cet ADR existe pour éviter cette régression.
