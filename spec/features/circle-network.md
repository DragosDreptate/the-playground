# Feature — Réseau de Communautés (Circle Network)

**Statut :** Spec validée — prête pour implémentation
**Date :** 2026-04-08
**Contexte :** Permettre de regrouper un ensemble de Communautés sous une même entité « Réseau » avec une page publique dédiée et une gestion admin.

---

## Positionnement et périmètre

### Ce qui est inclus (cette spec)

1. **Page publique \****`/networks/[slug]`** — vitrine du Réseau affichant ses Communautés membres
2. **Badge d'appartenance sur la page Communauté** — lien vers le Réseau depuis chaque Communauté membre
3. **Pages admin de gestion** — CRUD Réseau + ajout/retrait de Communautés

### Ce qui est exclu

- Membership utilisateur au niveau Réseau (un utilisateur est membre des Communautés, pas du Réseau)
- Événements au niveau Réseau (les événements restent dans les Communautés)
- Gouvernance Réseau (pas de Host Réseau, la gestion est admin-only)
- Découvrabilité dans Découvrir (les Réseaux ne sont pas listés dans l'Explorer — accès par URL directe ou lien depuis les pages Communautés membres)
- Workflow d'invitation/acceptation (l'admin gère tout manuellement après accord verbal entre les parties)
- Sitemap (pas d'intérêt SEO au MVP — les Réseaux ne sont pas découvrables)

### Pourquoi ce périmètre minimal

Le besoin est un **regroupement d'affichage** : donner une page commune à un ensemble de Communautés liées. Pas de logique métier complexe, pas de gouvernance, pas d'agrégation. L'admin gère la composition à la demande, ce qui reflète la nature ponctuelle de ces actions.

---

## Terminologie

| Contexte | Terme |
| --- | --- |
| Code (types, variables, fichiers, clés i18n) | `CircleNetwork`, `NetworkMembership` |
| FR (UI, spec, docs) | **Réseau** (masculin : un Réseau, ce Réseau) |
| EN (UI) | **Network** |

---

## Schema Prisma — Nouvelles tables

### `CircleNetwork`

```prisma
model CircleNetwork {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?  @db.Text
  coverImage  String?
  website     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  circles     CircleNetworkMembership[]

  @@map("circle_networks")
}
```

### `CircleNetworkMembership`

Table de liaison N:N entre Réseaux et Communautés. Un Circle peut appartenir à plusieurs Réseaux.

```prisma
model CircleNetworkMembership {
  id        String   @id @default(cuid())
  networkId String
  circleId  String
  addedAt   DateTime @default(now())

  network   CircleNetwork @relation(fields: [networkId], references: [id], onDelete: Cascade)
  circle    Circle        @relation(fields: [circleId], references: [id], onDelete: Cascade)

  @@unique([networkId, circleId])
  @@index([circleId])
  @@map("circle_network_memberships")
}
```

### Modification sur `Circle`

```prisma
model Circle {
  // ... champs existants ...
  networks    CircleNetworkMembership[]
}
```

### Décisions schema

| Décision | Justification |
| --- | --- |
| Table de liaison N:N (pas FK simple) | Un Circle peut appartenir à plusieurs Réseaux |
| `onDelete: Cascade` des deux côtés | Supprimer un Réseau retire les liens ; supprimer un Circle le retire des Réseaux |
| Index sur `circleId` | Permet de retrouver rapidement les Réseaux d'un Circle (badge sur page Communauté) |
| Pas de `status` sur la membership | Pas de workflow d'invitation — l'admin ajoute directement |
| Pas de `hostUserId` sur le Réseau | Pas de gouvernance — gestion admin-only |
| Pas de limite de Réseaux par Circle | Pas de raison de contraindre — un Circle peut appartenir à autant de Réseaux que nécessaire |

---

## Domaine

### Nouveau modèle

```typescript
// domain/models/circle-network.ts

export type CircleNetwork = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CircleNetworkWithCircles = CircleNetwork & {
  circles: PublicCircle[]; // Réutilise le type existant de l'Explorer
};
```

> **Choix \****`PublicCircle`** : le type inclut `topMembers`, `nextMoment`, `memberCount`, `upcomingMomentCount` — ce qui nécessite les mêmes sous-requêtes que l'Explorer. Ce coût est accepté car le nombre de Communautés par Réseau est faible (<20) et cela permet de réutiliser `PublicCircleCard` sans nouveau composant.

### Nouveau port

```typescript
// domain/ports/repositories/circle-network-repository.ts

export interface CircleNetworkRepository {
  // Lecture publique
  findBySlug(slug: string): Promise<CircleNetworkWithCircles | null>;

  // Lecture pour badge sur page Communauté
  findNetworksByCircleId(circleId: string): Promise<CircleNetwork[]>;

  // Admin CRUD
  findAll(): Promise<(CircleNetwork & { circleCount: number })[]>;
  findById(id: string): Promise<CircleNetworkWithCircles | null>;
  create(input: CreateCircleNetworkInput): Promise<CircleNetwork>;
  update(id: string, input: UpdateCircleNetworkInput): Promise<CircleNetwork>;
  delete(id: string): Promise<void>;

  // Admin gestion composition
  addCircle(networkId: string, circleId: string): Promise<void>;
  removeCircle(networkId: string, circleId: string): Promise<void>;

  // Admin recherche de Circles (exclut ceux déjà membres du Réseau)
  searchCirclesNotInNetwork(networkId: string, query: string): Promise<{ id: string; name: string; slug: string; category: CircleCategory | null; city: string | null }[]>;
}

export type CreateCircleNetworkInput = {
  slug: string;
  name: string;
  description?: string;
  coverImage?: string;
  website?: string;
};

export type UpdateCircleNetworkInput = Partial<CreateCircleNetworkInput>;
```

### Usecases

Pour respecter la convention hexagonale du projet (même les lectures passent par des usecases), les usecases suivants sont créés :

**Lecture publique :**

| Usecase | Appelant | Description |
| --- | --- | --- |
| `getNetworkBySlug` | Page publique | Charge le Réseau + ses Communautés `PUBLIC` uniquement |
| `getNetworksByCircleId` | Page Communauté | Retourne les Réseaux dont le Circle est membre (pour le badge) |

**Admin :**

| Usecase | Appelant | Description |
| --- | --- | --- |
| `getAdminNetworks` | Admin liste | Liste tous les Réseaux avec `circleCount` |
| `getAdminNetwork` | Admin détail | Charge un Réseau par ID + toutes ses Communautés (y compris PRIVATE) |
| `adminCreateNetwork` | Admin création | Crée un Réseau (slug auto-généré depuis le nom, éditable) |
| `adminUpdateNetwork` | Admin édition | Met à jour les informations du Réseau |
| `adminDeleteNetwork` | Admin suppression | Supprime un Réseau (cascade sur les memberships) |
| `adminAddCircleToNetwork` | Admin composition | Ajoute un Circle au Réseau |
| `adminRemoveCircleFromNetwork` | Admin composition | Retire un Circle du Réseau |

> **Note :** ces usecases sont des pass-through fins vers le repository, mais maintiennent la cohérence architecturale et permettent d'ajouter de la logique métier (validation, events) sans refactoring.

### Règle de visibilité

| Contexte | Circles affichés |
| --- | --- |
| Page publique `/networks/[slug]` | **Uniquement \****`visibility: PUBLIC`** — un Circle PRIVATE ajouté au Réseau n'apparaît pas sur la page publique |
| Page admin `/admin/networks/[id]` | **Tous les Circles** (PUBLIC + PRIVATE) — l'admin voit la composition complète |

---

## Pages et routes

### 1. Page publique — `/networks/[slug]`

**Route :** `src/app/[locale]/(routes)/networks/[slug]/page.tsx`

**Layout :** inspiré de la page Communauté publique, simplifié.

**Contenu :**

| Section | Détail |
| --- | --- |
| **Cover** | Image de couverture du Réseau (1:1, avec gradient fallback comme les Circles) |
| **Nom** | Titre du Réseau |
| **Description** | Texte de présentation (optionnel) |
| **Site web** | Lien cliquable vers le site du Réseau (icône ExternalLink), affiché sans protocole. Masqué si non renseigné |
| **Compteur** | « X Communautés » (nombre de Communautés publiques visibles) |
| **Grille des Communautés** | Cartes des Communautés membres — réutilise `PublicCircleCard` existant |

**Pas de :** bouton rejoindre, liste de membres, onglets événements, social proof. C'est une page vitrine statique.

**Ordre d'affichage :** par `addedAt` ASC (ordre d'ajout par l'admin). L'admin contrôle l'ordre en ajoutant les Communautés dans l'ordre souhaité.

**Empty state :** si le Réseau n'a aucune Communauté publique visible, afficher un message centré « Aucune Communauté dans ce Réseau pour le moment » (même pattern que l'empty state de l'Explorer : icône + texte).

**404 :** si le slug n'existe pas, `notFound()` (même pattern que les pages Communauté et événement existantes).

**Metadata :** OpenGraph + Twitter Card (titre, description, cover) pour le partage.

**Revalidation :** `revalidate = 300` (5 min, comme l'Explorer).

**Layout mobile :** responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` pour la grille des Communautés. Cover + description en pleine largeur au-dessus. Même pattern responsive que l'Explorer.

### 2. Badge sur la page Communauté — `/circles/[slug]`

**Emplacement :** dans la section métadonnées de la sidebar gauche, après la ville et la catégorie.

**Rendu :** pour chaque Réseau dont la Communauté est membre :

```
[icône Network] Membre de <lien vers /networks/[slug]>
```

Si la Communauté n'appartient à aucun Réseau : rien affiché (pas de section vide).

**Performance :** la query `findNetworksByCircleId` est légère (index sur `circleId`, retourne uniquement les métadonnées du Réseau, pas les Circles membres). Pas de cache additionnel nécessaire — chargée dans la même requête serveur que le reste de la page.

### 3. Pages admin

#### Navigation admin

Ajouter une entrée dans `admin-nav.ts` (`adminNavItems`) :
```typescript
{ label: "Réseaux", href: "/admin/networks", icon: Network }
```

#### `/admin/networks` — Liste des Réseaux

| Colonne | Détail |
| --- | --- |
| Nom | Lien vers la page admin détail |
| Slug | URL publique |
| Communautés | Nombre de Communautés membres (toutes, incluant PRIVATE) |
| Créé le | Date |
| Actions | Modifier, Supprimer |

Bouton « Créer un Réseau » en haut de page.

#### `/admin/networks/[id]` — Détail et édition d'un Réseau

**Deux sections :**

**Section 1 — Informations du Réseau (formulaire d'édition)**

| Champ | Type | Requis | Détail |
| --- | --- | --- | --- |
| Nom | Input texte | Oui |  |
| Slug | Input texte | Oui | Auto-généré depuis le nom à la création (même helper `slugify` que les Circles), éditable par l'admin avec warning |
| Description | Textarea | Non |  |
| Image de couverture | Cover image picker | Non | Réutilise `CoverImagePicker` existant (upload Vercel Blob + Unsplash) |
| Site web | Input URL | Non | Validation URL (`https://...`), affiché sans protocole sur la page publique, `target="_blank" rel="noopener noreferrer"` |

> **Challenge vs. formulaire Communauté :** la page d'édition de Réseau est volontairement **plus simple**. Pas de catégorie (les Communautés membres ont déjà leur catégorie), pas de ville, pas de visibilité (tous les Réseaux sont publics par défaut — accessibles par URL), pas d'approbation, pas de Stripe. Un Réseau est une vitrine, pas une entité fonctionnelle.

**Section 2 — Communautés membres**

- Liste des Communautés actuellement dans le Réseau (nom, slug, catégorie, ville, visibilité, bouton « Retirer » avec confirmation)
- Champ de recherche pour ajouter une Communauté (autocomplete sur le nom/slug des Circles existants, **exclut les Circles déjà membres** du Réseau)
- Bouton « Ajouter » après sélection
- Indicateur visuel pour les Circles PRIVATE (badge « Privé ») avec mention qu'ils ne seront pas visibles sur la page publique

#### `/admin/networks/new` — Création

Même formulaire que la section 1 de l'édition (sans la section Communautés — on les ajoute après création).

---

## Composants

| Composant | Nouveau / Existant | Usage |
| --- | --- | --- |
| `PublicCircleCard` | **Existant** | Grille des Communautés sur la page Réseau |
| `CoverImagePicker` | **Existant** | Formulaire admin d'édition du Réseau (upload Vercel Blob + Unsplash) |
| `NetworkBadge` | **Nouveau** | Badge « Membre de [Réseau] » sur la page Communauté |
| `NetworkCircleManager` | **Nouveau** | Section admin : recherche + ajout/retrait de Communautés |
| `NetworkForm` | **Nouveau** | Formulaire admin : nom, slug, description, cover |

---

## Server actions

Toutes les actions sont ajoutées dans le **fichier existant \****`app/actions/admin.ts`** (convention du projet — toutes les actions admin dans un seul fichier).

```typescript
// app/actions/admin.ts (ajouts)

adminCreateNetworkAction(formData: FormData): Promise<ActionResult>
adminUpdateNetworkAction(networkId: string, formData: FormData): Promise<ActionResult>
adminDeleteNetworkAction(networkId: string): Promise<ActionResult>
adminAddCircleToNetworkAction(networkId: string, circleId: string): Promise<ActionResult>
adminRemoveCircleFromNetworkAction(networkId: string, circleId: string): Promise<ActionResult>
adminSearchCirclesForNetworkAction(networkId: string, query: string): Promise<ActionResult<SearchResult[]>>
```

Toutes protégées par le guard `requireAdmin()` existant. Pattern identique aux actions admin existantes (`try/catch` + `DomainError` + Sentry + `ActionResult`).

---

## i18n

### Clés à ajouter

```json
// Namespace "Network" (nouveau) — à ajouter dans fr.json et en.json
{
  "Network": {
    "title": "Réseau",
    "memberOf": "Membre de",
    "communityCount": "{count, plural, one {# Communauté} other {# Communautés}}",
    "noCommunities": "Aucune Communauté dans ce Réseau pour le moment",
    "website": "Site web"
  }
}
```

```json
// EN
{
  "Network": {
    "title": "Network",
    "memberOf": "Member of",
    "communityCount": "{count, plural, one {# Community} other {# Communities}}",
    "noCommunities": "No Communities in this Network yet",
    "website": "Website"
  }
}
```

```json
// Namespace "Admin" (existant, clés à ajouter) — FR
{
  "Admin": {
    "networks": "Réseaux",
    "createNetwork": "Créer un Réseau",
    "editNetwork": "Modifier le Réseau",
    "deleteNetwork": "Supprimer le Réseau",
    "addCircle": "Ajouter une Communauté",
    "removeCircle": "Retirer",
    "searchCircle": "Rechercher une Communauté",
    "networkMembers": "Communautés membres",
    "confirmDeleteNetwork": "Supprimer ce Réseau ? Les Communautés ne seront pas supprimées.",
    "circlePrivateWarning": "Cette Communauté est privée — elle ne sera pas visible sur la page publique du Réseau."
  }
}
```

```json
// Namespace "Admin" — EN
{
  "Admin": {
    "networks": "Networks",
    "createNetwork": "Create Network",
    "editNetwork": "Edit Network",
    "deleteNetwork": "Delete Network",
    "addCircle": "Add Community",
    "removeCircle": "Remove",
    "searchCircle": "Search Community",
    "networkMembers": "Member Communities",
    "confirmDeleteNetwork": "Delete this Network? Communities will not be deleted.",
    "circlePrivateWarning": "This Community is private — it will not be visible on the public Network page."
  }
}
```

---

## Stratégie de tests

### Tests unitaires des usecases

| Test | Cible |
| --- | --- |
| `getNetworkBySlug` : retourne uniquement les Circles PUBLIC | Usecase unitaire |
| `getNetworkBySlug` : retourne `null` si slug inexistant | Usecase unitaire |
| `getNetworksByCircleId` : retourne les Réseaux du Circle | Usecase unitaire |
| `adminAddCircleToNetwork` : ajout réussi | Usecase unitaire |
| `adminAddCircleToNetwork` : doublon → erreur | Usecase unitaire |
| `adminRemoveCircleFromNetwork` : retrait réussi | Usecase unitaire |
| `adminDeleteNetwork` : suppression en cascade des memberships | Usecase unitaire |

### Tests d'intégration

| Test | Cible |
| --- | --- |
| Repository : `findBySlug` retourne les Circles membres avec stats (topMembers, nextMoment) | Intégration adapter Prisma |
| Repository : `findNetworksByCircleId` retourne les Réseaux du Circle | Intégration adapter Prisma |
| Repository : `addCircle` / `removeCircle` gèrent la liaison | Intégration adapter Prisma |
| Repository : `addCircle` en doublon → erreur (contrainte unique) | Intégration adapter Prisma |
| Repository : `searchCirclesNotInNetwork` exclut les Circles déjà membres | Intégration adapter Prisma |

### Tests E2E

| Scénario | Spec |
| --- | --- |
| Page Réseau affiche les Communautés membres publiques | `tests/e2e/network.spec.ts` |
| Page Réseau n'affiche pas les Communautés privées | `tests/e2e/network.spec.ts` |
| Badge Réseau visible sur la page Communauté membre | `tests/e2e/network.spec.ts` |
| Badge Réseau absent sur une Communauté non-membre | `tests/e2e/network.spec.ts` |
| Page Réseau avec slug inexistant → 404 | `tests/e2e/network.spec.ts` |

### Hors scope tests

Les pages admin ne sont pas couvertes en E2E (convention existante du projet — les pages admin sont testées manuellement).

---

## Plan d'implémentation (ordre recommandé)

| Étape | Description |
| --- | --- |
| 1 | Schema Prisma : 2 nouvelles tables + relation sur Circle + push dev/prod |
| 2 | Domaine : modèle `CircleNetwork` + port `CircleNetworkRepository` |
| 3 | Domaine : usecases (lecture publique + admin) |
| 4 | Infrastructure : adapter Prisma pour le repository |
| 5 | Page publique `/networks/[slug]` (SSR, metadata, 404, empty state, responsive) |
| 6 | Badge `NetworkBadge` sur la page Communauté (`/circles/[slug]`) |
| 7 | Pages admin : liste, création, édition + gestion des Communautés membres |
| 8 | Server actions dans `app/actions/admin.ts` |
| 9 | Navigation admin : entrée « Réseaux » dans `admin-nav.ts` |
| 10 | i18n FR/EN (namespace `Network` + clés `Admin`) |
| 11 | Tests unitaires usecases + intégration repository + E2E page publique |

---

## Évolutions futures (hors scope)

- **Découvrabilité** : page `/networks` listant tous les Réseaux, ou section dédiée dans Découvrir
- **Sitemap** : inclure les pages Réseau quand la découvrabilité sera en place
- **Gouvernance** : un Host Réseau (pas admin) qui gère la composition
- **Workflow d'invitation** : le Réseau invite un Circle, le Host du Circle accepte/refuse
- **Agrégation d'événements** : afficher les prochains événements de toutes les Communautés du Réseau
- **Statistiques Réseau** : nombre total de membres, événements, activité agrégée
- **Visibilité** : Réseaux privés (accessibles uniquement par lien)
- **Ordre manuel** : drag & drop pour réordonner les Communautés dans un Réseau (admin)
