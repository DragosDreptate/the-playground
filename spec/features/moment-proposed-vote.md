# Spec — Statut "Proposé" et vote Communauté sur un événement

## Contexte et motivation

Aujourd'hui un Organisateur crée un événement en `DRAFT` (visible de lui seul) ou `PUBLISHED` (visible de tous, notification à la Communauté). Entre les deux, aucun moyen de recueillir un retour informel de la Communauté sur le lieu, la date ou le format avant d'engager la publication.

Certains Organisateurs veulent tester l'idée auprès de leurs Membres avant de publier : "Est-ce que ce lieu vous va ? Cette date est-elle bonne ?". Ils ont besoin d'un signal rapide, non engageant, pour ajuster ou confirmer.

**Principe directeur** : introduire un statut optionnel `PROPOSED` entre `DRAFT` et `PUBLISHED`, visible uniquement des Membres `ACTIVE` de la Communauté. Les Membres votent parmi trois options (`pour`, `contre`, `peut-être`). Le vote est purement consultatif, il guide l'Organisateur mais ne décide rien automatiquement.

### Positionnement

- **Cohérent avec le positionnement community-centric** : la Communauté participe à la programmation, elle ne reçoit pas seulement.
- **Friction zéro** : feature optionnelle, l'Organisateur qui veut publier directement peut continuer comme avant.
- **Simple à modéliser** : aucune interaction avec les inscriptions, les paiements, ou la capacité. Le vote vit en parallèle.
- **MVP minimaliste** : trois options, vote anonyme affiché en agrégé, pas de seuil, pas de durée max.

---

## Décisions de design

