# Cycle de vie d'un événement — actions contextuelles (Annuler / Supprimer / Publier)

> **Statut** : spec cadrée, non implémentée. Une seule PR.
> **Origine** : incident Cloud Pi Native (24/06/2026) — un organisateur a **supprimé** un événement (hard delete, cascade) au lieu de l'**annuler**, parce que l'annulation était cachée et que la suppression était l'action mise en avant.

---

## 1. Problème

Trois défauts UX se cumulent aujourd'hui et poussent activement l'organisateur à supprimer plutôt qu'annuler :

1. **L'action douce est cachée, l'action destructive est en avant.** Annuler n'existe que comme valeur d'un `<select>` de statut enfoui dans le formulaire d'édition (`moment-form.tsx:286-309`), tandis que « Supprimer » est un bouton direct à côté de « Modifier » (`moment-detail-view.tsx:390-402`).
2. **C'est la suppression qui prévient les inscrits, pas l'annulation.** `deleteMomentAction` envoie l'email « Cet événement a été annulé » (`moment.ts:493`), alors que le passage en CANCELLED via le menu (`updateMomentAction`) est **muet** : ni email, ni remboursement (vérifié, `moment.ts:183-363`). L'orga qui veut prévenir tout le monde est mécaniquement guidé vers Supprimer.
3. **L'état annulé est quasi invisible** côté dashboard (un badge discret dans le fil d'ariane + un bloc dans la colonne gauche), là où l'état Passé a déjà un bandeau + une cover désaturée.

## 2. Objectif

Faire des transitions de statut des **actions de premier ordre** (boutons explicites), comme l'est déjà « Publier » pour un brouillon. L'annulation devient visible et prévient/rembourse les inscrits ; la suppression destructive est reléguée là où il n'y a rien à perdre. L'état annulé devient lisible.

---

## 3. Décisions tranchées (et alternatives écartées)

| # | Décision | Pourquoi / alternative écartée |
|---|---|---|
| D1 | **Le `<select>` de statut disparaît du formulaire.** Les transitions passent par des **boutons d'action contextuels**. | Le menu était la cause racine (action cachée). Le projet a déjà ce modèle (bouton « Publier »). Alternative écartée : router le menu vers une action dédiée → dangereux car le menu est dans le form global, on perdrait les autres champs édités. |
| D2 | **L'email d'annulation et le remboursement partent au passage en CANCELLED** (via un usecase/action dédié `cancelMoment`), plus à la suppression. | C'est le correctif central. La suppression ne doit plus être le seul moyen de prévenir. |
| D3 | **« Republier » (CANCELLED → PUBLISHED) est retiré** de cette PR. Reprogrammer = créer un nouvel événement. | Republier proprement est un chantier à part : inscrits remboursés à l'annulation (non re-débitables via Stripe), date souvent à refaire, statut PAST géré par cron (latence 5 min). Trop de cas tordus pour le bénéfice. |
| D4 | **Suppression interdite sur un événement passé** (PAST). | Le passé est l'historique de la Communauté (page Circle « événements passés »). Le détruire va contre le positionnement community-centric. |
| D5 | **Le soft delete (`deletedAt`) est reporté.** On garde le hard delete actuel. « Supprimer » reste irréversible, confirmations fortes maintenues. | Jugé trop risqué pour être embarqué ici (touche le schema + toutes les requêtes + sémantique). Mérite son propre chantier. Conséquence : aucun changement de schema Prisma dans cette PR. |
| D6 | **Filet de sécurité conservé** : le `delete` d'un PUBLISHED notifie encore les inscrits. | Avec les boutons, le `delete` n'arrive plus que sur Brouillon/Annulé via l'UI. Le filet protège les chemins hors-UI (admin/API). Coût quasi nul. |

> **À consigner** dans `spec/decisions.md` + ADR (D1, D3, D4, D5 sont structurantes).

---

## 4. Machine à états cible

### Vue organisateur (page de gestion d'un événement)

