# Feature — Co-organisateurs de Communauté

**Statut :** Analyse réalisée — en attente de décisions de design
**Date :** 2026-04-04
**Contexte :** Un Organisateur doit pouvoir déléguer la gestion de sa Communauté et de ses événements à des co-organisateurs, sans perdre le contrôle. Besoin fréquent pour les communautés multi-leaders.

---

## Positionnement et périmètre

### Ce qui est inclus (cette spec)

**Co-organisateurs au niveau Communauté.** Un co-organisateur a les mêmes droits étendus que l'Organisateur principal sur la Communauté et tous ses événements, sauf les actions réservées au propriétaire.

### Ce qui est exclu (post-MVP)

**Co-organisateurs au niveau événement.** Permettre à un non-organisateur de gérer un événement spécifique sans être co-organisateur de toute la Communauté. Complexité significativement plus élevée (nouvelle table de jointure Moment ↔ User, double source d'autorisation). Reporté.

### Pourquoi cette séparation

La Communauté est l'entité centrale de la plateforme (community-centric, pas event-centric). Les droits de gestion sont naturellement portés par la membership au Circle, pas par l'événement. Un co-organisateur de Communauté peut déjà gérer tous les événements — couvrant 90% des cas d'usage réels.

---

## Ce qui existe déjà

| Élément | Emplacement | Détail |
| --- | --- | --- |
| Enum `CircleMemberRole` | `domain/models/circle.ts:10` | `"HOST" \ | "PLAYER"` — seulement 2 rôles |
| Contrainte unique `(userId, circleId)` | `prisma/schema.prisma` | Une seule membership par utilisateur et Communauté |
| Index `(circleId, role)` | `prisma/schema.prisma` | Recherche rapide des Organisateurs d'une Communauté |
| `findMembership(circleId, userId)` | Port `CircleRepository` | Retourne la membership avec le rôle — utilisé par **tous** les usecases d'autorisation |
| `findMembersByRole(circleId, role)` | Port `CircleRepository` | Retourne tous les membres d'un rôle — utilisé pour l'affichage "Organisé par" et les notifications |
| Affichage multi-organisateurs | `moment-detail-view.tsx:280-305` | **Déjà implémenté** — itère sur le tableau `hosts` avec virgule de séparation |
| Guard `leaveCircle` | `leave-circle.ts:39` | Un HOST ne peut pas quitter sa Communauté → `CannotLeaveAsHostError` |
| Guard `removeCircleMember` | `remove-circle-member.ts:56` | On ne peut pas retirer un HOST → `CannotRemoveHostError` |
| Guard `deleteCircle` | `delete-circle.ts:28` | Seul un HOST peut supprimer la Communauté |

### Pattern d'autorisation actuel (uniforme sur 14+ usecases)

```typescript
const membership = await circleRepository.findMembership(circleId, userId);
if (!membership || membership.role !== "HOST") {
  throw new UnauthorizedCircleActionError(userId, circleId);
}
```

Ce pattern est identique dans : `create-moment`, `update-moment`, `delete-moment`, `publish-moment`, `update-circle`, `delete-circle`, `remove-circle-member`, `approve-moment-registration`, `reject-moment-registration`, `remove-registration-by-host`, `approve-circle-membership`, `reject-circle-membership`.

---

## Décisions de design

### Décisions prises

| # | Décision | Justification |
| --- | --- | --- |
| D1 | Le nouveau rôle s'appelle `CO_HOST` dans le code (i18n FR : "Co-organisateur", EN : "Co-organizer") | Cohérent avec `HOST` / `PLAYER` existants |
| D2 | Un `CO_HOST` a les **mêmes droits** qu'un `HOST` sur tous les usecases de gestion | Simplicité maximale — pas de matrice de permissions granulaire |
| D3 | **Exceptions** réservées au `HOST` principal (voir section dédiée) | Protège contre la perte de contrôle |
| D4 | L'affichage "Organisé par" montre **tous les organisateurs du Circle** (HOST + CO_HOSTs), pas le créateur de l'événement | Cohérent avec le positionnement community-centric : la Communauté organise, pas un individu |
| D5 | Le `createdById` sur Moment reste une trace historique, sans impact sur l'affichage ni l'autorisation | Pas de changement de comportement existant |
| D6 | Un CO_HOST apparaît dans la liste des organisateurs sur la page Communauté et sur chaque page événement | Visibilité équivalente dans l'UI |
| D7 | Pas de limite au nombre de co-organisateurs par Communauté (MVP) | Simplicité — une limite peut être ajoutée plus tard si nécessaire |
| D8 | **Badge unique "Organisateur"** côté public pour HOST et CO_HOST. La distinction "Propriétaire" vs "Organisateur" n'apparaît que dans le dashboard de gestion (liste des membres côté orga) | Côté Participant, la distinction n'apporte rien — les deux ont les mêmes droits. Réduit la confusion. Cohérent avec Luma/Meetup qui ne distinguent pas visuellement les co-orgas |

### Décisions à prendre

| # | Question | Options | Recommandation |
| --- | --- | --- | --- |
| Q1 | Un CO_HOST peut-il **quitter** la Communauté librement ? | (a) Oui, `leaveCircle` autorisé pour CO_HOST (b) Non, il doit être rétrogradé d'abord | **(a)** — un co-organisateur n'est pas "prisonnier". Le guard `CannotLeaveAsHostError` ne s'applique qu'au HOST principal |
| Q2 | Un HOST peut-il **retirer** un CO_HOST via `removeCircleMember` ? | (a) Oui, comme un PLAYER (b) Non, il faut d'abord rétrograder | **(a)** — le HOST principal garde le contrôle total. Le guard `CannotRemoveHostError` ne protège que les HOSTs |
| Q3 | Un CO_HOST peut-il **retirer** un autre CO_HOST ? | (a) Oui (b) Non, seul le HOST principal peut | **(b)** — évite les guerres internes, le HOST tranche |
| Q4 | Comment un CO_HOST est-il ajouté ? | (a) Promotion d'un membre existant (PLAYER → CO_HOST) (b) Invitation directe en tant que CO_HOST (c) Les deux | **(a)** — la personne doit d'abord être membre de la Communauté. Réduit la complexité |
| Q5 | Un CO_HOST reçoit-il les **notifications Organisateur** ? | (a) Oui, toutes (nouvelles inscriptions, commentaires, etc.) (b) Non, seul le HOST principal (c) Configurable | **(a)** — s'il a les droits de gestion, il doit être informé. Configurable en V2 |
| ~~Q6~~ | ~~Affichage dans la liste des membres : comment distinguer HOST et CO\_HOST ?~~ | — | **Résolu → D8.** Badge unique "Organisateur" côté public. Distinction "Propriétaire" / "Organisateur" uniquement dans le dashboard de gestion |
| Q7 | Un CO_HOST peut-il **broadcast** un message aux membres ? | (a) Oui (b) Non | **(a)** — c'est une action de gestion classique |

---

## Actions réservées au HOST principal

Ces actions ne seront **jamais** accessibles à un CO_HOST :

| Action | Usecase | Raison |
| --- | --- | --- |
| Supprimer la Communauté | `deleteCircle` | Irréversible — seul le propriétaire |
| Transférer la propriété | `transferOwnership` (nouveau) | Changement de propriétaire |
| Promouvoir un membre en CO_HOST | `promoteToCoHost` (nouveau) | Le HOST contrôle qui a des droits |
| Rétrograder un CO_HOST | `demoteFromCoHost` (nouveau) | Le HOST contrôle qui a des droits |
| Retirer un CO_HOST de la Communauté | `removeCircleMember` (modifié) | Le HOST peut retirer un CO_HOST, un CO_HOST ne peut pas |

---

## Changements au schéma Prisma

### Enum modifié

```prisma
enum CircleMemberRole {
  HOST        // Organisateur principal (propriétaire)
  CO_HOST     // Co-organisateur (nouveau)
  PLAYER      // Participant / membre
}
```

Aucun nouveau champ, aucune nouvelle table, aucun nouvel index nécessaire. L'index existant `@@index([circleId, role])` couvre déjà les requêtes par rôle.

---

## Changements au domaine

### Modèle

```typescript
// domain/models/circle.ts
export type CircleMemberRole = "HOST" | "CO_HOST" | "PLAYER";
```

### Helper d'autorisation (nouveau)

```typescript
// domain/models/circle.ts (ou fichier dédié)
export function isOrganizerRole(role: CircleMemberRole): boolean {
  return role === "HOST" || role === "CO_HOST";
}
```

Ce helper centralise le check et évite de dupliquer `role === "HOST" || role === "CO_HOST"` dans 14+ usecases. Quand un futur rôle (ex: MODERATOR) est ajouté, un seul endroit à modifier.

### Usecases modifiés — check étendu à CO_HOST

Les usecases suivants changent leur guard de `role !== "HOST"` à `!isOrganizerRole(role)` :

| Usecase | Modification |
| --- | --- |
| `createMoment` | CO_HOST peut créer des événements |
| `updateMoment` | CO_HOST peut éditer des événements |
| `deleteMoment` | CO_HOST peut supprimer des événements |
| `publishMoment` | CO_HOST peut publier des événements |
| `updateCircle` | CO_HOST peut éditer les paramètres de la Communauté |
| `generateCircleInviteToken` | CO_HOST peut générer des liens d'invitation |
| `revokeCircleInviteToken` | CO_HOST peut révoquer des liens d'invitation |
| `approveMomentRegistration` | CO_HOST peut approuver des inscriptions |
| `rejectMomentRegistration` | CO_HOST peut rejeter des inscriptions |
| `removeRegistrationByHost` | CO_HOST peut retirer des inscrits |
| `approveCircleMembership` | CO_HOST peut approuver des demandes de membership |
| `rejectCircleMembership` | CO_HOST peut rejeter des demandes de membership |
| `getMomentRegistrations` | CO_HOST peut voir la liste des inscrits |
| `deleteComment` | CO_HOST peut modérer les commentaires |

### Usecases modifiés — logique spécifique

| Usecase | Modification |
| --- | --- |
| `deleteCircle` | **Inchangé** — seul `HOST` peut supprimer |
| `leaveCircle` | Le guard `CannotLeaveAsHostError` ne s'applique qu'au `HOST`. Un `CO_HOST` peut quitter (traité comme un PLAYER pour la mécanique de départ) |
| `removeCircleMember` | Le guard `CannotRemoveHostError` protège les `HOST` ET les `CO_HOST` si l'appelant est un `CO_HOST`. Un `HOST` peut retirer un `CO_HOST`. Un `CO_HOST` ne peut pas retirer un autre `CO_HOST` ni un `HOST` |

### Nouveaux usecases

| Usecase | Description | Appelant |
| --- | --- | --- |
| `promoteToCoHost` | Change le rôle d'un PLAYER en CO_HOST | HOST uniquement |
| `demoteFromCoHost` | Change le rôle d'un CO_HOST en PLAYER | HOST uniquement |
| `transferOwnership` | Échange les rôles HOST ↔ CO_HOST (ou HOST ↔ PLAYER) entre le propriétaire et un membre | HOST uniquement |

---

## Changements UI

### Stratégie de badges (D8)

| Contexte | HOST | CO_HOST | PLAYER |
| --- | --- | --- | --- |
| Pages publiques (événement, Communauté) — "Organisé par" | "Organisateur" | "Organisateur" | — |
| Liste des membres (vue Participant) | Badge Crown "Organisateur" | Badge Crown "Organisateur" | — |
| Dashboard — liste des membres (vue Organisateur) | Badge Crown "Propriétaire" | Badge Crown "Organisateur" | — |
| Dashboard — carte Communauté | Badge "Propriétaire" | Badge "Organisateur" | Badge "Membre" |

> Côté Participant, aucune distinction visible entre HOST et CO_HOST. La nuance "Propriétaire" n'existe que dans le cockpit de gestion, pour savoir qui peut promouvoir/rétrograder.

### Page Communauté (dashboard Organisateur)

- **Liste des membres** : même icône Crown pour HOST et CO_HOST, mais label "Propriétaire" (HOST) vs "Organisateur" (CO_HOST)
- **Menu contextuel membre** : nouvelles actions "Promouvoir en co-organisateur" et "Rétrograder en participant" (visibles uniquement pour le HOST principal)
- **Paramètres de la Communauté** : section "Équipe d'organisation" listant HOST + CO_HOSTs avec actions de gestion

### Page événement (publique)

- **"Organisé par"** : affiche tous les HOST + CO_HOSTs du Circle sans distinction (déjà fonctionnel via `findMembersByRole`)
- Adaptation de l'appel : `findMembersByRole(circleId, "HOST")` → requête incluant `CO_HOST` (nouvelle méthode ou paramètre)

### Page événement (dashboard)

- Boutons d'édition, publication, gestion inscrits visibles pour les CO_HOSTs (pas de changement UI — les server actions autorisent déjà en amont, et les composants reçoivent `isHost` comme prop)
- Renommer la prop `isHost` en `isOrganizer` serait plus exact mais pas bloquant

### Dashboard principal

- Les Communautés où l'utilisateur est CO_HOST apparaissent dans "Mes Communautés" côté Organisateur
- Badge "Organisateur" sur la carte Communauté (identique au HOST pour le CO_HOST, sauf dans la vue détaillée où le HOST voit "Propriétaire")

---

## Changements notifications

Les appels `findMembersByRole(circleId, "HOST")` pour envoyer les notifications Organisateur doivent inclure les CO_HOSTs.

**Fichiers impactés :**

| Fichier | Usage actuel | Modification |
| --- | --- | --- |
| `app/actions/registration.ts:178` | Notifie les HOSTs d'une nouvelle inscription | Inclure CO_HOSTs |
| `app/actions/registration.ts:307` | Notifie les HOSTs d'une annulation | Inclure CO_HOSTs |
| `app/actions/registration.ts:626` | Notifie les HOSTs d'une inscription payée | Inclure CO_HOSTs |
| `app/actions/comment.ts:122` | Notifie les HOSTs d'un nouveau commentaire | Inclure CO_HOSTs |
| `app/actions/circle.ts:654` | Notifie les HOSTs d'une invitation acceptée | Inclure CO_HOSTs |
| `app/actions/notify-host-new-circle-member.ts:24` | Notifie les HOSTs d'un nouveau membre | Inclure CO_HOSTs |
| `app/actions/moment.ts:368` | Notifie les HOSTs de la publication d'un événement | Inclure CO_HOSTs |

**Approche** : modifier `findMembersByRole` ou ajouter `findOrganizers(circleId)` qui retourne les membres avec rôle `HOST` ou `CO_HOST`.

---

## Changements repository

### Option A — Nouvelle méthode dédiée (recommandée)

```typescript
// domain/ports/repositories/circle-repository.ts
findOrganizers(circleId: string): Promise<CircleMemberWithUser[]>;
```

Implémentation : `WHERE circleId = ? AND role IN ('HOST', 'CO_HOST') AND status = 'ACTIVE'`.

Remplace les 10+ appels à `findMembersByRole(circleId, "HOST")` dans les actions et pages.

### Option B — Paramètre multi-rôle

```typescript
findMembersByRoles(circleId: string, roles: CircleMemberRole[]): Promise<CircleMemberWithUser[]>;
```

Plus flexible mais verbose à l'appel. Moins lisible que `findOrganizers()`.

---

## Changements pages (SSR)

| Page | Fichier | Modification |
| --- | --- | --- |
| Page événement publique | `m/[slug]/page.tsx:114` | `findMembersByRole("HOST")` → `findOrganizers()` |
| Page Communauté publique | `circles/[slug]/page.tsx:133` | Idem |
| Page join par token | `circles/join/[token]/page.tsx:50` | Idem |
| Dashboard Communauté | `dashboard/.../circles/[slug]/page.tsx:94` | Idem + gérer l'affichage CO_HOST |
| Dashboard événement | `dashboard/.../moments/[momentSlug]/page.tsx:46` | Idem |

---

## Stratégie de tests

### Tests unitaires (usecases)

Pour chaque usecase modifié, ajouter les cas :

```
describe("given a CO_HOST user", () => {
  it("should allow the action (same as HOST)")
})

describe("given a HOST user targeting a CO_HOST", () => {
  it("should allow removal/demotion")
})

describe("given a CO_HOST user targeting another CO_HOST", () => {
  it("should deny removal")
})
```

### Tests de sécurité (RBAC)

Nouveau fichier `__tests__/security/co-host-authorization.test.ts` couvrant :

- Un CO_HOST peut faire toutes les actions de gestion standard
- Un CO_HOST **ne peut pas** supprimer la Communauté
- Un CO_HOST **ne peut pas** promouvoir/rétrograder d'autres membres
- Un CO_HOST **ne peut pas** retirer un autre CO_HOST ni le HOST
- Un PLAYER promu CO_HOST acquiert immédiatement les droits
- Un CO_HOST rétrogradé en PLAYER perd immédiatement les droits

### Tests E2E (Playwright)

Nouveau fichier `tests/e2e/co-host.spec.ts` couvrant :

- HOST promeut un PLAYER en CO_HOST
- CO_HOST crée un événement → "Organisé par" affiche les deux
- CO_HOST édite un événement créé par le HOST
- CO_HOST approuve une inscription
- CO_HOST quitte la Communauté → redevient simple membre (sans membership)
- HOST rétrograde un CO_HOST → le CO_HOST perd l'accès aux actions de gestion

---

## Plan d'implémentation (ordre recommandé)

| Étape | Description | Estimation |
| --- | --- | --- |
| 1 | Schema Prisma : ajouter `CO_HOST` à l'enum + push dev/prod | 15 min |
| 2 | Domaine : mettre à jour le type `CircleMemberRole` + créer `isOrganizerRole()` | 15 min |
| 3 | Usecases : adapter les 14 checks d'autorisation existants | 1h |
| 4 | Usecases : créer `promoteToCoHost`, `demoteFromCoHost` | 1h |
| 5 | Repository : ajouter `findOrganizers()` (port + adapter Prisma) | 30 min |
| 6 | Pages SSR + server actions : remplacer `findMembersByRole("HOST")` par `findOrganizers()` | 1h |
| 7 | Notifications : adapter les 7 fichiers qui notifient les HOSTs | 30 min |
| 8 | UI dashboard : actions promotion/rétrogradation dans la liste des membres | 2h |
| 9 | UI badges : badge unique "Organisateur" côté public, "Propriétaire" vs "Organisateur" dans le dashboard | 30 min |
| 10 | Tests unitaires : adapter les tests existants + nouveaux cas CO_HOST | 2h |
| 11 | Tests sécurité RBAC | 1h |
| 12 | Tests E2E | 1h30 |
| 13 | i18n : clés FR/EN pour co-organisateur, badges, actions | 30 min |

**Total estimé : \~2-3 jours**

---

## Fichiers clés (existants, à modifier)

| Fichier | Rôle |
| --- | --- |
| `prisma/schema.prisma` | Enum `CircleMemberRole` |
| `src/domain/models/circle.ts` | Type `CircleMemberRole` |
| `src/domain/usecases/*.ts` | 14+ usecases avec check HOST |
| `src/domain/ports/repositories/circle-repository.ts` | Port — ajouter `findOrganizers()` |
| `src/infrastructure/repositories/prisma-circle-repository.ts` | Adapter — implémenter `findOrganizers()` |
| `src/app/actions/registration.ts` | Notifications inscriptions → HOSTs |
| `src/app/actions/comment.ts` | Notifications commentaires → HOSTs |
| `src/app/actions/circle.ts` | Notifications membres → HOSTs |
| `src/app/actions/moment.ts` | Notifications publication → HOSTs |
| `src/app/[locale]/(routes)/m/[slug]/page.tsx` | Page événement — `hosts` |
| `src/app/[locale]/(routes)/circles/[slug]/page.tsx` | Page Communauté — `hosts` |
| `src/components/moments/moment-detail-view.tsx` | Affichage "Organisé par" |
| `src/components/circles/circle-members-list.tsx` | Badges rôle dans la liste des membres |
| `src/components/circles/dashboard-circle-card.tsx` | Badge Organisateur/Co-organisateur |

---

## Évolutions futures (hors scope)

- **Transfert de propriété** (`transferOwnership`) : le HOST cède la propriété à un CO_HOST ou PLAYER
- **Co-organisateurs par événement** : droits granulaires par événement sans être co-organisateur de la Communauté
- **Rôle MODERATOR** : droits intermédiaires (modération commentaires, check-in, sans édition événement)
- **Permissions granulaires** : matrice de permissions par rôle (quelles actions chaque rôle peut faire)
- **Notifications configurables** : chaque co-organisateur choisit quelles notifications il reçoit
