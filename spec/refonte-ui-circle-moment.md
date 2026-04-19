# Refonte UI/UX — Communauté & événement

> Chantier long-lived démarré le 2026-04-19. Branche `feat/ui-refonte-circle-moment`. Aucun merge en production avant validation complète.

## Objectif

Refondre en profondeur l'UX/UI des pages Communauté et événement (vues publique et dashboard) par itération incrémentale, en gardant une cohérence parfaite entre les surfaces partageant des éléments UI communs.

## Périmètre — 4 surfaces × 2 breakpoints

| Page | Vue publique | Vue dashboard (Organisateur) |
|---|---|---|
| Communauté | `/c/[slug]` + `/circles/[slug]` | `dashboard/circles/[slug]` |
| événement | `/m/[slug]` | `dashboard/circles/[slug]/moments/[momentSlug]` |

Chaque surface a son rendu **mobile** et **desktop**, maintenus en cohérence.

## Protocole de travail (résumé)

À chaque modification UI demandée :

1. Appliquer la modif sur la cible demandée
2. Identifier les autres surfaces concernées parmi les 8 rendus
3. Signaler et demander confirmation avant toute propagation
4. Propager uniquement ce qui est validé

**Zéro généralisation silencieuse.** Mobile + desktop traités ensemble.

Détail complet : voir `memory/project_refonte_ui_circle_moment.md` dans la mémoire Claude.

## Éléments partagés à surveiller (cross-view alert)

| Élément | Surfaces concernées |
|---|---|
| Bloc Organisateur | Communauté publique, événement publique, cards dashboard |
| Bloc Membres / avatars | Communauté publique, inscrits événement publique |
| Cover image (1:1) | Communauté publique + dashboard, événement publique + dashboard |
| Prochains événements | Communauté publique, dashboard Communauté |
| CTA principal | S'inscrire, Créer événement, Modifier (toutes surfaces) |
| Meta info (date, lieu, capacité) | événement publique + dashboard |
| Hiérarchie hero (titre, sous-titre, badge) | Toutes les surfaces |
| Fil de commentaires | événement publique + dashboard |

## Baseline — état avant refonte

À compléter lors de l'audit visuel initial.

- [ ] Captures `/c/[slug]` desktop + mobile
- [ ] Captures `/m/[slug]` desktop + mobile
- [ ] Captures `dashboard/circles/[slug]` desktop + mobile
- [ ] Captures `dashboard/circles/[slug]/moments/[momentSlug]` desktop + mobile

## Journal d'itérations

> Chaque ligne : date, surface ciblée, description, décision de propagation, commit.

### 2026-04-19

- Création du worktree `feat/ui-refonte-circle-moment` et du fichier de suivi.

## Décisions design prises

> À compléter au fil des itérations.

## Questions ouvertes

> À compléter au fil des itérations.

## Reste à faire

- [ ] Audit visuel baseline (4 surfaces × 2 breakpoints)
- [ ] Création Draft PR pour activer les previews Vercel
- [ ] Première itération sur une surface (à définir avec l'utilisateur)
