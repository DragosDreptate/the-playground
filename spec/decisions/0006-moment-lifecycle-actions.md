# ADR-0006 — Actions de cycle de vie d'un événement (Annuler / Supprimer / Publier)

- **Date** : 2026-06-24
- **Statut** : Accepté
- **Références** : `spec/features/moment-lifecycle-actions.md`, incident Cloud Pi Native, PR (cancel-moment-action)

## Contexte

Un organisateur a **supprimé** un événement (hard delete, cascade sur commentaires / inscriptions / pièces jointes) là où il voulait l'**annuler**. Trois défauts UX se cumulaient et poussaient activement vers la destruction :

1. **L'action douce était cachée, l'action destructive en avant.** Annuler n'existait que comme valeur d'un `<select>` de statut enfoui dans le formulaire d'édition ; « Supprimer » était un bouton direct à côté de « Modifier ».
2. **C'est la suppression qui prévenait les inscrits, pas l'annulation.** `deleteMomentAction` envoyait l'email « événement annulé » ; le passage en CANCELLED via le menu était muet (ni email, ni remboursement). L'organisateur qui voulait prévenir tout le monde était mécaniquement guidé vers Supprimer.
3. **L'état annulé était quasi invisible** côté dashboard.

Le projet avait déjà commencé à transformer une transition de statut en bouton d'action explicite (« Publier » pour un brouillon) : il fallait généraliser ce modèle et refermer l'incitation perverse.

## Décision

**Les transitions de statut deviennent des boutons d'action contextuels au statut ; le `<select>` de statut du formulaire disparaît.**

- **Brouillon** : `Publier` (principal) · `Modifier`. Supprimer en lien discret dans le bandeau.
- **Publié** : `Modifier` (principal) · `Annuler l'événement`. Pas de Supprimer.
- **Annulé** : `Supprimer` (seule action, dans la colonne). Bandeau « annulé » informatif + badge/grayscale sur la cover.
- **Passé** : `Modifier`. Pas de Supprimer.

**L'annulation est portée par un usecase/action dédié `cancelMoment`.** Le **usecase** ne fait que les mutations DB fiables et idempotentes : bascule en CANCELLED + rejet des inscriptions en attente d'approbation. Les **effets externes faillibles** (remboursements Stripe, email d'annulation) sont orchestrés en **best-effort par l'action**, APRÈS la transition et HORS de la garde de statut, chacun dans un `after()` avec capture Sentry. Rationale : si le refund était fait dans le usecase avant/pendant la transition, un échec Stripe partiel ferait throw l'action ; le retry serait alors bloqué par la garde `status !== PUBLISHED` (l'événement est déjà CANCELLED) et les remboursements restants seraient perdus. En sortant le refund de la garde, l'annulation réussit toujours, un échec est tracé dans Sentry et **rattrapable** (le remboursement est idempotent et rejoué par la suppression de l'événement annulé). La suppression (`delete`) ne notifie plus du tout : elle n'est exposée que sur DRAFT (aucun inscrit) et CANCELLED (déjà notifié à l'annulation), un PUBLISHED ne se supprimant jamais.

**« Republier » est retiré** de ce périmètre : reprogrammer = créer un nouvel événement.

**La suppression est interdite sur un événement passé** (flux organisateur). L'admin conserve son droit de tout supprimer (modération).

**Le soft delete est reporté** : on conserve le hard delete actuel, « Supprimer » reste irréversible avec confirmation forte. Aucun changement de schema Prisma.

## Alternatives écartées

- **Router le menu de statut vers un usecase d'annulation dédié** — dangereux : le menu vit dans le formulaire global, le routage aurait perdu silencieusement les autres champs édités (ex. renommage simultané). C'est ce qui a motivé la suppression pure du menu.
- **Garder « Republier » (CANCELLED → PUBLISHED)** — un bourbier : les inscrits payants sont remboursés à l'annulation et **non re-débitables** automatiquement via Stripe ; la date est souvent à refaire ; le statut PAST est géré par un cron toutes les 5 min (un annulé republié pourrait être déjà passé). Trop de cas tordus pour le bénéfice ; reprogrammer = nouvel événement, propre.
- **Soft delete (`deletedAt`) maintenant** — bon réflexe post-incident mais chantier à part entière : touche le schema, **toutes** les requêtes de listing (sinon un « supprimé » ressurgit dans l'Explorer / la page Circle / le sitemap), la sémantique des confirmations, et impose une purge RGPD différée. Reporté pour ne pas l'embarquer à la va-vite ici.
- **Statut `DELETED` (5e valeur d'enum)** plutôt que `deletedAt` — écarté avec le soft delete lui-même ; le jour venu, une colonne `deletedAt` orthogonale au statut sera préférée (préserve le statut d'origine, n'explose pas le code de statut, évite la fragilité des enums Postgres).
- **Garder « Modifier » sur un annulé** — un événement annulé n'a pas eu lieu, rien à enrichir ; Supprimer prend sa place. (Le Passé, lui, garde Modifier : on enrichit l'archive d'un événement qui a eu lieu.)

## Conséquences

- **Positives** : l'annulation est visible et prévient/rembourse les inscrits ; la destruction directe d'un publié n'est plus possible via l'UI ; l'état annulé est lisible (bandeau + badge). **Gain de sécurité** : retirer le champ `status` d'`updateMoment` ferme le bypass connu de `publishMoment` (transition de statut arbitraire, documenté dans `business-logic-guards.test.ts`).
- **Négatives / coûts** : pour supprimer un événement publié créé par erreur, l'organisateur doit l'annuler d'abord puis le supprimer (surcoût léger, cas rare). Pas de réactivation d'un annulé (assumé : reprogrammer = nouvel événement).
- **Risques mitigés** : double remboursement (annuler puis supprimer) → sans danger, `refundRegistration` est idempotent (`paymentStatus` → `REFUNDED`, re-filtré). Pollution des tests E2E / envois email → le test d'annulation crée un Moment dédié sans inscrits.
- **Ce que ça verrouille pour la suite** : les transitions de statut passent désormais **uniquement** par des usecases dédiés (`publishMoment`, `cancelMoment`), jamais par `updateMoment` ; tout nouveau besoin de transition suit ce modèle. Le soft delete et une éventuelle republication restent ouverts comme chantiers distincts.
