# Feature — Co-organisateurs de Communauté

**Statut :** Analyse complète — décisions de design figées, prêt pour implémentation
**Date :** 2026-04-04 (analyse), 2026-04-17 (décisions)
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
| Affichage multi-organisateurs | `moment-detail-view.tsx:280-305` | Composant **capable** d'afficher plusieurs organisateurs (itère sur le tableau `hosts` avec virgule de séparation) — mais ne reçoit aujourd'hui qu'un seul HOST en pratique. Aucun changement de rendu nécessaire, seul le peuplement du tableau change (appel `findOrganizers()`) |
| Guard `leaveCircle` | `leave-circle.ts:39` | Un HOST ne peut pas quitter sa Communauté → `CannotLeaveAsHostError` |
| Guard `removeCircleMember` | `remove-circle-member.ts:56` | On ne peut pas retirer un HOST → `CannotRemoveHostError` |
| Guard `deleteCircle` | `delete-circle.ts:28` | Seul un HOST peut supprimer la Communauté |

### Pattern d'autorisation actuel (similaire, non strictement uniforme sur 17+ usecases)

```typescript
const membership = await circleRepository.findMembership(circleId, userId);
if (!membership || membership.role !== "HOST") {
  throw new UnauthorizedCircleActionError(userId, circleId);
}
```

Ce squelette est présent dans : `create-moment`, `update-moment`, `delete-moment`, `publish-moment`, `update-circle`, `delete-circle`, `remove-circle-member`, `remove-registration-by-host`, `get-moment-registrations`, `add-moment-attachment`, `remove-moment-attachment`, `onboard-stripe-connect`, `delete-comment` (variante).

