# Registre de décisions — The Playground

Ce dossier contient les **ADR** (Architecture Decision Records) : les décisions structurantes du projet, avec le **contexte qui nous y a menés**, pour ne pas réinventer la roue ni s'écarter d'un choix déjà tranché.

## Deux niveaux

| Niveau | Où | Quand |
|---|---|---|
| **Ligne** | `spec/decisions.md` (table chronologique) | **Toute** décision structurante. Index scannable. |
| **ADR** | `spec/decisions/NNNN-slug.md` | Décisions **vraiment structurantes** : celles où, dans 6 mois, on se demandera « pourquoi on a fait ça » ou « qu'est-ce qu'on avait écarté ». |

> `spec/decisions.md` est le **registre canonique** (source unique de vérité). `CLAUDE.md` n'y renvoie que via un pointeur, pour éviter la divergence.

## Qu'est-ce qu'une décision « structurante » ?

Une décision qui **contraint la suite** du projet et qu'on regretterait de devoir re-débattre. Fonctionnelle, stratégique, technique, produit, UX, sécu, infra. Exemples : choix d'architecture, terminologie figée, périmètre MVP, modèle de données, politique de sécurité, positionnement, convention transverse.

**Pas structurant** (n'entre pas ici) : un fix de bug, un renommage local, un détail d'implémentation réversible sans coût.

## Créer un ADR

1. Copier `0000-template.md` vers `NNNN-slug.md` (numéro suivant, 4 chiffres).
2. Remplir Contexte → Décision → Alternatives écartées → Conséquences.
3. Ajouter la ligne correspondante dans `spec/decisions.md` avec le lien `→ ADR-NNNN`.

## Statuts

- **Accepté** — en vigueur.
- **Superseded par ADR-XXXX** — remplacé par une décision ultérieure (ne pas supprimer l'ancien, on garde la trace).
- **Déprécié** — abandonné sans remplaçant.

## Index des ADR

| ADR | Titre | Statut |
|---|---|---|
| [0001](0001-oauth-account-linking.md) | Liaison automatique des comptes OAuth sur email vérifié | Accepté |
| [0002](0002-reusable-magic-link.md) | Magic link réutilisable (15 min) au lieu d'un token à usage unique | Accepté |
| [0003](0003-explorer-score-vs-no-global-ranking.md) | Score de pertinence Explorer, compatible avec « pas de ranking global » | Accepté |
| [0004](0004-botid-sign-in-fail-open.md) | Protection anti-bot du sign-in via Vercel BotID (fail-open) | Accepté |
