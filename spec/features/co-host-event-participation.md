# Participation des organisateurs aux événements — découplage rôle / présence

> **Statut : en vigueur depuis 2026-07-20.** Cette version **remplace** l'approche « inscription automatique de tous les organisateurs » (2026-06-18), abandonnée. Voir le revirement dans `spec/decisions.md`.

## Principe

Le **rôle** d'organisateur (HOST / CO_HOST, porté par la `CircleMembership`) et la **présence** à un événement (une `Registration`) sont deux choses distinctes :

- Le rôle donne l'**accès de gestion** (« Gérer » sur la page événement, dashboard, édition). Il dérive de la membership, pas d'une inscription.
- La présence est une **participation volontaire**, comme pour n'importe quel Participant.

Forcer une `Registration` pour tous les organisateurs mélangeait les deux : ça gonflait le compteur de places, le social proof et les rappels emails d'organisateurs qui ne venaient pas, sans possibilité de sortie. On découple.

## Règles

### 1. Création d'un événement — `create-moment.ts`

Seul le **créateur** (`input.userId`) est auto-inscrit `REGISTERED`. On confirme via `findOrganizers` qu'il est un vrai membre organisateur : un admin en host mode (membership synthétique, non persistée) n'y figure pas et n'est donc pas inscrit (pas de `Registration` fantôme). Insertion directe → aucun email.

### 2. Promotion en co-host — `promote-to-co-host.ts`

**Aucune** auto-inscription. La promotion ne touche plus aux inscriptions : elle change le rôle, la présence reste volontaire. Les deps `momentRepository` / `registrationRepository` sont retirées du usecase.

### 3. Inscription volontaire d'un organisateur — `register-organizer.ts` (nouveau)

Un organisateur (HOST / CO_HOST) actif et **membre réel** du Circle peut s'inscrire à un événement de son Circle depuis la page événement :

- `REGISTERED` direct, **sans paiement** (un organisateur ne paie pas sa propre billetterie), **sans contrôle de capacité ni liste d'attente** (il n'attend jamais une place sur son propre événement), **sans validation** (pas de `PENDING_APPROVAL`).
- **Idempotent** : déjà `REGISTERED` / `CHECKED_IN` → no-op ; tout autre statut existant (`CANCELLED`, `REJECTED`, `WAITLISTED`, `PENDING_APPROVAL`) est forcé à `REGISTERED`.
- Contrôle d'appartenance via `findOrganizers` (membres persistés) → l'admin en host mode ne peut pas s'inscrire (cohérent avec le point 1).
- Rejette un événement `PAST` / `CANCELLED` (`MomentNotOpenForRegistrationError`).
- Server action `registerAsOrganizerAction` : **silencieuse** (aucun email, ni confirmation ni notification aux autres organisateurs — anti-avalanche, symétrique du créateur).

### 4. Désinscription d'un organisateur — `cancel-registration.ts`

La règle D16 (`OrganizerCannotCancelRegistrationError`) est **supprimée** : tout participant, organisateur compris, peut annuler sa propre inscription. Se désinscrire d'un événement ne retire ni le rôle ni l'accès de gestion (qui dérivent de la membership). L'erreur et sa clé i18n sont supprimées. Le usecase ne dépend plus de `circleRepository`.

## UI — page événement (`moment-detail-view.tsx`)

Pour un organisateur (variant `public`), le bloc CTA affiche :

- **« Gérer »** — action principale (bouton `default` / primary), inchangée.
- **« Votre participation »** — bloc secondaire, **réservé aux organisateurs membres** (`isMemberOrganizer`, pas l'admin host mode) et aux événements `PUBLISHED` / `DRAFT` :
  - non inscrit → bouton `outline` « S'inscrire » + phrase d'aide ;
  - inscrit → pill « Inscrit » + lien discret « Annuler mon inscription » (confirmation).

Composant : `organizer-participation-control.tsx`. La page distingue `isMemberOrganizer` (membre réel) de `isOrganizer` (inclut l'admin host mode). Respecte la règle « un seul bouton primary par section » : « Gérer » reste primary, la participation est secondaire.

## Existant (pas de backfill destructif)

Les événements déjà créés ont des organisateurs inscrits de force (auto-inscription + backfill de la version 2026-06-18). On **ne les désinscrit pas** automatiquement : impossible de distinguer un organisateur « forcé qui ne viendra pas » d'un organisateur qui veut réellement venir. Avec D16 levée, chacun peut désormais se retirer lui-même. Les nouveaux événements ont d'emblée le bon comportement.

## Impact fichiers

| Fichier | Changement |
| --- | --- |
| `src/domain/usecases/register-organizer.ts` | **Nouveau** usecase d'inscription volontaire d'un organisateur |
| `src/domain/usecases/create-moment.ts` | Inscrit uniquement le créateur (vérifié via `findOrganizers`) |
| `src/domain/usecases/promote-to-co-host.ts` | Retrait de l'auto-inscription + des deps `momentRepository` / `registrationRepository` |
| `src/domain/usecases/cancel-registration.ts` | Suppression de la garde D16 + de la dep `circleRepository` |
| `src/domain/errors/registration-errors.ts` (+ `index.ts`) | Suppression de `OrganizerCannotCancelRegistrationError` |
| `src/app/actions/registration.ts` | Nouvelle `registerAsOrganizerAction` (silencieuse) ; `cancelRegistrationAction` sans `circleRepository` |
| `src/app/actions/circle.ts` | `promoteToCoHostAction` sans `momentRepository` / `registrationRepository` |
| `src/components/moments/organizer-participation-control.tsx` | **Nouveau** contrôle de participation |
| `src/components/moments/moment-detail-view.tsx` | Organisateur : « Gérer » + bloc participation (plus exclusif) ; nouveau prop `isMemberOrganizer` |
| `src/components/moments/registration-button.tsx` | Retrait du prop vestigial `isOrganizer` |
| `src/app/[locale]/(routes)/m/[slug]/page.tsx` | Calcul + passage de `isMemberOrganizer` |
| `messages/{fr,en}.json` | Namespace `Moment.organizerParticipation` |

## Tests

| Niveau | Cas |
| --- | --- |
| `register-organizer` | crée `REGISTERED` ; bypass capacité ; idempotent (`REGISTERED`/`CHECKED_IN`) ; réactive un statut non confirmé ; rejette non-membre (`UnauthorizedMomentActionError`) ; `MomentNotFound` ; `PAST`/`CANCELLED` → `MomentNotOpenForRegistrationError` |
| `create-moment` | seul le créateur inscrit ; créateur non-membre (admin host mode) → aucune inscription |
| `promote-to-co-host` | plus aucune auto-inscription (aucune dep moment/registration) |
| `cancel-registration` | un organisateur (HOST / CO_HOST) peut annuler sa propre inscription |
| Sécurité | matrice `remove-registration-by-host` inchangée (retrait croisé entre organisateurs) |