| État | Colonne gauche (sous la cover) | Bandeau haut de page | Cover |
|---|---|---|---|
| **DRAFT** | **Publier** (rose, principal) · **Modifier** (outline) | Info « pas encore visible » + **Supprimer** (lien ghost destructif discret) | — |
| **PUBLISHED** | **Modifier** (rose, principal) · **Annuler l'événement** (outline neutre, même ligne) | — | — |
| **CANCELLED** | **Supprimer** (outline destructif, `w-full`) | **« Cet événement a été annulé »** (texte seul) | badge « Annulé » + grayscale |
| **PAST** | **Modifier** (outline) | « A eu lieu le … · X participants » (existant, **sans** Supprimer) | grayscale (existant) |

Règles :
- **Un seul bouton `default` (rose) par état** au maximum (design system). PUBLISHED et DRAFT ont un principal rose ; CANCELLED et PAST n'en ont pas (états terminaux).
- **Placement de « Supprimer » = importance.** Sur CANCELLED, supprimer est la **seule action restante** (ni republier, ni modifier) → bouton **outline destructif dans la colonne** (`w-full`). Sur DRAFT, supprimer est **secondaire** (l'action attendue est Publier) → **lien ghost discret dans le bandeau**. Jamais sur PUBLISHED (annuler d'abord) ni PAST (archive).
- **Pas de « Modifier » sur CANCELLED** : un annulé **n'a pas eu lieu**, rien à enrichir. PAST le garde (enrichir l'archive d'un événement qui **a eu lieu** : photos, compte-rendu).
- **« Annuler » n'est jamais caché** (leçon de l'incident) : bouton visible, pas un lien enfoui. Style **outline neutre**, pas le rouge destructif (annuler n'est pas une suppression, et reste sémantiquement « doux » côté orga).

### Vue membre (page publique `/m/[slug]`)

| État | Affichage |
|---|---|
| DRAFT | Non partagé ; en accès direct, bloc « en préparation » (existant, `:410-414`). Inchangé. |
| PUBLISHED | S'inscrire + « Ajouter au calendrier ». Inchangé. |
| CANCELLED | **Double signal volontaire** : bandeau « événement annulé » en haut **+** bloc colonne gauche existant (`:432-442`, « Événement annulé » + lien vers la Communauté) **+** badge « Annulé » + grayscale sur la cover. Commentaires en lecture seule (existant, PR #589). |
| PAST | Bloc « terminé · X participants » + lien Communauté (existant, `:415-431`). Inchangé. |

> Le **bouton Supprimer du bandeau annulé est host-only** ; le **texte du bandeau et le badge cover sont visibles par tous**.

---

## 5. Spécification UI

### 5.1 Formulaire d'édition — `moment-form.tsx`
- **Retirer** le bloc `<Select name="status">` (lignes 286-309) entièrement.
- Le formulaire ne pilote plus le statut. Les transitions sont des actions hors-form.
- Vérifier qu'aucun autre code ne lit `formData.get("status")` côté `updateMomentAction` après suppression (cf. §6.3).

### 5.2 Colonne gauche (boutons) — `moment-detail-view.tsx` (bloc `isHostView`, ~390-402)
Remplacer le bloc actuel `[Modifier | DeleteMomentDialog]` par un rendu **conditionné au statut** :

- **DRAFT** : `[PublishMomentButton (principal) | Modifier (outline)]`.
  Le `PublishMomentButton` est **remonté** ici depuis le bandeau DRAFT (voir 5.4). Il devient le CTA principal (rose, fullwidth dans la ligne).
- **PUBLISHED** : `[Modifier (rose, principal) | CancelMomentDialog (outline neutre)]` sur la même ligne (`flex gap-2`, `flex-1` chacun).
- **CANCELLED** : `[DeleteMomentDialog]` seul (trigger standard outline destructif, `w-full`). **Pas de Modifier** (événement terminal, n'a pas eu lieu → rien à enrichir).
- **PAST** : `[Modifier (outline)]` seul (enrichir l'archive).

> « Modifier » reste un `<Link>` vers `…/moments/[slug]/edit`, présent sur DRAFT (outline), PUBLISHED (`default` rose) et PAST (outline). **Absent de CANCELLED.**

### 5.3 Bandeau « annulé » — nouveau (`moment-detail-view.tsx`, colonne droite)
Créer un bandeau haut de page pour CANCELLED, calqué sur le bandeau PAST (`:490-508`) :
- Texte : `Moment.public.cancelledBannerTitle` (+ description courte si utile).
- Style : bordure/fond façon PAST mais teinte destructive douce (cf. `breadcrumbStatusStyle.CANCELLED`).
- **Informatif uniquement** (pas de bouton). Le Supprimer est dans la colonne gauche, host-only (§5.2).
- **Visible côté membre aussi.**

### 5.4 Bandeau DRAFT — `moment-detail-view.tsx:474-488`
- **Retirer** le `PublishMomentButton` du bandeau (il monte en colonne gauche, anti-doublon).
- Le bandeau devient **purement informatif** + à droite le **Supprimer** ghost discret (même pattern que l'annulé).

### 5.5 Composant Supprimer — `delete-moment-dialog.tsx`
Deux usages selon le contexte :
- **CANCELLED (colonne gauche)** : trigger **standard existant** (`variant="outline" size="sm"` + classes destructive) en `w-full`. Aucune modif du composant nécessaire.
- **DRAFT (bandeau)** : rendu discret. Ajouter une prop `discreet?: boolean` → trigger `variant="ghost" size="sm"` + `text-destructive` sobre, sans bordure.

Le reste du dialogue (AlertDialog, confirmation `Moment.delete.*`) **inchangé** : confirmation forte, irréversible (hard delete maintenu, D5).

### 5.6 Bouton « Annuler l'événement » — nouveau composant `cancel-moment-dialog.tsx`
Calqué sur `delete-moment-dialog.tsx`, mais **non destructif** visuellement :
- Trigger : `Button variant="outline" size="sm"` neutre, label `Moment.actions.cancel` (« Annuler l'événement »).
- AlertDialog de confirmation : `Moment.cancel.title` / `Moment.cancel.description` (explique : inscrits prévenus par email, remboursés si applicable, l'événement reste visible avec le statut Annulé) / `Moment.cancel.confirm`.
- `AlertDialogAction` : style **neutre** (pas `bg-destructive`), appelle `cancelMomentAction(momentId)`.
- Après succès : `router.refresh()` (l'événement reste sur la même page, passe en affichage annulé).
- Props : `{ momentId: string }` (+ `triggerClassName?` pour le `flex-1`).

### 5.7 Cover — `MomentCoverBlock` (`moment-detail-view.tsx:121-170`)
- **Grayscale** : étendre la condition `status === "PAST"` (ligne 129) à `status === "PAST" || status === "CANCELLED"`.
- **Badge « Annulé »** : ajouter un overlay (coin haut-gauche, à côté du badge démo) quand `status === "CANCELLED"`, label `Moment.status.cancelled`. Style : pastille destructive douce, lisible sur la cover désaturée.
- Visible **orga et membre** (le composant est partagé).

---

## 6. Spécification backend

### 6.1 Nouveau usecase `cancelMoment` — `src/domain/usecases/cancel-moment.ts`
Calqué sur `publish-moment.ts`. Signature :
```ts
cancelMoment(
  input: { momentId: string; userId: string },
  deps: { momentRepository; circleRepository; registrationRepository; paymentService }
): Promise<{ moment: Moment }>
```
Logique :
1. `findById` → `MomentNotFoundError` si absent.
2. `findMembership` + `isActiveOrganizer` → `UnauthorizedMomentActionError` sinon.
3. **Garde-fou de transition** : `if (existing.status !== "PUBLISHED") throw new MomentCannotBeCancelledError(momentId, existing.status)`. (On n'annule qu'un publié : DRAFT → supprimer ; PAST → archive ; CANCELLED → déjà annulé.)
4. **Remboursement** des inscrits payants, réutilise le bloc de `delete-moment.ts:46-64` (`findActiveByMomentId` → filtre `PAID` + `stripePaymentIntentId` → `refundRegistration({ force: true })`).
5. **Rejet des PENDING_APPROVAL** : `registrationRepository.rejectAllPendingApprovals(momentId)` (logique déplacée depuis `update-moment.ts:147-149`).
6. `momentRepository.update(momentId, { status: "CANCELLED" })`.

### 6.2 Nouvelle action `cancelMomentAction` — `src/app/actions/moment.ts`
Calquée sur `publishMomentAction` (`:549`). Logique :
1. `auth` ; `resolveCircleRepository`.
2. **Avant** la bascule : `registrationsToNotify = findActiveWithUserByMomentId(momentId)`.
3. `cancelMoment({ momentId, userId }, { … paymentService })`.
4. Envoi de l'email d'annulation : réutiliser `sendMomentCancelledEmails(moment, registrationsToNotify, resolver)` (la fonction existe déjà, `:507-547`). Fire-and-forget + Sentry, comme l'existant.
5. `revalidatePath` `/m/[slug]` (+ `/en`) + `dashboard/circles/[circleId]` ; `invalidateDashboardCache(userId)`.

### 6.3 `updateMoment` / `updateMomentAction` — nettoyage
- **`updateMoment`** (`update-moment.ts`) : retirer le champ `status?` de `UpdateMomentInput` et la logique D13 (`:146-149`, déplacée dans `cancelMoment`). Les transitions de statut ne passent plus par l'update. (Call sites : seul le form, qui ne soumet plus `status` — sûr.)
- **`updateMomentAction`** (`moment.ts:203,254`) : retirer la lecture de `formData.get("status")` et son passage à `updateMoment`.

### 6.4 `deleteMoment` / `deleteMomentAction`
- **`deleteMoment`** (`delete-moment.ts`) : ajouter une garde `if (existing.status === "PAST") throw new MomentCannotBeDeletedError(momentId)` (D4). Le remboursement existant reste pour DRAFT/PUBLISHED/CANCELLED.
- **`deleteMomentAction`** (`moment.ts:486-496`) : restreindre la notif au filet → n'envoyer `sendMomentCancelledEmails` que si `momentToDelete.status === "PUBLISHED"` (D6). CANCELLED (déjà notifié), DRAFT, PAST → pas de notif.
- **Admin** (`adminDeleteMoment`, `admin-delete-moment.ts`) : **inchangé** (chemin de modération distinct, pas concerné par la garde PAST host — à confirmer si on veut aussi le protéger).

### 6.5 Erreurs domaine — `src/domain/errors/moment-errors.ts`
Ajouter (pattern `DomainError` existant) + exports dans `errors/index.ts` :
- `MomentCannotBeCancelledError(momentId, currentStatus)` — code `MOMENT_CANNOT_BE_CANCELLED`.
- `MomentCannotBeDeletedError(momentId)` — code `MOMENT_CANNOT_BE_DELETED`.

Mapper ces erreurs dans `toActionResult` si un code utilisateur lisible est attendu (vérifier le mapping existant des erreurs moment).

---

## 7. i18n (`messages/fr.json` + `messages/en.json`)

Clés **existantes réutilisées** : `Moment.status.*`, `Moment.actions.publish/publishing`, `Moment.delete.*`, `Common.edit`, `Moment.public.eventCancelled`, `Moment.comments.closed`.

Clés **à ajouter** (FR / EN) :

| Clé | FR | EN |
|---|---|---|
| `Moment.actions.cancel` | Annuler l'événement | Cancel event |
| `Moment.actions.cancelling` | Annulation… | Cancelling… |
| `Moment.cancel.title` | Annuler cet événement | Cancel this event |
| `Moment.cancel.description` | Cet événement sera marqué comme annulé. Les inscrits seront prévenus par email et remboursés automatiquement si l'événement était payant. Il restera visible dans ta Communauté avec le statut « Annulé ». | This event will be marked as cancelled. Registered members will be notified by email and automatically refunded if the event was paid. It will remain visible in your Community with a "Cancelled" status. |
| `Moment.cancel.confirm` | Oui, annuler cet événement | Yes, cancel this event |
| `Moment.public.cancelledBannerTitle` | Cet événement a été annulé | This event has been cancelled |

> Pas de clé « republish » (D3). Pas de nouveau template email (l'email d'annulation `momentCancelled.*` existe déjà). Badge cover = `Moment.status.cancelled` (existant).
> **Synchroniser fr.json ET en.json** (règle i18n-guardian).

---

## 8. Tests

- **`cancel-moment.test.ts`** (nouveau) :
  - given PUBLISHED → passe CANCELLED, `refundRegistration` appelé pour les PAID, `rejectAllPendingApprovals` appelé, `update({status:"CANCELLED"})`.
  - given non-organisateur → `UnauthorizedMomentActionError`, pas de mutation.
  - given DRAFT / CANCELLED / PAST → `MomentCannotBeCancelledError`.
  - given moment inexistant → `MomentNotFoundError`.
- **`delete-moment.test.ts`** (étendre) : given PAST → `MomentCannotBeDeletedError`, `delete` non appelé, refund non appelé.
- **`update-moment.test.ts`** (adapter) : retirer les cas liés à `status`/D13 (déplacés). Vérifier que l'update ne touche plus au statut.
- **E2E** : aucun test E2E ne couvre delete/cancel aujourd'hui. Optionnel : un scénario « organisateur annule un événement publié → bandeau annulé visible, inscrits notifiés (mock) ». À cadrer hors périmètre strict si trop lourd.

---

## 9. Points de vigilance / régressions

- **Cron PAST (5 min de latence)** : un événement peut être `PUBLISHED` jusqu'à 5 min après sa fin (statut stocké, transitionné par cron). La garde d'annulation `status === "PUBLISHED"` autorise donc l'annulation d'un événement « techniquement passé mais encore PUBLISHED ». Acceptable (rare, sans danger). Pas de blocage à ajouter.
- **CANCELLED déjà exclu** de l'Explorer / upcoming / reminders (repository) — aucune action nécessaire côté découverte.
- **Double refund** : annuler (refund) puis supprimer le CANCELLED re-tenterait un refund. Sûr car `refundRegistration` filtre `paymentStatus === "PAID"` (devient `REFUNDED` après coup). **À confirmer** : `refundRegistration` met bien à jour `paymentStatus`.
- **Chemin admin** (`adminCancelMomentAction` → `adminUpdateMomentStatus`) : passe par le repo directement, sans notif ni refund. **Inchangé** (modération silencieuse, volontaire). À ne pas confondre avec le flux organisateur.
- **Page publique CANCELLED** : déjà servie en accès direct (PR #589). On ajoute juste bandeau + badge. `generateMetadata` `noindex` inchangé.
- **Mobile** : le « Supprimer » dans les bandeaux remontera visuellement sur mobile (les bandeaux sont en haut). Action rare et reléguée volontairement — pas de modification du comportement mobile au-delà de ça.

---

## 10. Plan d'implémentation (ordre)

1. **Domaine** : erreurs (`MomentCannotBeCancelledError`, `MomentCannotBeDeletedError`) ; usecase `cancelMoment` ; garde PAST dans `deleteMoment` ; nettoyage `updateMoment` (retrait `status` + D13).
2. **Tests domaine** : `cancel-moment.test.ts`, extension `delete-moment.test.ts`, adaptation `update-moment.test.ts`.
3. **Actions** : `cancelMomentAction` ; restriction du filet dans `deleteMomentAction` ; retrait de `status` dans `updateMomentAction`.
4. **i18n** : ajout des clés FR/EN.
5. **Composants** : `cancel-moment-dialog.tsx` (nouveau) ; prop discrète sur `delete-moment-dialog.tsx` ; déplacement `PublishMomentButton` ; bandeau annulé + badge/grayscale cover dans `moment-detail-view.tsx` ; retrait du `<select>` dans `moment-form.tsx`.
6. **Décisions** : `spec/decisions.md` + ADR (D1, D3, D4, D5).
7. `pnpm typecheck` + tests + `/code-review` avant PR.

> **Pas de changement de schema Prisma** → pas de `db:push`.

---

## 11. Hors périmètre (reportés)

- **Soft delete** (`deletedAt`) — chantier dédié (D5).
- **Republier** un événement annulé (D3) — reprogrammer = nouvel événement.
- **Email de republication** — sans objet tant que D3 tient.
- **Visibilité de l'état annulé sur les vues de liste** (cartes dashboard) — le badge cover aide, mais un audit complet des listes est hors scope ici.
