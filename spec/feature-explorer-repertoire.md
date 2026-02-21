# Le Répertoire — Spec d'implémentation

> "Le répertoire de tous les possibles" — l'espace de découverte de The Playground.
> Page `/explorer` : vitrine publique des Circles et Moments ouverts à tous.
>
> Référence produit : `spec/ux-parcours-jtbd.md` (parcours cold traffic, persona Host débutant)
> Référence backlog : section "Répertoire public"

---

## Vision produit

Le **Répertoire** est la réponse à la question : *"Que voit un utilisateur qui arrive sur
The Playground sans lien partagé ?"*

Aujourd'hui : rien. Bounce immédiat.

Le Répertoire est l'**espace de jeu ouvert** — l'incarnation du nom "Playground". On y trouve
tous les Circles et Moments publics, sans algorithme, sans ranking, sans mise en avant payante.
Juste les communautés et leurs événements, dans l'ordre chronologique.

**Ce que ce n'est pas** : une marketplace. Pas de featured listings, pas d'algorithme de
recommandation, pas de classement. Un annuaire ouvert, community-first.

**Invariants** :
- Seuls les Circles `PUBLIC` apparaissent
- Seuls les Moments `PUBLISHED` (à venir) de Circles publics apparaissent
- Le Circle est toujours plus visible que le Moment sur les cards
- Ordre chronologique uniquement (pas de ranking)
- Un Host contrôle sa visibilité via `visibility: PRIVATE` sur son Circle

---

## Schema — Modifications nécessaires

Deux champs manquent sur `Circle` pour permettre le filtrage.

### Ajout : `category` (enum)

```prisma
enum CircleCategory {
  TECH
  DESIGN
  BUSINESS
  SPORT_WELLNESS   // Sport & Bien-être
  ART_CULTURE
  SCIENCE_EDUCATION
  SOCIAL
  OTHER
}

model Circle {
  // ... champs existants ...
  category  CircleCategory?   // nullable : les Circles existants ne sont pas catégorisés
}
```

**Décision** : nullable en DB, obligatoire dans le formulaire de création (validation côté usecase).
Les Circles existants sans catégorie restent valides.

### Ajout : `city` (string libre)

```prisma
model Circle {
  // ... champs existants ...
  city      String?   // ex: "Paris", "Lyon", "Remote"
}
```

**Décision** : string libre (pas de liste fermée), nullable. Le Host saisit librement.
Valeur spéciale suggérée : `"Remote"` pour les Circles 100% en ligne.
L'autocomplétion ou la normalisation de ville est post-MVP.

### Migration

```
pnpm db:push      (dev)
pnpm db:push:prod (prod, avec confirmation)
```

Pas de données existantes à migrer — les deux champs sont nullable.

---

## Architecture hexagonale

### Nouveaux ports

#### `CircleRepository` — méthodes à ajouter

```typescript
// domain/ports/repositories/circle-repository.ts

findPublic(filters: PublicCircleFilters): Promise<PublicCircle[]>;

type PublicCircleFilters = {
  category?: CircleCategory;
  city?: string;
  limit?: number;
  offset?: number;
};

type PublicCircle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CircleCategory | null;
  city: string | null;
  memberCount: number;
  upcomingMomentCount: number;
  nextMoment: {
    title: string;
    startsAt: Date;
  } | null;
};
```

#### `MomentRepository` — méthodes à ajouter

```typescript
// domain/ports/repositories/moment-repository.ts

findPublicUpcoming(filters: PublicMomentFilters): Promise<PublicMoment[]>;

type PublicMomentFilters = {
  category?: CircleCategory;   // hérité du Circle
  city?: string;               // hérité du Circle
  limit?: number;
  offset?: number;
};

type PublicMoment = {
  id: string;
  slug: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  registrationCount: number;
  capacity: number | null;
  circle: {
    slug: string;
    name: string;
    category: CircleCategory | null;
    city: string | null;
  };
};
```

### Nouveaux usecases

#### `getPublicCircles`

```typescript
// domain/usecases/get-public-circles.ts

export async function getPublicCircles(
  filters: PublicCircleFilters,
  deps: { circleRepository: CircleRepository }
): Promise<PublicCircle[]> {
  return deps.circleRepository.findPublic(filters);
}
```

#### `getPublicUpcomingMoments`

```typescript
// domain/usecases/get-public-upcoming-moments.ts

export async function getPublicUpcomingMoments(
  filters: PublicMomentFilters,
  deps: { momentRepository: MomentRepository }
): Promise<PublicMoment[]> {
  return deps.momentRepository.findPublicUpcoming(filters);
}
```

