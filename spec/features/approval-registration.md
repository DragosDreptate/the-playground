# Spec — Validation des inscriptions par l'Organisateur

## Contexte et motivation

Certains Organisateurs souhaitent contrôler qui rejoint leur Communauté ou qui s'inscrit à leurs événements. La plateforme doit permettre d'activer un mode "validation requise" sur chaque entité de façon indépendante, sans friction pour les Participants qui n'en ont pas besoin.

**Principe directeur** : la validation est unitaire. Chaque entité (Communauté, événement) porte son propre flag. Aucun héritage automatique.

---

## Décisions de design

| # | Décision |
| --- | --- |
| D1 | `requiresApproval` est un flag indépendant sur Circle et sur Moment. Aucun héritage. |
| D2 | Cross-flow strict (Option A) : si un événement n'a pas de validation mais que sa Communauté en a une, l'auto-join crée une membership `PENDING`. L'Organisateur doit approuver séparément. |
| D3 | Les demandes `PENDING_APPROVAL` (Registration) et `PENDING` (CircleMembership) ne consomment pas de capacité. |
| D4 | Quand une Registration `PENDING_APPROVAL` est approuvée : si la capacité est pleine → passe directement en `WAITLISTED`. |
| D5 | Pas de message du Participant avec sa demande (pour l'instant). |
| D6 | Pas de motif de refus par l'Organisateur (pour l'instant). |
| D7 | Pas d'expiration des demandes. |
| D8 | Les 2 modes de join Circle (direct depuis la page publique, auto via inscription Moment) sont tous soumis au `requiresApproval` du Circle. |
| D9 | Une Registration `REJECTED` est finale : le Participant peut faire une nouvelle demande (la Registration REJECTED est ignorée à la prochaine tentative, ou réactivée). |
| D10 | Un membership Circle `PENDING` n'accorde aucun accès aux pages et contenus réservés aux membres. |
| D11 | Un Participant avec Registration `PENDING_APPROVAL` **ne peut pas** commenter l'événement, ni recevoir les broadcasts. |
| D12 | Un Participant avec CircleMembership `PENDING` **ne reçoit pas** les notifications de nouveaux événements du Circle (broadcast). |
| D13 | Si un événement est **annulé** (`CANCELLED`) ou devient **passé** (`PAST`), toutes les Registrations `PENDING_APPROVAL` sont auto-rejetées (`REJECTED`). |
| D14 | `leaveCircle` avec membership `PENDING` = annuler sa demande. Même comportement que quitter en tant que membre actif. |
| D15 | Le dashboard Participant affiche les demandes en attente (PENDING_APPROVAL) dans une section dédiée, distincte des inscriptions confirmées. |
| D16 | Re-inscription après `REJECTED` : même mécanisme que la re-inscription après `CANCELLED` — la Registration existante est réactivée en `PENDING_APPROVAL` (pas de nouvelle ligne). |

---

## Changements au schéma Prisma

### Nouveaux champs

```prisma
model Circle {
  // ... champs existants ...
  requiresApproval  Boolean  @default(false)  // NOUVEAU
}

model Moment {
  // ... champs existants ...
  requiresApproval  Boolean  @default(false)  // NOUVEAU
}
```

### Nouveaux enums et champs

```prisma
// NOUVEAU — statut de membership Circle
enum MembershipStatus {
  PENDING
  ACTIVE
}

model CircleMembership {
  // ... champs existants ...
  status    MembershipStatus  @default(ACTIVE)  // NOUVEAU
}

// MODIFIÉ — ajout de PENDING_APPROVAL et REJECTED
enum RegistrationStatus {
  PENDING_APPROVAL  // NOUVEAU
  REGISTERED
  WAITLISTED
  CANCELLED
  CHECKED_IN
  REJECTED          // NOUVEAU
}
```

### Index à ajouter

```prisma
// Sur CircleMembership — pour requêter les demandes en attente par Circle
@@index([circleId, status])

// Sur Registration — pour requêter les demandes en attente par Moment
// L'index existant @@index([momentId, status]) couvre déjà ce besoin
```

---

## Changements domaine

### 1. Models (`src/domain/models/`)

**`circle.ts`** — ajouter `MembershipStatus` et mettre à jour `CircleMembership` :