> **Variante plus stricte** : `approve-moment-registration`, `reject-moment-registration`, `approve-circle-membership`, `reject-circle-membership` ajoutent `status !== "ACTIVE"` au check. Cette divergence silencieuse est résolue par D17 (helper `isActiveOrganizer` appliqué partout).

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
| D9 | Un CO_HOST peut **quitter** librement la Communauté (le guard `CannotLeaveAsHostError` ne s'applique qu'au HOST) | Un co-organisateur n'est pas prisonnier. La Communauté conserve son HOST propriétaire, pas de risque de perte de contrôle |
| D10 | Un HOST peut **retirer un CO_HOST** directement via `removeCircleMember` (une étape, pas de rétrogradation préalable requise) | Le HOST garde le contrôle total. Forcer deux étapes ajouterait de la friction sans bénéfice |
| D11 | Un CO_HOST **ne peut pas** retirer un autre CO_HOST ni un HOST. Seuls les PLAYERs sont retirables par un CO_HOST | Évite les guerres internes entre co-orgas. Le HOST arbitre. Asymétrique avec le reste des droits, volontairement |
| D12 | Ajout d'un CO_HOST **uniquement par promotion** d'un membre existant (PLAYER → CO_HOST). Pas d'invitation directe en CO_HOST | Réduit la complexité (pas de flow d'invitation dédié). Le HOST connaît la personne avant de la promouvoir |
| D13 | Un CO_HOST reçoit **toutes les notifications Organisateur** par défaut (mêmes que le HOST). Configurable en V2 | Symétrie droits/infos : s'il peut agir, il doit savoir. Éviter les asymétries (ex : peut approuver une inscription mais ne la voit pas) |
| D14 | Un CO_HOST peut **broadcast** un message aux membres de la Communauté | Animation de la Communauté = partie intégrante du rôle Organisateur. Le HOST garde le levier "retirer le CO_HOST" si dérive |
| D15 | Connexion / modification du compte **Stripe Connect** réservée au HOST principal | Action financière irréversible (lie un compte bancaire à la Communauté). Cohérent avec les autres actions structurantes réservées au HOST |
| D16 | Un CO_HOST **ne peut pas** annuler sa propre inscription à un événement de sa Communauté (même règle que le HOST) | Cohérence : un organisateur reste présent à ses événements. Cas d'empêchement réel → le HOST peut retirer l'inscription via `removeRegistrationByHost` |
| D17 | **Uniformisation du check d'autorisation** : les droits d'Organisateur s'exercent uniquement si `status === "ACTIVE"`. Helper `isActiveOrganizer(membership)` centralise le check partout | Règle simple ("tant que l'adhésion n'est pas validée, pas de pouvoir"). Corrige une incohérence existante entre usecases |
| D18 | `transferOwnership` **reporté après le MVP** co-organisateurs | Cas rare, géré manuellement via `pnpm transfer-circle-host:prod` en attendant |
| D19 | **Emails systématiques** à chaque changement de rôle : "Vous êtes co-organisateur" à la promotion, "Votre rôle a changé" à la rétrogradation | Sans email, la feature est invisible côté CO_HOST. Transparence : apprendre la rétrogradation "par accident" est frustrant. Cohérent avec le reste de la plateforme (tous les changements d'état importants déclenchent un email) |
| D20 | Renommer la prop booléenne `isHost` → `isOrganizer` (85 occurrences, 15 fichiers). Conserver `isHostView` (mode de rendu) et la clé i18n `detail.isHost` | Avec CO_HOST, la prop actuelle devient trompeuse (un CO_HOST a les droits de gestion sans être HOST). TypeScript attrape les manquants |
| D21 | **Les inscriptions existantes ne sont jamais impactées** par une promotion ou rétrogradation. Les memberships (rôle) et les registrations (inscription à un événement) vivent indépendamment | Simplicité et prévisibilité : Bob ne voit pas son inscription changer sans action explicite. Cohérent avec la logique actuelle (changer de rôle ne touche pas aux registrations ; seul `leaveCircle` annule les inscriptions futures) |
| D22 | **Seul un membre en statut ACTIVE peut être promu** CO_HOST. Un membre en statut PENDING doit d'abord être approuvé via `approveCircleMembership` | Cohérent avec D17 (un PENDING n'a pas de pouvoirs, promouvoir serait un no-op). Sépare proprement les flows validation / promotion. Évite l'état bizarre d'un CO_HOST PENDING |
| D23 | Sur le profil public `/u/[publicId]`, HOST et CO_HOST affichent **le même badge "Organisateur"** existant. Aucun nouveau badge créé | Prolongement de D8 au profil public : côté visible de tous, un organisateur = un organisateur, pas de distinction propriétaire / co |

---

## Actions réservées au HOST principal

Ces actions ne seront **jamais** accessibles à un CO_HOST :

| Action | Usecase | Raison |
| --- | --- | --- |
| Supprimer la Communauté | `deleteCircle` | Irréversible — seul le propriétaire |
| Promouvoir un membre en CO_HOST | `promoteToCoHost` (nouveau) | Le HOST contrôle qui a des droits |
| Rétrograder un CO_HOST | `demoteFromCoHost` (nouveau) | Le HOST contrôle qui a des droits |
| Retirer un CO_HOST de la Communauté | `removeCircleMember` (modifié) | Le HOST peut retirer un CO_HOST, un CO_HOST ne peut pas |
| Connecter / modifier le compte Stripe Connect | `onboardStripeConnect` | Action financière irréversible — lie un compte bancaire à la Communauté (**D15**) |
| Annuler sa propre inscription à un événement de la Communauté | `cancelRegistration` | Même règle que le HOST — un organisateur (principal ou co) est toujours présent à ses événements (**D16**) |

> **Évolution future (hors MVP)** : `transferOwnership` — le HOST cède la propriété à un CO_HOST ou PLAYER. Cas d'usage rare, reporté. En attendant, le script `pnpm transfer-circle-host:prod` gère les cas exceptionnels manuellement.

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

### Helpers d'autorisation (nouveaux)

