# Inscription automatique des organisateurs aux événements

> Corrige le blocage de la feature co-hosts : un organisateur (HOST/CO_HOST) qui n'a pas créé l'événement ne pouvait pas s'inscrire comme participant. **Approche retenue : inscription automatique de tous les organisateurs**, plutôt que de découpler rôle et présence côté UI.

## Problème

Dans une Communauté à plusieurs organisateurs (A et B) :

1. A crée un événement → seul A est automatiquement inscrit (`create-moment.ts:116-121`).
2. B (CO_HOST) ouvre la page de l'événement → détecté comme organisateur (`m/[slug]/page.tsx:145`) → voit « Gérer », **aucun moyen de s'inscrire** (`moment-detail-view.tsx:400`).
3. B est bloqué.

## Décision : étendre l'auto-inscription à tous les organisateurs

Plutôt que d'ajouter un parcours d'inscription/désinscription pour les organisateurs (avec distinction créateur/co-host, 3 états de CTA, bloc « Ta participation », modification de la règle D16), on **généralise le comportement déjà appliqué au créateur** : **tout organisateur actif (HOST + CO_HOST) est automatiquement inscrit `REGISTERED` à chaque événement de son Circle.**

Conséquences voulues :

- Le co-host n'a jamais besoin de s'inscrire : il l'est déjà.
- **Comme aujourd'hui, un organisateur ne peut pas se désinscrire** de son propre événement. La règle D16 (`cancel-registration.ts:48-58`, `OrganizerCannotCancelRegistrationError`) est **préservée telle quelle**.
- **Zéro changement UI** : le co-host continue de voir « Gérer », et apparaît désormais dans la liste des inscrits. Pas de modification de `moment-detail-view.tsx`, `registration-button.tsx`, `join-moment.ts`, `cancel-registration.ts`, ni des messages i18n.

> **Justification (à consigner dans `spec/decisions.md`)** : choix de simplification radicale motivé par le très faible volume de co-hosting actuel. Alternative écartée : découplage rôle/présence avec parcours d'inscription dédié pour les organisateurs (cf. historique de cette spec) — beaucoup plus de surface (domaine + UI + tests) pour un besoin marginal.

## Comportement cible

L'auto-inscription des organisateurs se déclenche à **trois moments** :

### 1. Création d'un événement — `create-moment.ts`

À la création, inscrire **tous les organisateurs actifs** du Circle (pas seulement le créateur).

- Remplacer l'inscription unique de `input.userId` (lignes 116-121) par une boucle sur `circleRepository.findOrganizers(input.circleId)` → une `Registration` `REGISTERED` par organisateur.
- `findOrganizers` inclut le créateur : la ligne dédiée à `input.userId` disparaît.
- Insertion directe via `registrationRepository.create` → **aucun email** (comme aujourd'hui pour le créateur, cf. `email-transactional.md:366`).

### 2. Promotion en co-host — `promote-to-co-host.ts` (cas rare)

Quand un membre est promu CO_HOST, l'inscrire à **tous les événements à venir** du Circle.

- Après `updateMembershipRole(..., "CO_HOST")` (ligne 70-73) :
  - Charger les événements du Circle (`momentRepository.findByCircleId(circleId)`), filtrer **à venir et non annulés** : `startsAt > now` ET `status ∈ {DRAFT, PUBLISHED}`.
  - Pour chacun, **idempotence** : si le membre a déjà une `Registration` active (`findByMomentAndUser`), ne rien faire ; si elle est `CANCELLED`/`REJECTED`, la réactiver (`update` → `REGISTERED`) ; sinon `create` `REGISTERED`.
- Insertion directe → **aucun email** (on ne passe pas par `joinMoment`). La notif existante au membre promu (`emailStrings.promotedBy`) est inchangée.
- **Deps à ajouter** au usecase : `momentRepository`, `registrationRepository` (actuellement : `circleRepository`, `userRepository`, `emailService`).

### 3. Backfill des événements existants — script direct en base

Répare les événements **déjà créés** (le cas réel « Club du Mont Saint Léger ») : l'auto-inscription à la création ne s'applique pas rétroactivement.

- Script `scripts/backfill-organizer-registrations.ts` : pour chaque événement **à venir** (`startsAt > now`, `status ∈ {DRAFT, PUBLISHED}`), inscrire en `REGISTERED` les organisateurs actifs (`role ∈ {HOST, CO_HOST}`, `status = ACTIVE`) qui n'ont pas déjà une `Registration` active sur ce Moment.
- **Direct via Prisma**, sans passer par les usecases / actions → **aucune notification ne part vers les hosts** (contrainte explicite).
- Idempotent (skip si déjà inscrit). Dry-run par défaut + `--execute`, variante prod, entrées `pnpm db:backfill-organizer-registrations[:prod]` (convention des scripts existants).
- **Capacité** : aucun risque de dépassement aujourd'hui (le cas capacité < nb organisateurs n'existe pas en prod). Les organisateurs sont inscrits `REGISTERED` sans contrôle de capacité, cohérent avec l'auto-inscription du créateur.