```typescript
export type MembershipStatus = "PENDING" | "ACTIVE";

export type CircleMembership = {
  id: string;
  userId: string;
  circleId: string;
  role: CircleMemberRole;
  status: MembershipStatus;  // NOUVEAU
  joinedAt: Date;
};

export type Circle = {
  // ... champs existants ...
  requiresApproval: boolean;  // NOUVEAU
};
```

**`moment.ts`** — ajouter `requiresApproval` :

```typescript
export type Moment = {
  // ... champs existants ...
  requiresApproval: boolean;  // NOUVEAU
};
```

**`registration.ts`** — mettre à jour `RegistrationStatus` :

```typescript
export type RegistrationStatus =
  | "PENDING_APPROVAL"  // NOUVEAU
  | "REGISTERED"
  | "WAITLISTED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "REJECTED";          // NOUVEAU
```

### 2. Ports (`src/domain/ports/repositories/`)

**`circle-repository.ts`** — nouvelles méthodes :

```typescript
export interface CircleRepository {
  // ... méthodes existantes ...

  // Membership avec statut
  addMembership(circleId: string, userId: string, role: CircleMemberRole, status?: MembershipStatus): Promise<CircleMembership>;
  updateMembershipStatus(circleId: string, userId: string, status: MembershipStatus): Promise<CircleMembership>;
  findPendingMemberships(circleId: string): Promise<CircleMembershipWithUser[]>;
  countPendingMemberships(circleId: string): Promise<number>;
}
```

**`moment-repository.ts`** (ou registration repository) — nouvelles méthodes :

```typescript
export interface RegistrationRepository {
  // ... méthodes existantes ...

  findPendingApprovals(momentId: string): Promise<RegistrationWithUser[]>;
  countPendingApprovals(momentId: string): Promise<number>;
  updateStatus(registrationId: string, status: RegistrationStatus): Promise<Registration>;
}
```

### 3. Nouveaux usecases (`src/domain/usecases/`)

#### `request-circle-membership.ts`
Remplace / étend `join-circle-directly` et `join-circle-by-invite` quand `requiresApproval = true`.

```
Entrée  : { circleId, userId, joinMode: "direct" | "invite" }
Logique :
  1. Charger le Circle → 404 si inexistant
  2. Vérifier membership existante
     - ACTIVE → retourner { alreadyMember: true }
     - PENDING → retourner { pendingApproval: true }
     - Absente → continuer
  3. Si circle.requiresApproval = false
     → addMembership(circleId, userId, "PLAYER", "ACTIVE")
     → retourner { joined: true }
  4. Si circle.requiresApproval = true
     → addMembership(circleId, userId, "PLAYER", "PENDING")
     → retourner { pendingApproval: true }
Sortie  : { joined?: true, pendingApproval?: true, alreadyMember?: true }
```

> **Note** : les 3 usecases existants (`join-circle-directly`, `join-circle-by-invite`, auto via `join-moment`) doivent être mis à jour pour passer par cette logique.

#### `approve-circle-membership.ts`

```
Entrée  : { circleId, memberUserId, hostUserId }
Logique :
  1. Vérifier que hostUserId est HOST du circleId → 403 sinon
  2. Charger la membership de memberUserId → 404 si inexistante
  3. Vérifier status = PENDING → erreur si pas en attente
  4. updateMembershipStatus(circleId, memberUserId, "ACTIVE")
  5. Notifier le Participant par email (confirmation membership)
Sortie  : CircleMembership (ACTIVE)
```

#### `reject-circle-membership.ts`

```
Entrée  : { circleId, memberUserId, hostUserId }
Logique :
  1. Vérifier que hostUserId est HOST du circleId → 403 sinon
  2. Charger la membership → 404 si inexistante
  3. Vérifier status = PENDING → erreur si pas en attente
  4. Supprimer la membership (ou la garder avec status REJECTED — voir note)
  5. Notifier le Participant par email (refus membership)
Sortie  : void
```

> **Note** : supprimer la membership (vs. REJECTED) est préférable pour simplifier la re-tentative (D9). À trancher à l'implémentation.

#### `join-moment.ts` (modifié, pas nouveau)

Logique actuelle : `REGISTERED` ou `WAITLISTED` selon capacité. Gère la re-inscription après `CANCELLED` (réactive la Registration existante).

Nouvelle logique :