### Implémentations Prisma

#### `PrismaCircleRepository.findPublic`

```typescript
async findPublic(filters: PublicCircleFilters): Promise<PublicCircle[]> {
  const circles = await prisma.circle.findMany({
    where: {
      visibility: "PUBLIC",
      ...(filters.category && { category: filters.category }),
      ...(filters.city && { city: { contains: filters.city, mode: "insensitive" } }),
    },
    include: {
      _count: { select: { memberships: true } },
      moments: {
        where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 1,
        select: { title: true, startsAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 20,
    skip: filters.offset ?? 0,
  });

  return circles.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    category: c.category,
    city: c.city,
    memberCount: c._count.memberships,
    upcomingMomentCount: c.moments.length, // affiner avec un _count séparé si besoin
    nextMoment: c.moments[0] ?? null,
  }));
}
```

#### `PrismaMomentRepository.findPublicUpcoming`

```typescript
async findPublicUpcoming(filters: PublicMomentFilters): Promise<PublicMoment[]> {
  const moments = await prisma.moment.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: { gte: new Date() },
      circle: {
        visibility: "PUBLIC",
        ...(filters.category && { category: filters.category }),
        ...(filters.city && { city: { contains: filters.city, mode: "insensitive" } }),
      },
    },
    include: {
      circle: { select: { slug: true, name: true, category: true, city: true } },
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
    },
    orderBy: { startsAt: "asc" },
    take: filters.limit ?? 20,
    skip: filters.offset ?? 0,
  });

  return moments.map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    locationType: m.locationType,
    locationName: m.locationName,
    registrationCount: m._count.registrations,
    capacity: m.capacity,
    circle: m.circle,
  }));
}
```

---

## Pages & composants

### Page `/explorer`

```
src/app/[locale]/(routes)/explorer/page.tsx
```

**Rendu** : Server Component, SSR avec revalidation (`revalidate: 60` secondes).
**URL params** : `?tab=moments|circles`, `?category=TECH`, `?city=Paris`

```typescript
// Structure de la page
export default async function ExplorerPage({ searchParams }) {
  const tab = searchParams.tab ?? "circles";
  const category = searchParams.category;
  const city = searchParams.city;

  const [circles, moments] = await Promise.all([
    getPublicCircles({ category, city }, { circleRepository: prismaCircleRepository }),
    getPublicUpcomingMoments({ category, city }, { momentRepository: prismaMomentRepository }),
  ]);

  return (
    <>
      <ExplorerHeader />          {/* titre + description */}
      <ExplorerFilterBar />       {/* filtres category + city — Client Component */}
      <ExplorerTabs              {/* Cercles / Événements */}
        tab={tab}
        circles={circles}
        moments={moments}
      />
    </>
  );
}
```

**Metadata SEO** :
```typescript
export const metadata = {
  title: "Explorer — The Playground",
  description: "Découvrez des communautés et des événements près de chez vous.",
};
```

### Composants à créer

#### `ExplorerFilterBar` (Client Component)

```
src/components/explorer/explorer-filter-bar.tsx
```

- Sélecteur de catégorie (pills/chips, multi-select non prioritaire)
- Input ville (texte libre)
- Mise à jour de l'URL via `router.push` (SSR-friendly, partageable)

#### `PublicCircleCard`

```
src/components/explorer/public-circle-card.tsx
```

Contenu :
- Gradient cover (petit, 16:9 ou carré)
- Nom du Circle + badge catégorie
- Ville (si renseignée) + icône
- N membres · N Moments à venir
- Teaser prochain Moment : titre + date
- CTA : lien vers la page Circle publique (à créer — voir ci-dessous)

#### `PublicMomentCard`

```
src/components/explorer/public-moment-card.tsx
```

Contenu (community-first) :
- En-tête : nom du Circle (prominent) + catégorie badge
- Thumbnail gradient Moment
- Titre du Moment
- Date + heure + lieu
- N inscrits (+ places restantes si capacité définie)
- CTA : lien vers `/m/[slug]`

---

## Page Circle publique (hors dashboard)

Actuellement, la page Circle n'existe qu'en version dashboard (authentifiée).
Pour le Répertoire, il faut une **page Circle publique** accessible sans compte.

```
src/app/[locale]/(routes)/circles/[slug]/page.tsx
```

**Contenu** (similaire à la page Circle dashboard, sans les contrôles Host) :
- Layout 2 colonnes (identique au design existant)
- Description, Hosts, stats (membres, Moments)
- Timeline des Moments à venir (cliquables → `/m/[slug]`)
- Pas de bouton Modifier/Supprimer
- CTA : "Rejoindre ce Cercle" → s'inscrit au prochain Moment ou demande à rejoindre