```typescript
// domain/models/circle.ts (ou fichier dédié)
export function isOrganizerRole(role: CircleMemberRole): boolean {
  return role === "HOST" || role === "CO_HOST";
}

// Helper principal utilisé dans les usecases — vérifie rôle ET statut ACTIVE (D17)
export function isActiveOrganizer(
  membership: CircleMembership | null
): boolean {
  if (!membership) return false;
  return membership.status === "ACTIVE" && isOrganizerRole(membership.role);
}
```

Ces helpers centralisent le check et évitent de dupliquer la logique dans les 17+ usecases concernés. `isActiveOrganizer` est le helper à privilégier dans les usecases — il encode la règle D17 (seul un membre ACTIVE a des droits d'Organisateur). Quand un futur rôle est ajouté (ex: MODERATOR), un seul endroit à modifier.

> ⚠️ **Ne PAS remplacer mécaniquement tous les `role === "HOST"` par `isActiveOrganizer`.** Deux sémantiques coexistent dans le code — elles doivent rester distinctes :
>
> | Question posée par le check | Helper / pattern à utiliser | Exemples |
> | --- | --- | --- |
> | "A-t-il les droits de gestion ?" | `isActiveOrganizer(membership)` | `createMoment`, `updateCircle`, `approveMomentRegistration`, `broadcastMoment`, etc. |
> | "Est-il le propriétaire ?" (action réservée au HOST) | `membership?.role === "HOST" && membership.status === "ACTIVE"` | `deleteCircle`, `leaveCircle` (guard propriétaire), `promoteToCoHost`, `demoteFromCoHost`, `onboardStripeConnect`, `removeCircleMember` (pour retirer un CO_HOST) |
>
> Lors du refactoring, poser la question à chaque check : "ici on demande les droits de gestion, ou l'identité propriétaire ?" — et choisir le bon helper en conséquence.

### Usecases modifiés — check étendu à CO_HOST

Les usecases suivants changent leur guard de `role !== "HOST"` (± `status === "ACTIVE"`) vers `!isActiveOrganizer(membership)` :

| Usecase | Modification |
| --- | --- |
| `createMoment` | CO_HOST peut créer des événements |
| `updateMoment` | CO_HOST peut éditer des événements |
| `deleteMoment` | CO_HOST peut supprimer des événements |
| `publishMoment` | CO_HOST peut publier des événements |
| `updateCircle` | CO_HOST peut éditer les paramètres de la Communauté |
| `addMomentAttachment` | CO_HOST peut ajouter des pièces jointes à un événement |
| `removeMomentAttachment` | CO_HOST peut retirer des pièces jointes |
| `approveMomentRegistration` | CO_HOST peut approuver des inscriptions |
| `rejectMomentRegistration` | CO_HOST peut rejeter des inscriptions |
| `removeRegistrationByHost` | CO_HOST peut retirer des inscrits |
| `approveCircleMembership` | CO_HOST peut approuver des demandes de membership |
| `rejectCircleMembership` | CO_HOST peut rejeter des demandes de membership |
| `getMomentRegistrations` | CO_HOST peut voir la liste des inscrits |
| `deleteComment` | CO_HOST peut modérer les commentaires |

### Server actions modifiées — check étendu à CO_HOST

Certains checks d'autorisation se font directement dans des server actions, pas dans un usecase. À aligner avec `isActiveOrganizer` :

| Fichier | Modification |
| --- | --- |
| `app/actions/broadcast-moment.ts:59` | CO_HOST peut diffuser un message (D14) |
| `app/actions/circle.ts:365` | Check HOST à étendre à CO_HOST |
| `app/actions/moment.ts:448` | Check HOST dans le flow de suppression à étendre |

> ⚠️ **Préserver l'accès admin-in-host-mode.** Plusieurs server actions (notamment `broadcast-moment.ts`) contournent le check organisateur via `isAdminInHostMode(session)` pour permettre à un admin plateforme d'agir sans être membre. Le pattern à conserver lors du refactoring :
> ```typescript
> if (!(await isAdminInHostMode(session))) {
>   const membership = await prismaCircleRepository.findMembership(circleId, userId);
>   if (!isActiveOrganizer(membership)) {
>     return { success: false, ... };
>   }
> }
> ```
> Lister systématiquement tous les points où `isAdminInHostMode` est utilisé et vérifier qu'ils ne sont pas régressés par le passage à `isActiveOrganizer`.

### Usecases modifiés — logique spécifique

| Usecase | Modification |
| --- | --- |
| `deleteCircle` | **Inchangé** — seul `HOST` peut supprimer |
| `onboardStripeConnect` | **Inchangé** — seul `HOST` peut gérer Stripe Connect (D15) |
| `cancelRegistration` | Le guard `HostCannotCancelRegistrationError` s'étend aux `CO_HOST` (D16) — renommer en `OrganizerCannotCancelRegistrationError` pour refléter l'élargissement |
| `leaveCircle` | Le guard `CannotLeaveAsHostError` ne s'applique qu'au `HOST`. Un `CO_HOST` peut quitter (traité comme un PLAYER pour la mécanique de départ) |
| `removeCircleMember` | Le guard `CannotRemoveHostError` protège les `HOST` ET les `CO_HOST` si l'appelant est un `CO_HOST`. Un `HOST` peut retirer un `CO_HOST`. Un `CO_HOST` ne peut pas retirer un autre `CO_HOST` ni un `HOST` |

### Nouveaux usecases

| Usecase | Description | Appelant |
| --- | --- | --- |
| `promoteToCoHost` | Change le rôle d'un PLAYER en CO_HOST + déclenche l'email de promotion. **Guard D22** : rejette si la cible n'est pas `status === "ACTIVE"` (nouvelle erreur `CannotPromotePendingMemberError`) | HOST uniquement |
| `demoteFromCoHost` | Change le rôle d'un CO_HOST en PLAYER + déclenche l'email de rétrogradation | HOST uniquement |

> `transferOwnership` : **hors MVP** (D18). Voir "Évolutions futures".

### Emails de changement de rôle (D19)

| Événement | Destinataire | Template |
| --- | --- | --- |
| Promotion PLAYER → CO_HOST | Le membre promu | "Vous êtes désormais co-organisateur de [Communauté]" — explique les nouveaux droits (créer / éditer des événements, gérer les inscriptions, diffuser des messages), lien vers le dashboard de la Communauté |
| Rétrogradation CO_HOST → PLAYER | Le membre rétrogradé | "Votre rôle a changé dans [Communauté]" — informe sobrement du changement, reste factuel (pas de justification imposée au HOST), lien vers la page Communauté |

**Fichiers à créer** :
- `src/content/emails/co-host-promoted/*.md` (contenu FR/EN séparé du template, règle `feedback_email_content_separation`)
- `src/content/emails/co-host-demoted/*.md`
- Templates React dans `src/infrastructure/services/email/templates/`
- Méthodes dans `EmailService` : `sendCoHostPromoted()`, `sendCoHostDemoted()`

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

- **Liste des membres** (`circle-members-list.tsx`) : même icône Crown pour HOST et CO_HOST, mais label "Propriétaire" (HOST) vs "Organisateur" (CO_HOST) selon le variant
- **Menu contextuel membre** (`circle-members-list.tsx:135`, `DropdownMenu` existant) : extension du menu actuel (qui ne contient que "Retirer") avec les nouvelles actions :
  - "Promouvoir en co-organisateur" (visible uniquement pour le HOST principal, sur un PLAYER ACTIVE)
  - "Rétrograder en participant" (visible uniquement pour le HOST principal, sur un CO_HOST)
  - "Retirer" (conditionnelle selon D10/D11 — voir tableau ci-dessous)
- **Paramètres de la Communauté** : section "Équipe d'organisation" listant HOST + CO_HOSTs avec actions de gestion

**Matrice des actions disponibles dans le menu contextuel** (dérivée de D10, D11, D22) :

| Appelant | Cible PLAYER | Cible CO_HOST | Cible HOST |
| --- | --- | --- | --- |
| HOST | Promouvoir (si ACTIVE, D22), Retirer | Rétrograder, Retirer (D10) | — (self) |
| CO_HOST | Retirer | — (D11) | — (D11) |
| PLAYER (member-view) | — | — | — |

> La condition d'affichage actuelle `canRemove = variant === "host" && !member.isHost` est à remplacer par une logique tenant compte des 3 rôles et de l'identité de l'appelant (HOST vs CO_HOST).

### Badges dans `circle-members-list.tsx` (D8)

Le composant affiche aujourd'hui un seul badge `Crown` + `t("role.host")` pour `isHost=true`. À faire évoluer :

| Variant du composant | HOST | CO_HOST | PLAYER |
| --- | --- | --- | --- |
| `"host"` (dashboard organisateur) | Crown + "Propriétaire" | Crown + "Organisateur" | — |
| `"member-view"` / `"player"` (vue participant) | Crown + "Organisateur" | Crown + "Organisateur" | — |

Nouvelles clés i18n requises : `Dashboard.role.owner` ("Propriétaire" / "Owner"), `Dashboard.role.coHost` ("Co-organisateur" / "Co-organizer", si besoin d'un libellé interne distinct).

### Page événement (publique)

- **"Organisé par"** : affiche tous les HOST + CO_HOSTs du Circle sans distinction (composant déjà capable de rendre plusieurs organisateurs, cf. `moment-detail-view.tsx`)
- Adaptation de l'appel : `findMembersByRole(circleId, "HOST")` → `findOrganizers(circleId)` (nouvelle méthode, voir section "Changements repository")

### Page événement (dashboard)

- Boutons d'édition, publication, gestion inscrits visibles pour les CO_HOSTs (pas de changement UI — les server actions autorisent déjà en amont, et les composants reçoivent un booléen de droits en prop)
- **Renommage prop `isHost` → `isOrganizer`** (D20) : le sens actuel devient trompeur dès qu'un CO_HOST a les mêmes droits

### Renommage `isHost` → `isOrganizer` (D20)

**Périmètre** : 85 occurrences dans 15 fichiers. 2 clés i18n (`detail.isHost` FR/EN) — **non renommées** (éviter un rename JSON silencieux).

**À renommer** :
- Toutes les props booléennes signifiant "l'utilisateur a les droits de gestion"
- Toutes les variables locales dérivées de cette sémantique (ex: `registrations-list.tsx:134`, `circle-members-list.tsx:39-40`) — avec extension à HOST + CO_HOST

**À ne PAS renommer** :
- `isHostView` dans `moment-detail-view.tsx` : désigne le mode de rendu (dashboard vs public), pas les droits. Reste tel quel
- Les clés i18n `detail.isHost` dans `messages/fr.json` et `messages/en.json` : valeur de la clé mise à jour si besoin, mais nom de clé préservé

**Garde-fous** :
- TypeScript attrape automatiquement les props non renommées (compile error)
- Aucun test ne référence `isHost` aujourd'hui (grep à zéro dans `tests/`)
- Faire le rename dans un **commit séparé** de l'implémentation feature, pour isoler le diff et faciliter la revue

**Impact estimation** : l'étape 8 passe de 2h à 3h pour inclure ce rename.

### Dashboard principal

- Les Communautés où l'utilisateur est CO_HOST apparaissent dans "Mes Communautés" côté Organisateur
- Badge "Organisateur" sur la carte Communauté (identique au HOST pour le CO_HOST, sauf dans la vue détaillée où le HOST voit "Propriétaire")

### Profil public `/u/[publicId]` (D23)

- Les Communautés où l'utilisateur est HOST **ou** CO_HOST affichent le **même badge "Organisateur"** (badge actuel, aucun nouveau badge introduit)
- Aucune distinction entre HOST et CO_HOST dans cette vue (cohérent avec D8 — côté public, un organisateur = un organisateur)
- Les Communautés où l'utilisateur est PLAYER gardent leur affichage actuel (pas de badge ou badge "Membre")

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

**Approche** : utiliser la nouvelle méthode `findOrganizers(circleId)` (voir section "Changements repository").

---

## Changements repository

### Nouvelle méthode dédiée `findOrganizers`

```typescript
// domain/ports/repositories/circle-repository.ts
findOrganizers(circleId: string): Promise<CircleMemberWithUser[]>;
```

Implémentation Prisma : `WHERE circleId = ? AND role IN ('HOST', 'CO_HOST') AND status = 'ACTIVE'`.

Remplace les 10+ appels à `findMembersByRole(circleId, "HOST")` dans les actions, pages et notifications. Plus lisible qu'un paramètre multi-rôle (`findMembersByRoles(circleId, ["HOST", "CO_HOST"])`) et encode la règle D17 (statut ACTIVE) directement dans la signature.

`findMembersByRole` reste présent pour les usages "PLAYERs uniquement" (liste des participants, affichage séparé dans le dashboard).

---

## Changements pages (SSR)

| Page | Fichier | Modification |
| --- | --- | --- |
| Page événement publique | `m/[slug]/page.tsx:123` | `findMembersByRole("HOST")` → `findOrganizers()` |
| Page Communauté publique | `circles/[slug]/page.tsx:134` | Idem |
| Dashboard Communauté | `dashboard/(app)/(main)/circles/[slug]/page.tsx:85` | Idem + gérer l'affichage CO_HOST |
| Dashboard événement | `dashboard/(app)/(main)/circles/[slug]/moments/[momentSlug]/page.tsx:47` | Idem |

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
- Un CO_HOST **ne peut pas** onboarder Stripe Connect (D15)
- Un CO_HOST **ne peut pas** annuler sa propre inscription à un événement de sa Communauté (D16)
- Un membre en statut `PENDING` avec rôle CO_HOST **n'a pas** les droits d'Organisateur (D17)
- Un HOST **ne peut pas** promouvoir un membre `PENDING` (D22 → `CannotPromotePendingMemberError`)
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
| 0 | **Mockups HTML + validation UI** avant d'attaquer le code. À produire : (1) `circle-members-dashboard.mockup.html` — liste membres dashboard avec badges "Propriétaire" / "Organisateur" et menu contextuel (matrice d'actions selon appelant) ; (2) `circle-team-section.mockup.html` — section "Équipe d'organisation" dans les paramètres de la Communauté ; (3) `email-co-host-promoted.mockup.html` et `email-co-host-demoted.mockup.html` — templates emails D19. Validation explicite avant de passer à l'étape 1 | 1h30 mockups + validation |
| 1 | Schema Prisma : ajouter `CO_HOST` à l'enum + push dev/prod | 15 min |
| 2 | Domaine : mettre à jour le type `CircleMemberRole` + créer `isOrganizerRole()` et `isActiveOrganizer()`. Aligner les casts `as "HOST" \| "PLAYER"` dans `prisma-circle-repository.ts` | 30 min |
| 3 | Usecases : adapter les 17+ checks d'autorisation existants + server actions (`broadcast-moment`, `circle`, `moment`). Renommer `HostCannotCancelRegistrationError` → `OrganizerCannotCancelRegistrationError` | 1h30 |
| 4 | Usecases : créer `promoteToCoHost`, `demoteFromCoHost` + emails de promotion/rétrogradation (contenu `.md` + templates React + méthodes `EmailService`) | 2h |
| 5 | Repository : ajouter `findOrganizers()` (port + adapter Prisma) + mettre à jour le tri membres (HOST > CO_HOST > PLAYER) | 45 min |
| 6 | Pages SSR + server actions : remplacer `findMembersByRole("HOST")` par `findOrganizers()` | 1h |
| 7 | Notifications : adapter les 7 fichiers qui notifient les HOSTs | 30 min |
| 8 | UI dashboard : actions promotion/rétrogradation dans la liste des membres + rename prop `isHost` → `isOrganizer` (D20) en commit séparé | 3h |
| 9 | UI badges : badge unique "Organisateur" côté public, "Propriétaire" vs "Organisateur" dans le dashboard | 30 min |
| 10 | Tests unitaires : adapter les tests existants + nouveaux cas CO_HOST | 2h |
| 11 | Tests sécurité RBAC | 1h |
| 12 | Tests E2E | 1h30 |
| 13 | i18n : clés FR/EN pour co-organisateur, badges, actions, notifications | 1h |
| 14 | Page Aide : section dédiée "Co-organisateurs" (`messages/fr.json` + `messages/en.json`, clé `Help`) — expliquer le rôle, les droits, les limites, la promotion/rétrogradation | 30 min |

**Total estimé : \~2-3 jours**

---

## Fichiers clés (existants, à modifier)

| Fichier | Rôle |
| --- | --- |
| `prisma/schema.prisma` | Enum `CircleMemberRole` |
| `src/domain/models/circle.ts` | Type `CircleMemberRole` + helpers `isOrganizerRole` / `isActiveOrganizer` |
| `src/domain/usecases/*.ts` | 17+ usecases avec check HOST (liste dans les tableaux ci-dessus) |
| `src/domain/usecases/add-moment-attachment.ts`, `remove-moment-attachment.ts` | Checks HOST à étendre |
| `src/domain/usecases/cancel-registration.ts` | Renommer l'erreur + étendre à CO_HOST |
| `src/domain/usecases/onboard-stripe-connect.ts` | **Inchangé** (D15) — vérifier uniformité du check |
| `src/domain/ports/repositories/circle-repository.ts` | Port — ajouter `findOrganizers()` |
| `src/infrastructure/repositories/prisma-circle-repository.ts` | Adapter — implémenter `findOrganizers()` + aligner casts TS + tri des membres |
| `src/app/actions/registration.ts` | Notifications inscriptions → organisateurs |
| `src/app/actions/comment.ts` | Notifications commentaires → organisateurs |
| `src/app/actions/circle.ts` | Notifications membres + check autorisation (ligne 365) |
| `src/app/actions/moment.ts` | Notifications publication + check autorisation (ligne 448) |
| `src/app/actions/broadcast-moment.ts` | Check autorisation à étendre à CO_HOST (D14) |
| `src/app/actions/stripe.ts` | **Inchangé** — vérifier que les checks restent `HOST` (D15) |
| `src/app/actions/notify-host-new-circle-member.ts` | Notifications nouveau membre → organisateurs |
| `src/app/[locale]/(routes)/m/[slug]/page.tsx` | Page événement — `hosts` |
| `src/app/[locale]/(routes)/circles/[slug]/page.tsx` | Page Communauté — `hosts` |
| `src/components/moments/moment-detail-view.tsx` | Affichage "Organisé par" |
| `src/components/circles/circle-members-list.tsx` | Badges rôle + extension du menu contextuel (`DropdownMenu` existant) avec Promouvoir / Rétrograder / matrice d'actions selon appelant |
| `src/components/circles/dashboard-circle-card.tsx` | Badge Organisateur/Co-organisateur |

---

## Évolutions futures (hors scope)

- **Transfert de propriété** (`transferOwnership`) : le HOST cède la propriété à un CO_HOST ou PLAYER
- **Co-organisateurs par événement** : droits granulaires par événement sans être co-organisateur de la Communauté
- **Rôle MODERATOR** : droits intermédiaires (modération commentaires, check-in, sans édition événement)
- **Permissions granulaires** : matrice de permissions par rôle (quelles actions chaque rôle peut faire)
- **Notifications configurables** : chaque co-organisateur choisit quelles notifications il reçoit