```
1. Vérifier inscription existante :
   - REGISTERED / WAITLISTED / CHECKED_IN → AlreadyRegisteredError (inchangé)
   - CANCELLED → réactiver (inchangé)
   - REJECTED → réactiver en PENDING_APPROVAL si requiresApproval, sinon REGISTERED/WAITLISTED  ← [D16]
   - PENDING_APPROVAL → retourner { pendingApproval: true } (déjà en attente)
   - Absente → continuer

2. Si moment.requiresApproval = true :
   → créer Registration avec status = PENDING_APPROVAL
   → NE PAS auto-join Circle (attendre approbation)
   → Notifier l'Organisateur (email)
   → retourner { pendingApproval: true }

3. Si moment.requiresApproval = false :
   → logique actuelle (REGISTERED ou WAITLISTED)
   → auto-join Circle :
     - Si circle.requiresApproval = false → ACTIVE (comportement actuel)
     - Si circle.requiresApproval = true  → PENDING  ← [D2 Option A]
     - Si déjà membre (quel que soit status) → skip
```

#### `approve-moment-registration.ts`

```
Entrée  : { registrationId, hostUserId }
Logique :
  1. Charger la Registration → 404 si inexistante
  2. Charger le Moment → vérifier que hostUserId est HOST du Circle → 403
  3. Vérifier status = PENDING_APPROVAL → erreur sinon
  4. Vérifier capacité disponible :
     - count(REGISTERED + CHECKED_IN) < moment.capacity (ou pas de capacité)
     → passer en REGISTERED
     - Sinon → passer en WAITLISTED
  5. Auto-join Circle si pas encore membre :
     - circle.requiresApproval = false → ACTIVE
     - circle.requiresApproval = true  → PENDING
  6. Notifier le Participant par email (confirmation ou liste d'attente)
Sortie  : Registration (REGISTERED ou WAITLISTED)
```

#### `reject-moment-registration.ts`

```
Entrée  : { registrationId, hostUserId }
Logique :
  1. Charger la Registration → 404 si inexistante
  2. Charger le Moment → vérifier que hostUserId est HOST → 403
  3. Vérifier status = PENDING_APPROVAL → erreur sinon
  4. updateStatus(registrationId, "REJECTED")
  5. Notifier le Participant par email (refus inscription)
Sortie  : Registration (REJECTED)
```

#### `cancel-moment.ts` / `auto-past-moment` (modifiés)

Ajout : quand un événement passe en `CANCELLED` ou `PAST`, auto-rejeter toutes les Registrations `PENDING_APPROVAL` [D13].

```
Logique additionnelle :
  1. Charger toutes les Registrations PENDING_APPROVAL du Moment
  2. Pour chacune : updateStatus → REJECTED
  3. Notifier chaque Participant par email (refus automatique car événement annulé/passé)
```

---

## Flux complets par scénario

### Scénario 1 — Événement avec validation, Communauté sans

```
Player → /m/[slug] → "S'inscrire (soumis à validation)"
  → Registration: PENDING_APPROVAL
  → Circle: auto-join SKIPPED (en attente de l'approbation Moment)
  → Email Organisateur : "Nouvelle demande d'inscription"

Host Dashboard → onglet "En attente" sur l'événement
  → [Approuver]
    → Registration: REGISTERED (ou WAITLISTED si plein)
    → Circle: auto-join ACTIVE (car requiresApproval=false)
    → Email Participant : "Inscription confirmée"
  → [Refuser]
    → Registration: REJECTED
    → Email Participant : "Demande refusée"
```

### Scénario 2 — Événement sans validation, Communauté avec validation

```
Player → /m/[slug] → "S'inscrire" (normal, pas de changement UI)
  → Registration: REGISTERED (ou WAITLISTED)
  → Circle: auto-join PENDING  ← [D2 Option A]
  → Email Organisateur : "Nouvelle demande de membership" (séparé)

Host Dashboard → onglet "En attente" sur la Communauté
  → [Approuver]
    → CircleMembership: ACTIVE
    → Email Participant : "Vous êtes maintenant membre de [Communauté]"
  → [Refuser]
    → CircleMembership: supprimée
    → Email Participant : "Demande de membership refusée"
```

### Scénario 3 — Les deux avec validation

```
Player → /m/[slug] → "S'inscrire (soumis à validation)"
  → Registration: PENDING_APPROVAL
  → Circle: auto-join SKIPPED (en attente)
  → Email Organisateur : "Nouvelle demande d'inscription"

Host approuve Registration :
  → Registration: REGISTERED (ou WAITLISTED)
  → Circle: auto-join PENDING (car requiresApproval=true)
  → Email Participant : "Inscription confirmée" + "Votre demande de membership est en attente"
  → Email Organisateur : "Nouvelle demande de membership"

Host approuve CircleMembership :
  → CircleMembership: ACTIVE
  → Email Participant : "Vous êtes maintenant membre de [Communauté]"
```