## Limite connue

- **Co-host promu après création** : couvert par le point 2 (inscription aux événements à venir lors de la promotion). Reste non couvert le cas marginal d'un événement créé **entre** deux promotions pour un membre pas encore co-host à ce moment-là — accepté (volume négligeable).

## Impact fichiers

| Fichier | Changement |
| --- | --- |
| `src/domain/usecases/create-moment.ts` | Boucle sur `findOrganizers` au lieu d'une inscription unique |
| `src/domain/usecases/promote-to-co-host.ts` | Inscrire le promu aux événements à venir ; ajout des deps `momentRepository` + `registrationRepository` |
| `src/app/actions/circle.ts` | `promoteToCoHostAction` : injecter `prismaMomentRepository` (à importer) + `prismaRegistrationRepository` (déjà importé ligne 29) dans `promoteToCoHost` |
| `scripts/backfill-organizer-registrations.ts` (+ `*-prod.sh`, entrées `package.json`) | Backfill direct en base des événements existants à venir |
| `src/domain/usecases/__tests__/create-moment.test.ts` | « inscrit tous les organisateurs » (au lieu du seul Host) |
| `src/domain/usecases/__tests__/promote-to-co-host.test.ts` | « inscrit le promu aux événements à venir », idempotence ; mocks des 2 nouvelles deps ajoutés même aux cas existants |

> **Note perf** : la promotion et le backfill chargent les moments via `findByCircleId` (tous les moments du Circle) puis filtrent en JS (`startsAt > now`, `status ∈ {DRAFT, PUBLISHED}`). Chemins rares/ponctuels → pas de méthode repository dédiée, compromis assumé.

**Aucun changement** : UI (`moment-detail-view.tsx`, `registration-button.tsx`), `join-moment.ts`, `cancel-registration.ts` (D16 préservée), `m/[slug]/page.tsx`, i18n, schema Prisma.

## Tests

| Niveau | Cas à couvrir |
| --- | --- |
| `create-moment` | Communauté à plusieurs organisateurs → tous inscrits `REGISTERED` ; communauté à un seul organisateur → comportement identique à aujourd'hui |
| `promote-to-co-host` | Le promu est inscrit à tous les événements à venir (`DRAFT` + `PUBLISHED` futurs) ; pas aux événements passés/annulés ; idempotence (déjà inscrit → pas de doublon) ; réactivation d'une registration `CANCELLED` |
| Sécurité | Inchangé (la promotion reste réservée au HOST principal, D3) |

## Décision structurante à consigner

Ligne dans `spec/decisions.md` : **tout organisateur actif (HOST + CO_HOST) est automatiquement inscrit `REGISTERED` à chaque événement de son Circle** — à la création (tous les organisateurs), à la promotion en co-host (événements à venir), et par backfill pour l'existant. Ils ne peuvent pas se désinscrire (D16 préservée). Alternative écartée : découplage rôle/présence avec parcours d'inscription dédié. Motivation : faible volume de co-hosting.

## Étapes

1. **Validation de cette spec** (en cours).
2. **Implémentation** sur branche dédiée (domaine + script backfill + tests). Pas de mockup nécessaire (zéro changement visuel).