| # | Décision |
| --- | --- |
| D1 | `PROPOSED` est un statut optionnel. À la création, l'Organisateur choisit parmi `DRAFT` / `PROPOSED` / `PUBLISHED`. Depuis un `DRAFT` existant, il peut transiter vers `PROPOSED` ou `PUBLISHED`. La **UX de la transition `DRAFT → PROPOSED` depuis l'édition** (bouton dédié sur la page du DRAFT, option dans un menu d'actions, etc.) est **à cadrer lors de la phase mockup**, hors scope de cette version de la spec. Côté domain, l'usecase `propose-moment.ts` existe et attend d'être branché à l'UI finale. |
| D2 | Le vote est **consultatif**. Aucun seuil, aucun auto-publish. Seul un `HOST` de la Communauté décide de passer en `PUBLISHED` (cf. règles multi-Organisateurs). |
| D3 | Trois options de vote : `FOR` / `AGAINST` / `MAYBE`. |
| D4 | Affichage **anonyme** (totaux agrégés uniquement). Stockage nominatif en base (`userId`) pour empêcher les votes multiples. |
| D5 | Aucune durée max. Le vote reste ouvert tant que le Moment est en statut `PROPOSED`. |
| D6 | **Invalidation automatique** des votes uniquement si l'Organisateur modifie `startsAt`, `endsAt`, ou `location`. Les autres modifications (titre, description, cover, capacité, pièces jointes) préservent les votes. Aucun email envoyé aux Membres lors de l'invalidation (reset silencieux). |
| D7 | **Réinitialisation manuelle** des votes toujours disponible pour l'Organisateur via un bouton dédié. Aucun email envoyé aux Membres (reset silencieux, aligné avec D6). |
| D8 | **Aucune inscription** pendant `PROPOSED`. Les Membres votent uniquement. Les inscriptions suivent le parcours existant après publication. |
| D9 | **Événements payants** (`price > 0`) **bloqués** en statut `PROPOSED` pour le MVP. L'option `PROPOSED` est désactivée à la création si payant. |
| D10 | Le fil de commentaires du Moment est partagé entre `PROPOSED` et `PUBLISHED`. À la publication, les commentaires postés pendant `PROPOSED` sont **archivés** (flag `archivedAt`), plus affichés dans le fil principal, consultables via un bouton dédié "Commentaires archivés". Tous les commentaires `archivedAt IS NULL` du Moment sont marqués archivés indifféremment de leur statut d'origine ; un `DRAFT` n'a théoriquement pas de commentaires (page non accessible publiquement), pas de guard supplémentaire nécessaire. |
| D11 | **Tout `HOST` de la Communauté** ne peut pas voter sur un événement de sa Communauté, y compris les co-Organisateurs qui ne sont pas l'auteur du Moment. La règle s'applique à la Communauté entière, pas seulement au créateur. |
| D12 | Les Membres `PENDING` de la Communauté ne peuvent pas voter. Seuls les Membres `ACTIVE` (role `PLAYER`) peuvent. |
| D13 | Un Membre peut **changer son vote** tant que le Moment est en `PROPOSED` et que les votes n'ont pas été invalidés. |
| D14 | Visibilité `PROPOSED` **réservée aux Membres `ACTIVE`** de la Communauté. Exclus : Explorer, sitemap, OG image dédiée, robots, visiteurs publics non-Membres. |
| D15 | Notification au passage en `PROPOSED` : email dédié aux Membres `ACTIVE` de la Communauté, respect de l'opt-out `notifyNewMomentInCircle`. |
| D16 | Si `startsAt` est dépassé sans publication, **aucune transition automatique**. Le Moment reste en `PROPOSED`. Le dashboard Organisateur matérialise cet état par un badge spécifique "Proposition expirée" (distinct du badge `Proposé` standard) pour alerter l'Organisateur. Il agit manuellement (publier, modifier, annuler). |
| D17 | Archives des commentaires accessibles aux Membres `ACTIVE` de la Communauté + Organisateurs. Invités externes (lien public après publication) n'y ont pas accès. |
| D18 | Transitions autorisées : `DRAFT → PROPOSED`, `DRAFT → PUBLISHED`, `PROPOSED → PUBLISHED`, `PROPOSED → CANCELLED`, `PUBLISHED → CANCELLED`. **Pas de transition `PROPOSED → DRAFT`** : `DRAFT` et `PROPOSED` sont deux statuts initiaux équivalents pour l'Organisateur, qui choisit à la création. Depuis `PROPOSED`, seules les sorties `PUBLISHED` ou `CANCELLED` sont possibles. Depuis `PUBLISHED`, seule l'annulation (`CANCELLED`) est possible. |
| D19 | **Rétention des votes et commentaires archivés** : pas de purge automatique. Les votes vivent tant que le Moment `PROPOSED` vit. Suppression effective dans 3 cas seulement : annulation de la proposition (`PROPOSED → CANCELLED`), publication (`PROPOSED → PUBLISHED`, les votes ne sont plus utiles), suppression en cascade (User supprimé, Circle supprimé, Moment supprimé). Les commentaires archivés vivent tant que le Moment publié vit. Cohérent RGPD : la suppression de compte user efface ses votes via cascade Prisma. |

---

## Changements au schéma Prisma

### Enum `MomentStatus`

```prisma
enum MomentStatus {
  DRAFT
  PROPOSED    // NOUVEAU
  PUBLISHED
  CANCELLED
  PAST
}
```

### Nouvelle table `MomentVote`

```prisma
enum MomentVoteChoice {
  FOR
  AGAINST
  MAYBE
}

model MomentVote {
  id        String            @id @default(cuid())
  momentId  String
  userId    String
  choice    MomentVoteChoice
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  moment    Moment            @relation(fields: [momentId], references: [id], onDelete: Cascade)
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([momentId, userId])
  @@index([momentId, choice])
}
```

### Champ `archivedAt` sur `MomentComment`

```prisma
model MomentComment {
  // ... champs existants ...
  archivedAt DateTime?  // NOUVEAU — null = actif dans le fil, non-null = archivé à la publication
}
```

### Champ `publishedAt` sur `Moment`

```prisma
model Moment {
  // ... champs existants ...
  publishedAt DateTime?  // NOUVEAU — renseigné à la transition vers PUBLISHED, null pour DRAFT / PROPOSED / CANCELLED
}
```

Motivation : tracer la date de publication pour distinguer les Moments issus d'un `PROPOSED` (avec commentaires archivés) des Moments publiés directement. Utilisé côté UI pour afficher conditionnellement le bouton "Commentaires archivés" uniquement sur les Moments dont on sait qu'ils ont eu une phase `PROPOSED` avec commentaires.

### Relation inverse sur `Moment` et `User`

```prisma
model Moment {
  // ... champs existants ...
  votes MomentVote[]
}

model User {
  // ... champs existants ...
  momentVotes MomentVote[]
}
```

### Index

- `MomentVote` : `@@unique([momentId, userId])` + `@@index([momentId, choice])` pour les totaux agrégés.
- `MomentComment` : l'index existant suffit. Le filtre `archivedAt IS NULL` est suffisamment sélectif.

### Cascade et intégrité référentielle

Toutes les FK de `MomentVote` utilisent `onDelete: Cascade` (voir la définition de la table plus haut : `moment` et `user`). Conséquences :

- Suppression d'un `User` → ses `MomentVote` disparaissent. Cohérent RGPD.
- Suppression d'un `Moment` → ses `MomentVote` disparaissent.
- Suppression d'un `Circle` → cascade existante vers `Moment`, qui propage aux `MomentVote`.

Aucun vote orphelin possible. Les commentaires (`MomentComment`, incluant ceux avec `archivedAt` non-null) suivent la cascade déjà en place dans le schéma actuel. Rien à ajouter de ce côté.

---

## Changements domaine

### 1. Models (`src/domain/models/`)

**`moment.ts`** :

```typescript
export type MomentStatus = "DRAFT" | "PROPOSED" | "PUBLISHED" | "CANCELLED" | "PAST";
```

**Nouveau fichier `moment-vote.ts`** :

```typescript
export type MomentVoteChoice = "FOR" | "AGAINST" | "MAYBE";

export type MomentVote = {
  id: string;
  momentId: string;
  userId: string;
  choice: MomentVoteChoice;
  createdAt: Date;
  updatedAt: Date;
};

export type MomentVoteTally = {
  for: number;
  against: number;
  maybe: number;
  total: number;
};
```

**`moment-comment.ts`** :

```typescript
export type MomentComment = {
  // ... champs existants ...
  archivedAt: Date | null;  // NOUVEAU
};
```

### 2. Ports (`src/domain/ports/repositories/`)

**Nouveau port `moment-vote-repository.ts`** :

```typescript
export interface MomentVoteRepository {
  upsert(momentId: string, userId: string, choice: MomentVoteChoice): Promise<MomentVote>;
  findByMomentAndUser(momentId: string, userId: string): Promise<MomentVote | null>;
  countByMoment(momentId: string): Promise<MomentVoteTally>;
  deleteAllByMoment(momentId: string): Promise<void>;
}
```

**`moment-comment-repository.ts`** (étendu) :

```typescript
export interface MomentCommentRepository {
  // ... méthodes existantes ...

  // Les méthodes existantes (findByMomentId, etc.) doivent filtrer archivedAt IS NULL par défaut
  findByMomentId(momentId: string, options?: { includeArchived?: boolean }): Promise<MomentComment[]>;
  findArchivedByMomentId(momentId: string): Promise<MomentComment[]>;
  archiveAllByMomentId(momentId: string): Promise<void>;
}
```

### 3. Errors (`src/domain/errors/`)

```typescript
export class PaidMomentCannotBeProposedError extends DomainError {}
export class HostCannotVoteOnOwnCircleMomentError extends DomainError {}
export class MembershipRequiredToVoteError extends DomainError {}
export class MomentNotProposedError extends DomainError {}
export class MomentAlreadyProposedError extends DomainError {}
export class MomentStatusTransitionNotAllowedViaUpdateError extends DomainError {}
export class InvalidMomentStatusTransitionError extends DomainError {}
```

### 4. Nouveaux usecases (`src/domain/usecases/`)

#### `propose-moment.ts`

```
Entrée  : { momentId, userId }
Logique :
  1. Charger le Moment → 404 si inexistant
  2. Vérifier que userId est HOST du Circle → 403 sinon
  3. Vérifier status = DRAFT → MomentAlreadyProposedError si PROPOSED, MomentAlreadyPublishedError si PUBLISHED, etc.
  4. Vérifier price = 0 (gratuit) → PaidMomentCannotBeProposedError sinon
  5. updateMomentStatus(momentId, "PROPOSED")
  6. Déclencher l'envoi des emails "moment-proposed-notification" aux Membres ACTIVE (fire-and-forget, via server action)
Sortie  : Moment (status = PROPOSED)
```

#### `vote-moment.ts`

```
Entrée  : { momentId, userId, choice }
Logique :
  1. Charger le Moment → 404 si inexistant
  2. Vérifier status = PROPOSED → MomentNotProposedError sinon
  3. Vérifier que userId n'est PAS HOST du Circle → HostCannotVoteOnOwnCircleMomentError
  4. Vérifier que userId est membre ACTIVE du Circle (PLAYER, status ACTIVE) → MembershipRequiredToVoteError sinon
  5. voteRepository.upsert(momentId, userId, choice)
Sortie  : MomentVote
```

#### `reset-moment-votes.ts`

```
Entrée  : { momentId, userId }
Logique :
  1. Charger le Moment → 404 si inexistant
  2. Vérifier que userId est HOST du Circle → 403 sinon
  3. Vérifier status = PROPOSED → MomentNotProposedError sinon
  4. voteRepository.deleteAllByMoment(momentId)
Sortie  : void
```

> Cet usecase est appelé dans deux contextes : manuellement par l'Organisateur (bouton "Réinitialiser les votes"), et automatiquement par `updateMoment` si `startsAt` / `endsAt` / `location` changent.

#### `publish-proposed-moment.ts`

> **Pourquoi un usecase dédié plutôt qu'une extension de `publish-moment.ts`** : publier un `DRAFT` et publier un `PROPOSED` sont deux intentions métier distinctes (side-effects différents : archivage des commentaires et reset des votes uniquement depuis `PROPOSED`). Garder les deux usecases séparés respecte la règle "un usecase = une intention", simplifie les tests unitaires (pas de branches conditionnelles à mocker), et est aligné avec le style du codebase qui évite les usecases polymorphes.

```
Entrée  : { momentId, userId }
Logique :
  1. Charger le Moment → 404 si inexistant
  2. Vérifier que userId est HOST du Circle → 403 sinon
  3. Vérifier status = PROPOSED → MomentNotProposedError sinon
  4. Dans une transaction :
     a. updateMomentStatus(momentId, "PUBLISHED") + publishedAt = now
     b. commentRepository.archiveAllByMomentId(momentId) (archivedAt = now)
     c. voteRepository.deleteAllByMoment(momentId) (nettoyage, les votes ne servent plus après publication)
  5. Déclencher l'envoi des emails "new-moment-notification" aux Membres ACTIVE (comportement actuel de publication)
Sortie  : Moment (status = PUBLISHED)
```


#### `get-moment-vote-tally.ts`

```
Entrée  : { momentId }
Logique :
  1. voteRepository.countByMoment(momentId)
Sortie  : MomentVoteTally { for, against, maybe, total }
```

#### `get-user-vote-for-moment.ts`

```
Entrée  : { momentId, userId }
Logique :
  1. voteRepository.findByMomentAndUser(momentId, userId)
Sortie  : MomentVote | null
```

### 5. Usecases existants à modifier

#### `create-moment.ts`

- Accepter `status: "DRAFT" | "PROPOSED" | "PUBLISHED"` en entrée (défaut `DRAFT` pour rétro-compatibilité).
- Guard : si `status = PROPOSED` et `price > 0` → `PaidMomentCannotBeProposedError`.
- Si `status = PROPOSED`, déclencher l'envoi des emails "moment-proposed-notification" après création.
- Si `status = PUBLISHED`, conserver le comportement actuel (emails `new-moment-notification`).

#### `update-moment.ts`

- Si le Moment est en `PROPOSED` et que l'un des champs `startsAt`, `endsAt`, `location` change : appeler `reset-moment-votes` dans la même transaction.
- Guard : si `status = PROPOSED` et tentative de passer `price > 0` → `PaidMomentCannotBeProposedError` (impossible de rendre payant un `PROPOSED`).
- Guard : si le Moment est en `PUBLISHED` ou `PAST`, pas de reset des votes (inchangé, ils sont déjà nettoyés).

**Transitions de statut via `update-moment`** :

| Transition | Via `update-moment` ? | Side-effect |
| --- | --- | --- |
| `DRAFT → CANCELLED` | Oui | Inchangé (comportement actuel) |
| `PROPOSED → CANCELLED` | Oui | `voteRepository.deleteAllByMoment(momentId)` dans la même transaction. Pas d'email. |
| `PUBLISHED → CANCELLED` | Oui | Inchangé (refunds Stripe si applicable, emails aux inscrits) |
| `DRAFT → PROPOSED` | **Non** | Refuser avec `MomentStatusTransitionNotAllowedViaUpdateError`. Passer par `propose-moment.ts` (usecase dédié, pattern cohérent avec `publish-moment` et `publish-proposed-moment`). |
| `DRAFT → PUBLISHED` | **Non** | Refuser avec `MomentStatusTransitionNotAllowedViaUpdateError`. Passer par `publish-moment.ts`. |
| `PROPOSED → PUBLISHED` | **Non** | Refuser avec `MomentStatusTransitionNotAllowedViaUpdateError`. Passer par `publish-proposed-moment.ts`. |
| `PROPOSED → DRAFT` | **Non** | Transition illégale (D18). Refuser avec `InvalidMomentStatusTransitionError`. |
| `PUBLISHED → *` (autre que `CANCELLED`) | **Non** | Transition illégale. Refuser avec `InvalidMomentStatusTransitionError`. |
| `PAST → *` | **Non** | Transition illégale. Refuser avec `InvalidMomentStatusTransitionError`. |
| `CANCELLED → *` | **Non** | Transition illégale. Refuser avec `InvalidMomentStatusTransitionError`. |

Note : il n'existe pas d'usecase `cancel-moment.ts` dédié ; les annulations transitent par `update-moment.ts` (cohérent avec le code actuel).

Deux nouvelles erreurs à ajouter dans la section 3 : `MomentStatusTransitionNotAllowedViaUpdateError` (transition existante mais chemin inapproprié, avec indication du usecase à utiliser) et `InvalidMomentStatusTransitionError` (transition illégale quel que soit le chemin).

#### `publish-moment.ts` (existant)

- Conserver pour la transition `DRAFT → PUBLISHED` (direct).
- Ajouter `publishedAt = now` à la transition.
- **Ne gère PAS** la transition `PROPOSED → PUBLISHED` (c'est `publish-proposed-moment.ts` qui s'en charge, car logique différente : archivage commentaires, nettoyage votes).

### 6. Autorisations de lecture

- **Lecture d'un Moment `PROPOSED`** : seuls les Membres `ACTIVE` du Circle + les `HOST` du Circle peuvent accéder à la page `/m/[slug]`. Les autres reçoivent un 404.
- **Lecture des votes** (totaux agrégés) : même règle que lecture du Moment.
- **Lecture du vote individuel d'un user** : seulement pour l'user lui-même (`getUserVoteForMoment`).
- **Lecture des commentaires archivés** : Membres `ACTIVE` + `HOST` uniquement.

---

## Flux complets par scénario

### Scénario 1 — Organisateur propose un événement, vote positif, publication

```
Organisateur → /dashboard/moments/new
  → Formulaire : remplit titre, date, lieu, description
  → Choix du statut : [DRAFT] [PROPOSED] [PUBLISHED]
  → Sélectionne PROPOSED, soumet

createMoment({ ..., status: "PROPOSED" })
  → Moment créé en PROPOSED
  → Email "moment-proposed-notification" envoyé aux Membres ACTIVE (respect opt-out)

Membre A → reçoit email, clique sur le lien
  → Page /m/[slug] en vue PROPOSED
  → Bloc vote : [Pour] [Contre] [Peut-être]
  → Clique "Pour"
  → voteMoment({ choice: "FOR" })
  → Affichage mis à jour : "1 vote pour, 0 contre, 0 peut-être"

Membre B → vote "Peut-être" (idem)
Membre C → vote "Pour" (idem)

Organisateur → /m/[slug] en vue Organisateur
  → Voit les totaux : "2 pour, 0 contre, 1 peut-être"
  → Juge le signal positif
  → Clique "Publier"

publishProposedMoment(momentId, hostUserId)
  → Moment passe en PUBLISHED, publishedAt = now
  → Commentaires archivés (archivedAt = now)
  → Votes supprimés
  → Email "new-moment-notification" envoyé aux Membres ACTIVE

Page /m/[slug] devient la page événement publique standard.
Bouton "Commentaires archivés" visible pour Membres + Organisateur.
```

### Scénario 2 — Modification qui invalide les votes

```
Moment en PROPOSED, 5 votes déjà reçus.

Organisateur → /dashboard/moments/[slug]/edit
  → Change la date (startsAt)
  → Confirmation bloquante : "Modifier la date effacera les 5 votes reçus. Continuer ?"
  → Confirme

updateMoment({ startsAt: newDate })
  → Transaction :
    a. moment.startsAt = newDate
    b. resetMomentVotes(momentId)
  → Tous les votes supprimés

Membres qui avaient voté → reviennent sur la page
  → Voient les totaux à zéro, bloc vote actif à nouveau
  → (Pas de notification individuelle envoyée)
```

### Scénario 3 — Modification mineure sans invalidation

```
Moment en PROPOSED, 5 votes déjà reçus.

Organisateur → modifie la description (correction d'une coquille)
  → Aucune confirmation bloquante (champ mineur)
  → Votes conservés

updateMoment({ description: newDescription })
  → Moment mis à jour, votes inchangés
```

### Scénario 4 — Réinitialisation manuelle

```
Moment en PROPOSED, 3 votes reçus.

Organisateur → vue PROPOSED de /m/[slug]
  → Voit bouton "Réinitialiser les votes"
  → Clique
  → Confirmation bloquante : "Effacer les 3 votes reçus ?"
  → Confirme

resetMomentVotes(momentId, hostUserId)
  → Votes supprimés
  → Les Membres peuvent revoter
```

### Scénario 5 — Annulation depuis `PROPOSED`

```
Organisateur juge le signal insuffisant, ne veut pas publier l'événement.

→ Vue PROPOSED → bouton "Annuler la proposition"
  → Confirmation bloquante : "Annuler cette proposition ? Les X votes reçus seront effacés."
  → Confirme

updateMoment({ momentId, status: "CANCELLED" })
  → moment.status = CANCELLED
  → voteRepository.deleteAllByMoment(momentId)
  → Pas de notification aux Membres (personne n'était inscrit ; le Moment disparaît de leur vue)
```

> Depuis `PROPOSED`, la seule sortie alternative à la publication est l'annulation. Il n'existe pas de transition `PROPOSED → DRAFT` : `DRAFT` et `PROPOSED` sont des choix initiaux équivalents.

### Scénario 6 — Tentative de vote non autorisée

```
Visiteur public (non-membre) → URL /m/[slug] d'un Moment PROPOSED
  → 404 (pas d'accès)

Membre PENDING du Circle → URL /m/[slug]
  → 404 (pas d'accès)

Organisateur du Circle (HOST) → tente de voter via l'API
  → HostCannotVoteOnOwnCircleMomentError → 403
```

---

## Emails et notifications

### Nouveaux emails

| Déclencheur | Template | Destinataire | Données |
| --- | --- | --- | --- |
| Passage d'un Moment en `PROPOSED` | `moment-proposed-notification` | Membres `ACTIVE` (PLAYER, opt-in `notifyNewMomentInCircle`) | Organisateur name, moment title, date, lieu, description (truncated), lien `/m/[slug]` |

### Template `moment-proposed-notification`

Contenu (FR) :
- Sujet : "Nouvelle proposition d'événement dans [Circle name]"
- Corps : "[Organisateur name] propose [titre] le [date] à [lieu]. Qu'en penses-tu ? Donne ton avis en votant pour, contre ou peut-être."
- CTA : "Voter maintenant" → `/m/[slug]`
- Pied : pied d'email standard + lien désinscription (même opt-out que les emails de nouveaux Moments, `notifyNewMomentInCircle`).

### Emails inchangés

- `new-moment-notification` : envoyé à la publication (que le Moment soit issu de `DRAFT` ou `PROPOSED`).
- `host-moment-created` : envoyé uniquement à la publication, pas à la création en `PROPOSED`.

### Architecture conforme

Templates React dans `src/infrastructure/services/email/templates/`. L'email `moment-proposed-notification` est un email **transactionnel de notification** : il suit le pattern des templates existants du même type (`new-moment-notification`, `host-moment-created`, etc.), contenu directement dans le JSX, sans fichier `.content.ts` séparé. La règle de séparation contenu / template concerne uniquement les emails marketing et onboarding récurrents amenés à évoluer dans le temps, pas les notifications transactionnelles.

---

## Changements UI/UX

### Formulaire de création d'événement

Section statut, nouveau sélecteur trois options **uniquement à la création** :

```
Statut à la création :
  ( ) Brouillon, visible de toi seul
  ( ) Proposition, soumis au vote de ta Communauté avant publication
  (•) Publié, visible et ouvert aux inscriptions immédiatement
```

- Option "Proposition" **désactivée** (avec tooltip) si `price > 0` : "Les propositions ne sont disponibles que pour les événements gratuits."
- Option "Proposition" disponible même si la Communauté n'a aucun Membre `ACTIVE` autre que l'Organisateur. Aucun guard côté serveur sur ce point (cas accepté).

### Formulaire d'édition d'événement

**Pas de combobox de statut en édition**. Les transitions depuis un statut existant ont des side-effects spécifiques (archivage commentaires, reset votes, envoi d'emails, refunds Stripe) et doivent passer par des boutons d'action dédiés ou par des usecases ciblés, pas par un simple change d'enum.

Pour un Moment en `PROPOSED`, les boutons d'action contextuels sont documentés dans la section "Page `/m/[slug]` en statut `PROPOSED`" (Publier, Réinitialiser les votes, Annuler la proposition).

Pour les autres statuts (`DRAFT`, `PUBLISHED`), la refonte complète du combobox d'édition actuel vers des boutons d'action contextuels est **hors scope de cette spec**. Voir l'entrée **#011** dans le BACKLOG. Dans le cadre de cette PR, s'assurer simplement que :
- L'option `PROPOSED` ne figure **pas** dans le combobox d'édition existant (seulement à la création).
- Le combobox d'édition actuel conserve son comportement actuel pour `DRAFT` / `PUBLISHED` / `CANCELLED`.

> **Point UX ouvert** : la transition `DRAFT → PROPOSED` depuis l'édition d'un DRAFT existant (bouton "Proposer au vote" sur la vue DRAFT, ou option dans un menu) est **à cadrer lors de la phase mockup**, hors scope de cette version. L'usecase `propose-moment.ts` existe côté domain et sera branché à l'UI finale à ce moment-là.

### Page `/m/[slug]` en statut `PROPOSED`

**Vue Membre (PLAYER ACTIVE) :**

```
┌─────────────────────────────────────────────────┐
│ [COVER]                                         │
│                                                 │
│ Titre de l'événement                            │
│ 📅 Date et heure · 📍 Lieu                      │
│ Proposé par [Organisateur name]                 │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐ │
│  │ Cet événement est une proposition.        │ │
│  │ [Organisateur name] attend ton avis.      │ │
│  │                                           │ │
│  │ [Pour]  [Contre]  [Peut-être]             │ │
│  │                                           │ │
│  │ 3 pour · 1 contre · 2 peut-être           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Description                                    │
│  [texte de description]                         │
│                                                 │
│  Discussion                                     │
│  [fil de commentaires actif]                    │
└─────────────────────────────────────────────────┘
```

- Après vote : bouton du choix sélectionné en état actif, deux autres disponibles pour changer d'avis.
- Texte sous les boutons : "Tu peux changer d'avis tant que l'événement est en proposition."
- Totaux mis à jour en temps réel (server action + revalidation).

**Vue Organisateur :**

```
┌─────────────────────────────────────────────────┐
│ [HEADER identique]                              │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐ │
│  │ Résultats du vote (en direct)             │ │
│  │                                           │ │
│  │ Pour       ████████░░  3                  │ │
│  │ Peut-être  █████░░░░░  2                  │ │
│  │ Contre     ██░░░░░░░░  1                  │ │
│  │                                           │ │
│  │ 6 Membres ont voté sur 12                 │ │
│  │                                           │ │
│  │ [Publier l'événement]                     │ │
│  │ [Réinitialiser les votes]                 │ │
│  │ [Annuler la proposition]                  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Description                                    │
│  [texte de description]                         │
│                                                 │
│  Discussion                                     │
│  [fil de commentaires actif]                    │
└─────────────────────────────────────────────────┘
```

- Bouton "Publier l'événement" : confirmation bloquante "X commentaires seront archivés. Publier maintenant ?". **Pas de seuil minimal de votes requis**, la publication est toujours autorisée (y compris avec 0 vote ou aucun Membre dans la Communauté).
- Bouton "Réinitialiser les votes" : confirmation bloquante "Effacer les X votes reçus ?" (disabled si 0 vote)
- Bouton "Annuler la proposition" : confirmation bloquante "Annuler cette proposition ? Les X votes reçus seront effacés." (variante destructive, `variant="destructive"`)

**Multi-Organisateurs** : si la Communauté a plusieurs `HOST` (cf. feature future Co-Organisateurs, BACKLOG #006), tous voient la même vue Organisateur et peuvent tous agir sur les 3 boutons. Pas de verrouillage pessimiste. **Premier qui agit gagne** : si un second HOST tente une action alors que le statut a déjà changé (ex. tentative de publier un Moment déjà publié par un autre HOST), le usecase serveur renvoie l'erreur correspondante (`MomentNotProposedError`), traduite côté UI par un message explicite ("Cet événement a déjà été publié par un autre Organisateur") et un rechargement de la page.

### Page `/m/[slug]` en statut `PUBLISHED` issu d'un `PROPOSED`

Si `MomentComment` archivés existent, ajouter un bouton discret sous le fil de commentaires actif :

```
  Discussion
  [commentaires actifs]

  [Écrire un commentaire]

  ───────────────────────────────────────
  [Voir les commentaires archivés (X)]
```

Click → ouvre un panneau (ou modale) en lecture seule affichant les commentaires archivés triés par date, avec un bandeau : "Ces commentaires ont été postés pendant la phase de proposition."

**Visibilité conditionnelle du bouton** (rendu côté serveur, RSC) :
- Visiteur non authentifié : bouton non affiché.
- Utilisateur authentifié non-Membre du Circle : bouton non affiché.
- Membre `ACTIVE` du Circle (PLAYER ou HOST) : bouton affiché.

La même URL `/m/[slug]` a donc deux rendus possibles selon le visiteur. Le check d'autorisation est effectué **côté serveur** (pas seulement côté client). Toute tentative d'accès direct à la route API ou à la modale par un utilisateur non autorisé renvoie **403**.

### Dashboard Organisateur

- Onglet "À venir" : les Moments `PROPOSED` apparaissent **mêlés** aux autres événements à venir, distingués par un badge `Proposé` (variant `outline`) à côté du titre. Ils sont triés avec les autres par `startsAt` (champ obligatoire, donc toujours renseigné).
- **Badge `Proposition expirée`** (variant `destructive` ou similaire) : si `startsAt < now` et `status = PROPOSED` (cf. D16), le badge standard `Proposé` est remplacé par `Proposition expirée` pour signaler visuellement que le Moment nécessite une action (publier, modifier, annuler).
- **Compteur "à venir"** : inclut les `PROPOSED` (ils ont une date confirmée, cohérent avec la sémantique de la liste). Les `Proposition expirée` restent dans la liste "À venir" pour rester visibles, mais sont triés en tête pour forcer l'attention.
- CTA sur la carte : "Voir les votes" → vue PROPOSED (au lieu du CTA standard d'un `PUBLISHED`).

### Commentaires pendant `PROPOSED`

Sous le champ de saisie du commentaire, texte d'avertissement :

```
Ces commentaires seront archivés à la publication et ne seront plus visibles dans le fil principal.
```

### Avertissements UX supplémentaires

- Avant `updateMoment` qui touche `startsAt` / `endsAt` / `location` : AlertDialog "Modifier la date effacera les X votes reçus. Continuer ?" (affichée seulement si votes > 0).
- Pas d'avertissement si aucun vote n'a été reçu (pas de friction inutile).

### Admin plateforme

Le dashboard admin prend en compte le nouveau statut `PROPOSED` au même titre que les autres :

- **Liste des événements** (`/admin/moments`) : les `PROPOSED` s'affichent dans la liste globale avec un badge `Proposé` visible.
- **Filtres et tris** : si un filtre par statut existe, ajouter `PROPOSED` aux valeurs possibles.
- **Stats et courbes d'activité** : les `PROPOSED` comptent dans le volume total d'événements créés. Si la vue admin ventile par statut, inclure la colonne `PROPOSED`. Pas de nouvelle métrique dédiée.
- **Actions admin existantes** : suppression et annulation forcée fonctionnent sur un `PROPOSED` comme sur un `DRAFT`. Suppression = hard delete, les votes et commentaires associés disparaissent via cascade.
- **Pas de nouvelle action admin spécifique** aux `PROPOSED` (pas de "forcer la publication", pas de "marquer comme abandonné", etc.).

---

## Changements infrastructure

### Transactions Prisma

Les usecases `publishProposedMoment` et `updateMoment` (quand il déclenche un reset de votes) enchaînent plusieurs opérations en base qui doivent être atomiques.

**Pattern retenu** : `prisma.$transaction(async (tx) => { ... })` (API callback), cohérent avec l'usage majoritaire du codebase (`prisma-circle-repository.ts`, `prisma-user-repository.ts`, `prisma-admin-repository.ts`).

**`publishProposedMoment`** : les 3 opérations DB (update status + `publishedAt`, archive commentaires, delete votes) tournent dans un seul `$transaction` avec le même `tx`. L'envoi des emails `new-moment-notification` reste **hors transaction** (fire-and-forget depuis la server action, après retour de l'usecase), cohérent avec la règle "emails depuis server action, pas depuis usecase".

**`updateMoment` avec reset des votes** : la mise à jour du Moment et l'appel `resetMomentVotes` tournent dans un seul `$transaction`. Si la mise à jour échoue, les votes restent intacts.

**En cas d'échec** : rollback complet. Le Moment reste dans son état précédent, aucun email envoyé.

**Impact sur les ports de repository** : `MomentRepository`, `MomentCommentRepository`, `MomentVoteRepository` doivent exposer leurs méthodes d'écriture en acceptant optionnellement un `PrismaClient | Prisma.TransactionClient` pour pouvoir partager le `tx`. Les repositories concernés à étendre :
- `MomentRepository.updateStatus` (ou équivalent utilisé pour la transition)
- `MomentCommentRepository.archiveAllByMomentId` (nouveau)
- `MomentVoteRepository.deleteAllByMoment` (nouveau)

Pattern d'implémentation suggéré : chaque méthode prend un second paramètre optionnel `client: PrismaClient | Prisma.TransactionClient = prisma`. L'appelant passe `tx` s'il est déjà dans une transaction, sinon le client global par défaut.

### `PrismaMomentVoteRepository` (nouveau)

Adapter implémentant `MomentVoteRepository`. Méthodes :
- `upsert` : `prisma.momentVote.upsert` sur `[momentId, userId]`.
- `findByMomentAndUser` : `findUnique` sur `[momentId, userId]`.
- `countByMoment` : `groupBy` par `choice`, aggrégation côté serveur (retourne `MomentVoteTally`).
- `deleteAllByMoment` : `deleteMany`.

### `PrismaMomentCommentRepository` (étendu)

- Toutes les méthodes existantes ajoutent `WHERE archivedAt IS NULL` par défaut.
- Nouvelle méthode `findArchivedByMomentId(momentId)` : `WHERE archivedAt IS NOT NULL`.
- Nouvelle méthode `archiveAllByMomentId(momentId)` : `updateMany { archivedAt: now }`.
- Paramètre optionnel `includeArchived` pour les appelants qui veulent tout charger (usage admin).

### Mapper Prisma ↔ Domain

- Mettre à jour `momentMapper` pour inclure `publishedAt` (nouveau champ).
- Ajouter `momentVoteMapper`.
- Mettre à jour `momentCommentMapper` pour inclure `archivedAt`.

### Notification d'envoi groupé

Le scénario "passage en `PROPOSED`" déclenche potentiellement 20+ emails. Utiliser le même mécanisme batch que `notify-new-moment.ts` (fire-and-forget, envoi parallèle limité par Resend). Créer `src/app/actions/notify-moment-proposed.ts` sur le modèle de `notify-new-moment.ts`.

### Sécurité (autorisation côté serveur)

- Toutes les server actions et pages gardent le check RBAC : lecture `PROPOSED` réservée aux Membres `ACTIVE` + HOST.
- Le slug public du Moment `PROPOSED` ne doit pas fuiter via sitemap, OG image indexable, Explorer, recherches SEO. `noindex` sur la meta de la page.
- Le slug du Moment est identique dans tous les statuts (pas de slug "privé" ou opaque pour les `PROPOSED`). Un Moment `PROPOSED` répond **404** à toute requête non autorisée. L'existence du slug en elle-même ne fuite aucune information sensible (même format et comportement que les `DRAFT` actuels).

---

## i18n

Nouvelles clés dans `messages/fr.json` et `messages/en.json`. Convention : namespaces PascalCase de premier niveau (`Moment`, `Email`, `Dashboard`), sous-namespaces et clés en camelCase, cohérent avec l'existant.

| Clé | FR | EN |
| --- | --- | --- |
| `Moment.status.proposed` | Proposé | Proposed |
| `Moment.form.statusLabel` | Statut à la création | Status at creation |
| `Moment.form.status.draft` | Brouillon, visible de toi seul | Draft, visible only to you |
| `Moment.form.status.proposed` | Proposition, soumis au vote de ta Communauté avant publication | Proposal, submitted to your Community vote before publishing |
| `Moment.form.status.published` | Publié, visible et ouvert aux inscriptions immédiatement | Published, visible and open for registrations immediately |
| `Moment.form.status.proposedDisabledPaid` | Les propositions ne sont disponibles que pour les événements gratuits. | Proposals are only available for free events. |
| `Moment.vote.blockTitle` | Cet événement est une proposition. | This event is a proposal. |
| `Moment.vote.blockSubtitle` | {host} attend ton avis. | {host} is waiting for your feedback. |
| `Moment.vote.for` | Pour | For |
| `Moment.vote.against` | Contre | Against |
| `Moment.vote.maybe` | Peut-être | Maybe |
| `Moment.vote.changeHint` | Tu peux changer d'avis tant que l'événement est en proposition. | You can change your mind while the event is a proposal. |
| `Moment.vote.tallyLabel` | {forCount} pour · {againstCount} contre · {maybeCount} peut-être | {forCount} for · {againstCount} against · {maybeCount} maybe |
| `Moment.vote.resultsTitle` | Résultats du vote (en direct) | Vote results (live) |
| `Moment.vote.resultsParticipation` | {voted} Membres ont voté sur {total} | {voted} Members voted out of {total} |
| `Moment.vote.confirmPublish` | {count} commentaires seront archivés. Publier maintenant ? | {count} comments will be archived. Publish now? |
| `Moment.vote.confirmReset` | Effacer les {count} votes reçus ? | Clear the {count} votes received? |
| `Moment.vote.confirmCancel` | Annuler cette proposition ? Les {count} votes reçus seront effacés. | Cancel this proposal? The {count} votes received will be cleared. |
| `Moment.vote.confirmDateChange` | Modifier la date effacera les {count} votes reçus. Continuer ? | Changing the date will clear {count} votes. Continue? |
| `Moment.vote.confirmLocationChange` | Modifier le lieu effacera les {count} votes reçus. Continuer ? | Changing the location will clear {count} votes. Continue? |
| `Moment.actions.publishProposed` | Publier l'événement | Publish event |
| `Moment.actions.resetVotes` | Réinitialiser les votes | Reset votes |
| `Moment.actions.cancelProposed` | Annuler la proposition | Cancel the proposal |
| `Moment.public.commentProposedWarning` | Ces commentaires seront archivés à la publication et ne seront plus visibles dans le fil principal. | These comments will be archived on publication and will no longer appear in the main thread. |
| `Moment.public.archivedCommentsButton` | Voir les commentaires archivés ({count}) | View archived comments ({count}) |
| `Moment.public.archivedCommentsBanner` | Ces commentaires ont été postés pendant la phase de proposition. | These comments were posted during the proposal phase. |
| `Dashboard.badge.proposed` | Proposé | Proposed |
| `Dashboard.badge.proposedExpired` | Proposition expirée | Expired proposal |
| `Email.momentProposedNotification.subject` | Nouvelle proposition d'événement dans {circle} | New event proposal in {circle} |
| `Email.momentProposedNotification.heading` | {host} propose un événement | {host} proposes an event |
| `Email.momentProposedNotification.message` | {host} propose {title} le {date} à {location}. Donne ton avis en votant pour, contre ou peut-être. | {host} proposes {title} on {date} at {location}. Share your feedback by voting for, against or maybe. |
| `Email.momentProposedNotification.voteCta` | Voter maintenant | Vote now |

> Traductions à répliquer dans `es.json`, `nl.json`, `ro.json` selon le process i18n habituel.

### Page Aide

Ajouter une section dans `messages/fr.json` et `messages/en.json` (clé `Help.proposed` ou équivalent) décrivant :
- Qu'est-ce qu'une proposition ?
- Comment voter ?
- Qui peut voir une proposition ?
- Qu'arrive-t-il aux commentaires à la publication ?
- Quand les votes sont-ils réinitialisés ?

---

## Tests requis

### Tests unitaires (usecases)

| Usecase | Scénarios à couvrir |
| --- | --- |
| `propose-moment` | happy path DRAFT → PROPOSED, non-HOST → 403, status ≠ DRAFT → erreur, Moment payant → `PaidMomentCannotBeProposedError` |
| `vote-moment` | happy path nouveau vote, changement de vote (upsert), status ≠ PROPOSED → erreur, HOST du Circle → `HostCannotVoteOnOwnCircleMomentError`, PENDING membership → `MembershipRequiredToVoteError`, non-membre → `MembershipRequiredToVoteError` |
| `reset-moment-votes` | happy path (manuel), non-HOST → 403, status ≠ PROPOSED → erreur |
| `publish-proposed-moment` | happy path (archivage commentaires + suppression votes + emails), vérifier que les commentaires précédents sont marqués `archivedAt` et que `findByMomentId` ne les retourne plus par défaut, non-HOST → 403, status ≠ PROPOSED → erreur |
| `getMomentBySlug` (ou équivalent de fetch) | retourne 404 / null si status = PROPOSED et l'appelant n'est pas Membre `ACTIVE` ni `HOST` du Circle |
| `get-moment-vote-tally` | retourne les bonnes totaux, tally vide si aucun vote |
| `get-user-vote-for-moment` | retourne le vote de l'user, null sinon |
| `create-moment` (modifié) | status = PROPOSED accepté, status = PROPOSED + payant → erreur, status = PUBLISHED inchangé |
| `update-moment` (modifié) | modification `startsAt` en PROPOSED → reset votes, modification `location` en PROPOSED → reset, modification titre en PROPOSED → préserve votes, modification d'un PUBLISHED → inchangé |
| `update-moment` transition CANCELLED | PROPOSED → CANCELLED accepté + suppression votes, inchangé pour les autres cas |
| `update-moment` transitions refusées | `DRAFT → PROPOSED` → `MomentStatusTransitionNotAllowedViaUpdateError`, `DRAFT → PUBLISHED` → même erreur, `PROPOSED → PUBLISHED` → même erreur, `PROPOSED → DRAFT` → `InvalidMomentStatusTransitionError`, `PUBLISHED → PROPOSED/DRAFT` → même erreur, `PAST → *` → même erreur, `CANCELLED → *` → même erreur |

### Tests d'autorisation (sécurité, multi-tenant)

- Un non-Membre du Circle ne peut pas voir un Moment `PROPOSED` (test HTTP).
- Un Membre `PENDING` ne peut pas voir un Moment `PROPOSED`.
- Un Membre d'un autre Circle ne peut pas voter sur ce `PROPOSED` (cross-tenant).
- Un HOST ne peut pas voter sur son propre Circle (test de la règle D11).
- Un non-HOST ne peut pas appeler `resetMomentVotes` / `publishProposedMoment` / `update-moment` pour `PROPOSED → CANCELLED`.
- Un visiteur public (non authentifié) reçoit un 404 sur `/m/[slug]` en `PROPOSED`.
- Les commentaires archivés ne sont pas exposés aux visiteurs externes.

### Tests d'intégration (adapter Prisma + DB réelle)

- `PrismaMomentVoteRepository` : upsert, count, delete.
- `PrismaMomentCommentRepository` : archiveAllByMomentId, findByMomentId filtre bien `archivedAt IS NULL`, findArchivedByMomentId.
- **Cascade Prisma** : supprimer un `Moment` efface ses `MomentVote` associés (FK `onDelete: Cascade`).
- **Cascade Prisma** : supprimer un `User` efface ses `MomentVote` (cohérent RGPD, cf. D19).

### Tests E2E (Playwright)

Nouveau fichier `tests/e2e/moment-proposed-vote.spec.ts` :

1. **Parcours complet** : Organisateur crée un Moment en `PROPOSED` → 2 Membres votent (pour, peut-être) → Organisateur voit les totaux → publie → commentaires archivés, bouton "Commentaires archivés" visible.
2. **Modification invalidante (date)** : Organisateur modifie `startsAt` → confirmation bloquante → votes reset → Membres revoient le bloc vote vide.
3. **Modification invalidante (lieu)** : Organisateur modifie `location` → confirmation bloquante → votes reset → Membres revoient le bloc vote vide.
4. **Modification non invalidante** : Organisateur modifie le titre → votes conservés.
5. **Réinitialisation manuelle** : Organisateur clique "Réinitialiser les votes" → confirmation → totaux à zéro.
6. **Tentative vote HOST** : Organisateur tente de voter → UI ne propose pas le bloc vote (vue Organisateur uniquement).
7. **Non-membre bloqué** : utilisateur non-membre du Circle tente d'accéder à `/m/[slug]` → 404.
8. **Événement payant** : Organisateur crée un événement avec `price > 0` → option "Proposition" grisée dans le formulaire.
9. **Admin plateforme** : un Moment `PROPOSED` apparaît dans `/admin/moments` avec le badge `Proposé` visible et la ligne accessible aux actions admin (suppression, annulation forcée).

---

## Hors scope pour le MVP

Décisions explicites d'exclusion, à réévaluer après mise en production :

- **Commentaire attaché au vote** (champ texte par votant). Discussion passe par le fil de commentaires existant du Moment.
- **Auto-publish au seuil** (ex. 50% de "pour"). Seul l'Organisateur déclenche la publication.
- **Options alternatives** (vote entre deux dates, deux lieux). Le vote porte sur une unique proposition.
- **Inscription pendant `PROPOSED`** (promotion auto des "pour" en inscrits). Les inscriptions démarrent à la publication.
- **Événements payants en `PROPOSED`**. Feature limitée aux événements gratuits.
- **Commentaires archivés éditables ou répondables**. Lecture seule après publication.
- **Historique / audit des votes**. Les votes supprimés ne laissent aucune trace.
- **Notifications in-app** (bell, push). Tout passe par email.
- **Durée max configurable**. Pas de timeout.
- **Détail nominatif des votes pour l'Organisateur**. Affichage agrégé seulement (possiblement en v2 si besoin exprimé).

---

## Métriques de succès

À instrumenter via PostHog dès le MVP :

| Métrique | Question associée |
| --- | --- |
| Ratio Moments `PROPOSED` / Moments créés | La feature est-elle adoptée ? |
| Taux de participation (votants / Membres `ACTIVE`) | Le signal est-il exploitable ? |
| Taux de transformation `PROPOSED → PUBLISHED` | Les propositions aboutissent-elles ? |
| Délai moyen `PROPOSED → PUBLISHED` | Combien de temps l'Organisateur attend-il ? |
| Taux d'inscription post-publication sur Moments issus de `PROPOSED` vs directs | Les Moments validés par vote performent-ils mieux ? |
| Taux d'abandon (`PROPOSED → CANCELLED`) | Combien de propositions sont retirées ? |
| Nombre moyen de votes par `PROPOSED` | Signal statistique viable ? |

À réévaluer 2 à 3 mois après mise en production pour décider d'étendre (commentaires attachés, options alternatives, etc.) ou de retirer.