### Scénario 4 — Join Circle direct (page /circles/[slug])

```
Player → /circles/[slug] → "S'inscrire (soumis à validation)"
  Si circle.requiresApproval = false :
    → CircleMembership: ACTIVE (comportement actuel)
    → Email Organisateur : "Nouveau membre"
  Si circle.requiresApproval = true :
    → CircleMembership: PENDING
    → Email Organisateur : "Nouvelle demande de membership"
    → UI Participant : "Votre demande est en cours de validation"
```

---

## Emails et notifications

### Emails vers l'Organisateur

| Déclencheur | Template | Données |
| --- | --- | --- |
| Nouvelle demande d'inscription à un événement | `moment-registration-request` | Participant name, moment title, lien dashboard |
| Nouvelle demande de membership Circle | `circle-membership-request` | Participant name, circle name, lien dashboard |

### Emails vers le Participant

| Déclencheur | Template | Données |
| --- | --- | --- |
| Demande d'inscription soumise | `moment-registration-pending` | Moment title, date, organisateur name |
| Inscription approuvée | email de confirmation existant (réutiliser) | — |
| Inscription en liste d'attente post-approbation | email liste d'attente existant (réutiliser) | — |
| Inscription refusée | `moment-registration-rejected` | Moment title |
| Demande membership soumise | `circle-membership-pending` | Circle name, organisateur name |
| Membership approuvée | `circle-membership-approved` | Circle name, lien vers la Communauté |
| Membership refusée | `circle-membership-rejected` | Circle name |

---

## Changements UI/UX

### Formulaire de création — Communauté

Section "Paramètres" (après les champs principaux) :

```
[ ] Demander une validation avant d'accepter les nouveaux membres
    Les demandes devront être approuvées manuellement depuis votre espace.
```

### Formulaire de création — Événement

Section "Options avancées" (masquées par défaut) :

```
[ ] Demander une validation avant d'accepter les inscriptions
    Les demandes devront être approuvées manuellement depuis votre espace.
```

### Page publique événement (`/m/[slug]`)

Si `moment.requiresApproval = true` et Participant non-inscrit :
- CTA : "S'inscrire (soumis à validation)" (au lieu de "S'inscrire")
- Sous le CTA : "L'Organisateur validera votre demande manuellement."

Post-soumission (Registration = PENDING_APPROVAL) :
- Remplacer le CTA par un état "Demande envoyée — en attente de validation"

### Page publique Communauté (`/circles/[slug]`)

Si `circle.requiresApproval = true` et Participant non-membre :
- CTA : "S'inscrire (soumis à validation)" (au lieu de "Rejoindre")
- Post-soumission : "Votre demande est en cours de validation par l'Organisateur."

### Dashboard Organisateur — Panneau de gestion des demandes

**Pour chaque Communauté et chaque événement concerné**, afficher une section "En attente" accessible depuis :
- La page de gestion du Moment (`/dashboard/moments/[slug]`)
- La page de gestion du Circle (`/dashboard/circles/[slug]`)

**UI de la liste des demandes :**