**Note** : cette page peut réutiliser `MomentTimelineItem` existant (sans les liens dashboard).

---

## Formulaire Circle — Champs à ajouter

Dans le formulaire de création/modification de Circle :

```
src/components/circles/circle-form.tsx  (à vérifier nom exact)
```

Ajouter :
- **Catégorie** : `Select` avec les valeurs de l'enum `CircleCategory` (obligatoire)
- **Ville** : `Input` texte libre avec placeholder "Paris, Lyon, Remote..." (optionnel)

Ces champs alimentent le filtrage sur le Répertoire.

---

## i18n — Clés à ajouter

```json
{
  "Explorer": {
    "title": "Le Répertoire",
    "description": "Découvrez des communautés et des événements ouverts à tous.",
    "tabs": {
      "circles": "Cercles",
      "moments": "Événements"
    },
    "filters": {
      "category": "Catégorie",
      "city": "Ville",
      "allCategories": "Toutes les catégories",
      "placeholder": {
        "city": "Paris, Lyon, Remote..."
      }
    },
    "empty": {
      "circles": "Aucun Cercle public pour ces critères.",
      "moments": "Aucun événement à venir pour ces critères."
    }
  },
  "CircleCategory": {
    "TECH": "Tech & Dev",
    "DESIGN": "Design & Créatif",
    "BUSINESS": "Business & Entrepreneuriat",
    "SPORT_WELLNESS": "Sport & Bien-être",
    "ART_CULTURE": "Art & Culture",
    "SCIENCE_EDUCATION": "Sciences & Éducation",
    "SOCIAL": "Social & Communauté",
    "OTHER": "Autre"
  }
}
```

---

## Navigation — Points d'accès

Le Répertoire doit être accessible depuis :

1. **Header principal** : lien "Explorer" dans la nav (visible même non connecté)
2. **Dashboard** : lien "Explorer" pour les Players sans Moment à venir
3. **Page `/m/[slug]`** : lien "Voir d'autres Cercles" (footer ou sidebar)
4. **URL directe `/explorer`** : accessible et indexable sans authentification

---

## SEO & indexation

- Page `/explorer` : `sitemap.xml` + `robots.txt` permettent l'indexation
- Pages Circle publiques `/circles/[slug]` : indexables, metadata dynamiques
- Pages Moment publiques `/m/[slug]` : déjà existantes et indexables
- `revalidate: 60` sur toutes les pages statiques → fraîcheur des données sans rebuild complet

---

## Plan d'implémentation — Séquençage

| Étape | Tâche | Dépendances |
|-------|-------|-------------|
| 1 | Schema : ajouter `category` + `city` sur Circle | — |
| 2 | `db:push` dev + prod | Étape 1 |
| 3 | Formulaire Circle : ajouter champs category + city | Étape 1 |
| 4 | Domaine : types `PublicCircle`, `PublicMoment`, filtres | Étape 1 |
| 5 | Ports : `findPublic` + `findPublicUpcoming` | Étape 4 |
| 6 | Usecases : `getPublicCircles` + `getPublicUpcomingMoments` + tests | Étape 5 |
| 7 | Adapteurs Prisma | Étapes 5, 6 |
| 8 | Composants : `PublicCircleCard`, `PublicMomentCard`, `ExplorerFilterBar` | Étape 4 |
| 9 | Page `/explorer` | Étapes 7, 8 |
| 10 | Page Circle publique `/circles/[slug]` | Étape 7 |
| 11 | Ajouter lien "Explorer" dans le header | Étape 9 |
| 12 | i18n FR + EN | Toutes |

---

## Décisions prises

| Décision | Raison |
|----------|--------|
| Tab par défaut : Cercles (pas Événements) | Community-first : on découvre d'abord une communauté, pas un événement |
| Ordre chronologique uniquement | Pas d'algorithme, pas de ranking — invariant positionnement |
| `city` = string libre (pas enum) | Flexibilité MVP, normalisation post-MVP si besoin |
| `category` = nullable en DB, obligatoire en UI | Rétrocompatibilité + meilleure expérience à la création |
| Page Circle publique séparée du dashboard | Accès sans auth, SEO, parcours cold traffic |
| `revalidate: 60` sur `/explorer` | Fraîcheur acceptable sans rebuild, pas de full SSR dynamique |
| Pas de pagination complexe en MVP | `limit: 20` suffit pour le lancement, pagination à ajouter si besoin |