```
┌─────────────────────────────────────────────────┐
│  Demandes en attente (3)                        │
├─────────────────────────────────────────────────┤
│  [Avatar] Prénom NOM       il y a 2h            │
│  email@exemple.com                              │
│  [Approuver]  [Refuser]                         │
├─────────────────────────────────────────────────┤
│  [Avatar] Prénom NOM       il y a 5h            │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

**Badge de comptage :**
- Badge rouge sur l'entrée Circle/Moment dans le dashboard si demandes en attente > 0
- Visible depuis la liste de toutes les Communautés et tous les événements

### Dashboard Organisateur — Vue globale "En attente"

Dans la page principale du dashboard (`/dashboard`), ajouter une section transversale listant toutes les demandes en attente (tous Circles et Moments confondus), pour que l'Organisateur ait une vue d'ensemble sans naviguer dans chaque entité.

---

## Changements infrastructure

### `PrismaCircleRepository` — Audit exhaustif des méthodes membership

**Nouvelles méthodes à implémenter :**
- `addMembership` : accepter un paramètre `status` optionnel (défaut `ACTIVE`)
- `updateMembershipStatus(circleId, userId, status)` : mise à jour du statut
- `findPendingMemberships(circleId)` : `WHERE status = 'PENDING'`
- `countPendingMemberships(circleId)`

**Méthodes existantes à modifier (ajout filtre \****`status = 'ACTIVE'`**\*\*) :**

| Méthode | Utilisée par | Modification |
| --- | --- | --- |
| `countMembers(circleId)` | Pages Communauté, join page, OG image, email | Ajouter `WHERE status = 'ACTIVE'` |
| `findMembersByRole(circleId, role)` | Pages Communauté (hosts, players), dashboard, notifications, commentaires | Ajouter `WHERE status = 'ACTIVE'` |
| `findMemberCountsByCircleIds(circleIds)` | Explorer (batch count pour cartes) | Ajouter `WHERE status = 'ACTIVE'` dans le `groupBy` |
| `findPlayersForNewMomentNotification(circleId, excludeUserId)` | Broadcast nouveau Moment | Ajouter `WHERE status = 'ACTIVE'` [D12] |
| `findByUserId(userId, role)` | Dashboard (liste des Circles) | Ajouter `WHERE status = 'ACTIVE'` |
| `findAllByUserId(userId)` | Dashboard | Ajouter `WHERE status = 'ACTIVE'` |
| `findAllByUserIdWithStats(userId)` | Dashboard avec stats | Ajouter `WHERE status = 'ACTIVE'` |
| `getPublicCirclesForUser(userId)` | Profil public, page Circle | Ajouter `WHERE status = 'ACTIVE'` |
| `createWithHostMembership(input, hostUserId)` | Création Circle | Inchangé — HOST = toujours `ACTIVE` |

**Cas particulier — \****`findMembership(circleId, userId)`**\*\* :**

Cette méthode est utilisée de 3 façons différentes :
1. **Check d'existence** (avant `addMembership`) → doit retourner PENDING aussi (éviter doublon)
2. **Check d'autorisation** (est-ce un HOST ?) → doit aussi vérifier `status = ACTIVE`
3. **Check "déjà membre"** (UI) → PENDING ≠ membre actif

**Solution** : `findMembership` retourne la membership complète (avec `status`). Les appelants vérifient le `status` selon leur contexte. Pas de filtre dans la query.

### `PrismaRegistrationRepository` — Audit exhaustif

**Nouvelles méthodes :**
- `findPendingApprovals(momentId)` : `WHERE status = 'PENDING_APPROVAL'`
- `countPendingApprovals(momentId)`
- `updateStatus(registrationId, status)` : mise à jour générique

**Méthodes existantes à modifier :**

| Méthode | Statuts actuels | Modification |
| --- | --- | --- |
| `findActiveByMomentId(momentId)` | `['REGISTERED', 'WAITLISTED']` | Inchangé — PENDING_APPROVAL n'est pas "actif" |
| `findActiveWithUserByMomentId(momentId)` | `['REGISTERED', 'WAITLISTED']` | Inchangé — PENDING_APPROVAL exclu de la social proof |
| `findUpcomingByUserId(userId)` | `['REGISTERED', 'WAITLISTED']` | **Ajouter \****`PENDING_APPROVAL`** — le Participant doit voir ses demandes dans son dashboard [D15] |
| `findPastByUserId(userId)` | `['REGISTERED', 'CHECKED_IN']` | Inchangé |
| `findAllForUserDashboard(userId)` | **SQL brut hardcodé** | **Ajouter \****`PENDING_APPROVAL`** dans les upcoming + marquage visuel |
| `findFirstWaitlisted(momentId)` | `WHERE status = 'WAITLISTED'` | Inchangé |

**Usecase \****`get-user-registration.ts`** (ligne 24) :
- Code actuel : `if (!registration || registration.status === "CANCELLED")` → "pas inscrit"
- **Modifier** : ajouter `REJECTED` → `status === "CANCELLED" || status === "REJECTED"`
- `PENDING_APPROVAL` doit retourner la registration (en cours d'inscription)

### `PrismaAdminRepository`

| Méthode | Modification |
| --- | --- |
| `findAllCircles()` | `_count.memberships` → ajouter `WHERE status = 'ACTIVE'` |
| `getMembersInsight()` | Ajouter `WHERE status = 'ACTIVE'` (exclure PENDING des stats) |

### Explorer — `getPublicCircles()`

Le count actuel `_count: { select: { memberships: true } }` compte **tous** les memberships.
Modifier pour : `_count: { select: { memberships: { where: { status: 'ACTIVE' } } } }`.

Note : le scoring (`recalculate-circle-score.ts`) filtre déjà par `role: "PLAYER"` — ajouter `status: "ACTIVE"` au filtre existant.

### Mapping domain ↔ Prisma

- Mettre à jour tous les mappers qui construisent `CircleMembership` pour inclure `status`
- Mettre à jour les mappers `Circle` et `Moment` pour inclure `requiresApproval`

### i18n — Clés à ajouter

Ajouter dans `messages/fr.json` et `messages/en.json` :

| Clé | FR | EN |
| --- | --- | --- |
| `registrations.status.pending_approval` | En attente de validation | Pending approval |
| `registrations.status.rejected` | Refusée | Rejected |
| `membership.status.pending` | En attente | Pending |
| `membership.status.active` | Membre | Member |
| `moment.requestToJoin` | S'inscrire (soumis à validation) | Join (subject to approval) |
| `circle.joinRequiresApproval` | Rejoindre (soumis à validation) | Join (subject to approval) |
| `moment.pendingApproval` | Demande envoyée — en attente de validation | Request sent — pending approval |
| `circle.pendingApproval` | Votre demande est en cours de validation | Your request is pending approval |

---

## Tests requis

### Tests unitaires (usecases)

| Usecase | Scénarios à couvrir |
| --- | --- |
| `join-moment` (modifié) | requiresApproval=false → REGISTERED (inchangé), requiresApproval=true → PENDING_APPROVAL, circle requiresApproval=true → Circle PENDING, déjà inscrit, re-inscription après REJECTED [D16], existante PENDING_APPROVAL → retour idempotent |
| `approve-moment-registration` | capacité disponible → REGISTERED, capacité pleine → WAITLISTED, auto-join Circle (avec/sans requiresApproval), non-HOST → 403, status ≠ PENDING_APPROVAL → erreur |
| `reject-moment-registration` | happy path, non-HOST → 403, status ≠ PENDING_APPROVAL → erreur |
| `cancel-moment` (modifié) | auto-rejet des PENDING_APPROVAL quand événement annulé [D13] |
| `request-circle-membership` (modifié) | requiresApproval=false → ACTIVE, requiresApproval=true → PENDING, déjà ACTIVE, déjà PENDING |
| `approve-circle-membership` | happy path, non-HOST → 403, status ≠ PENDING → erreur |
| `reject-circle-membership` | happy path, non-HOST → 403, status ≠ PENDING → erreur |
| `leave-circle` (modifié) | PENDING → annulation de demande (suppression membership) [D14] |
| `get-user-registration` (modifié) | PENDING_APPROVAL retourne la registration, REJECTED traité comme "pas inscrit" |

### Tests d'autorisation (sécurité)

- Un non-Host ne peut pas approuver/refuser une demande sur un Moment qu'il ne gère pas
- Un non-Host ne peut pas approuver/refuser une demande sur un Circle dont il n'est pas Host
- Un Participant avec membership `PENDING` n'a pas accès aux contenus réservés aux membres
- Un Participant avec Registration `PENDING_APPROVAL` n'apparaît pas dans la liste des inscrits confirmés
- Un Participant avec Registration `PENDING_APPROVAL` ne peut pas commenter l'événement [D11]
- Un Participant avec CircleMembership `PENDING` ne reçoit pas les broadcasts [D12]

### Tests E2E (Playwright)

Nouvelle spec `tests/e2e/approval-registration.spec.ts` :

1. **Événement avec validation** : Participant soumet une demande → Host voit la demande dans dashboard → Host approuve → Participant voit confirmation
2. **Événement avec validation** : Host refuse → Participant voit refus
3. **Communauté avec validation** : Participant fait une demande de membership depuis la page publique → Host approuve
4. **Cross-flow (D2 Option A)** : Participant s'inscrit à un événement sans validation dont la Communauté a validation → Registration REGISTERED + CircleMembership PENDING visible dans dashboard Host
5. **Re-inscription après rejet** : Participant refusé → soumet à nouveau → PENDING_APPROVAL
6. **Annulation événement** : Événement avec PENDING_APPROVAL annulé → Participant voit refus
7. **Dashboard Participant** : les demandes en attente apparaissent dans "Mon espace" [D15]

---

## Analyse de risque

### Risque ÉLEVÉ — `CircleMembership.status` (impact pervasif)

L'ajout du champ `status` sur `CircleMembership` est le changement le plus risqué. Aujourd'hui, **aucune query ne filtre par statut** puisque le champ n'existe pas. Sans mise à jour des queries existantes :

**12 méthodes du CircleRepository + 3 méthodes admin/explorer à auditer** (liste exhaustive dans la section Infrastructure) :

| Query impactée | Nb d'utilisations | Régression si non corrigée |
| --- | --- | --- |
| `countMembers(circleId)` | 5 | Compteurs gonflés (PENDING comptés comme membres) |
| `findMembersByRole(circleId, role)` | 10+ | Membres PENDING visibles + notifiés |
| `findMembership(circleId, userId)` | 7 usecases + pages | Bouton "Rejoindre" disparaît pour un PENDING |
| `findMemberCountsByCircleIds(circleIds)` | Explorer | Cartes Explorer faussées |
| `findPlayersForNewMomentNotification` | Broadcast | PENDING reçoivent les broadcasts |
| `findByUserId` / `findAllByUserId` / `findAllByUserIdWithStats` | Dashboard | Circles PENDING affichés comme actifs |
| `getPublicCirclesForUser` | Profil | PENDING sur profil public |
| `getPublicCircles` (`_count`) | Explorer | Tri populaire faussé |
| Admin `_count.memberships` | Admin | Stats admin faussées |
| `recalculate-circle-score` | Scoring | Scores gonflés |

### Risque ÉLEVÉ — `RegistrationStatus` (statuts hardcodés)

Le codebase repose sur une **liste fermée de 4 statuts** hardcodés dans 6+ endroits :

| Code impacté | Risque si non mis à jour |
| --- | --- |
| `get-user-registration.ts` : `status === "CANCELLED"` | PENDING_APPROVAL traité comme "inscrit" → UI incohérente |
| `findUpcomingByUserId` : `['REGISTERED', 'WAITLISTED']` | PENDING_APPROVAL invisible dans dashboard Participant |
| `findAllForUserDashboard` : **SQL brut hardcodé** | PENDING_APPROVAL exclu du dashboard |
| `registration-button.tsx` : `status === "REGISTERED" \ | \ | "WAITLISTED"` | PENDING_APPROVAL → aucun état affiché |
| `registrations-list.tsx` : traduction `status.${r.status}` | Clé i18n manquante → texte vide |
| Composant commentaires | PENDING_APPROVAL peut commenter (pas de check) |

### Risque MOYEN — `JoinMoment` (chemin critique)

C'est le usecase le plus utilisé de la plateforme. Le modifier pour ajouter la branche `requiresApproval` introduit un risque de régression sur le flow d'inscription normal. Un bug ici = **plus personne ne peut s'inscrire**.

### Risque MOYEN — Cross-flow Option A (état mixte)

Le scénario "événement sans validation + Communauté avec validation" crée un état mixte (Registration REGISTERED + CircleMembership PENDING). Incohérences UX possibles :

- Le Participant est inscrit à l'événement mais n'apparaît pas comme membre de la Communauté
- Il reçoit les notifications événement mais pas les notifications Communauté
- Sur la page Communauté, il voit "S'inscrire (soumis à validation)" alors qu'il est déjà inscrit à un événement de cette Communauté

### Risque FAIBLE — Schema Prisma

Le `@default` rend la migration sans risque. Pas de données à transformer, pas de backfill nécessaire.

### Risque FAIBLE — Nouveaux usecases isolés

`ApproveMomentRegistration`, `RejectMomentRegistration`, etc. sont des chemins entièrement nouveaux — pas de régression possible, seulement des bugs potentiels dans le nouveau code couvert par les tests.

### Estimation globale : **Risque moyen-élevé**

Le facteur principal n'est pas la complexité de la feature elle-même, mais l'**impact pervasif du champ \****`status`**\*\* sur CircleMembership** et la modification du chemin critique `JoinMoment`.

---

## Plan de mitigation — Implémentation par phases

Pour réduire le risque, l'implémentation doit se faire en **3 phases distinctes**, chacune testable et déployable indépendamment.

### Phase 1 — Sécuriser les queries existantes (risque zéro si bien fait)

**Objectif** : ajouter le champ `status` au schema et mettre à jour TOUTES les queries existantes pour filtrer par `status = ACTIVE`, **sans ajouter aucune logique de validation**.

1. Ajouter `MembershipStatus` enum + champ `status` sur `CircleMembership` (`@default(ACTIVE)`)
2. Ajouter `requiresApproval` sur Circle et Moment (`@default(false)`)
3. Ajouter `PENDING_APPROVAL` et `REJECTED` à `RegistrationStatus`
4. Mettre à jour le domain model `CircleMembership` (ajout du champ `status`)
5. Mettre à jour le domain model `Circle` et `Moment` (ajout de `requiresApproval`)
6. Mettre à jour tous les mappers Prisma ↔ domaine
7. **Auditer et mettre à jour les 12 méthodes du \****`CircleRepository`** (liste exhaustive dans la section Infrastructure) :
  - `countMembers` → `WHERE status = ACTIVE`
  - `findMembersByRole` → `WHERE status = ACTIVE`
  - `findMemberCountsByCircleIds` → `WHERE status = ACTIVE`
  - `findPlayersForNewMomentNotification` → `WHERE status = ACTIVE`
  - `findByUserId` → `WHERE status = ACTIVE`
  - `findAllByUserId` → `WHERE status = ACTIVE`
  - `findAllByUserIdWithStats` → `WHERE status = ACTIVE`
  - `getPublicCirclesForUser` → `WHERE status = ACTIVE`
  - `findMembership` → retourner avec `status`, pas de filtre (les appelants vérifient)
  - `createWithHostMembership` → inchangé (HOST = ACTIVE)
8. **Mettre à jour le \****`PrismaAdminRepository`** :
  - `findAllCircles()` → `_count.memberships` avec `WHERE status = ACTIVE`
  - `getMembersInsight()` → `WHERE status = ACTIVE`
9. **Mettre à jour \****`getPublicCircles()`** (Explorer) : `_count.memberships` avec `WHERE status = ACTIVE`
10. **Mettre à jour \****`recalculate-circle-score.ts`** : ajouter `status: "ACTIVE"` au filtre existant
11. **Mettre à jour \****`get-user-registration.ts`** : ajouter `REJECTED` aux statuts "pas inscrit"
12. **Ajouter les clés i18n** pour les nouveaux statuts
13. **Mettre à jour les mocks de test** (`mock-circle-repository.ts`) pour inclure le champ `status`
14. **Tests de non-régression** : tous les tests existants doivent passer sans modification (le `@default(ACTIVE)` garantit le comportement identique)

**Critère de validation** : aucun changement de comportement visible. Les 690+ tests existants passent au vert.

### Phase 2 — Logique de validation (nouveau code)

**Objectif** : implémenter les usecases de validation, sans encore toucher à `JoinMoment`.

1. Créer les usecases `ApproveCircleMembership`, `RejectCircleMembership`
2. Créer les usecases `ApproveMomentRegistration`, `RejectMomentRegistration`
3. Créer les server actions correspondantes
4. Créer les templates email (demande, approbation, refus)
5. Créer l'UI dashboard "Demandes en attente" (liste, approve, reject)
6. **Tests unitaires complets** pour chaque usecase

**Critère de validation** : tous les nouveaux usecases testés. Les usecases existants ne sont pas modifiés.

### Phase 3 — Activer la validation dans les flows existants (modification du chemin critique)

**Objectif** : modifier `JoinMoment`, `JoinCircleDirectly`, `JoinCircleByInvite` pour brancher sur `requiresApproval`.

1. Modifier `JoinMoment` : si `requiresApproval = true` → `PENDING_APPROVAL`
2. Modifier les 3 usecases de join Circle : si `requiresApproval = true` → `PENDING`
3. Modifier l'UI des pages publiques (CTA conditionnel, états post-soumission)
4. Modifier les formulaires de création Circle et Moment (toggle `requiresApproval`)
5. **Tests de non-régression** : vérifier que `requiresApproval = false` (défaut) produit exactement le même comportement qu'avant
6. **Tests E2E** : scénarios complets avec validation activée

**Critère de validation** : le flow normal (sans validation) est identique. Le flow avec validation fonctionne de bout en bout.

---

## Hors scope (cette version)

- Message personnalisé du Participant avec sa demande
- Motif de refus par l'Organisateur
- Expiration des demandes
- Approbation en masse (bulk approve/reject)
- Délégation de l'approbation à un co-organisateur
- Critères d'approbation automatique (règles)
- Pré-remplissage de formulaire avant la demande (questionnaire)
