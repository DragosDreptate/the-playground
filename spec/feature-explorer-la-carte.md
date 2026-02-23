# Découvrir — Spec d'implémentation

> "L'espace de jeu ouvert" — la page de découverte de The Playground.
> Page `/explorer` : vitrine publique des Circles et Moments ouverts à tous.
>
> Référence produit : `spec/ux-parcours-jtbd.md` (parcours cold traffic, persona Host débutant)
> Référence backlog : section "Découvrir"
>
> **Terminologie** : "Découvrir" (FR) / "Explore" (EN). Route : `/explorer`. Clé i18n : `Explorer`.

---

## Vision produit

**Découvrir** est la réponse à la question : *"Que voit un utilisateur qui arrive sur
The Playground sans lien partagé ?"*

Aujourd'hui : rien. Bounce immédiat.

Découvrir est l'**espace de jeu ouvert** — l'incarnation du nom "Playground". On y trouve
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

Un seul champ manque sur `Circle` pour le filtrage MVP.
La ville est conservée comme champ d'affichage mais n'est pas un axe de filtre (voir Décisions).

### Ajout : `category` (enum) — axe de filtrage principal

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
Les Circles existants sans catégorie restent valides et apparaissent sur Découvrir sans filtre.

### Ajout : `city` (string libre) — affichage uniquement, pas de filtre MVP

```prisma
model Circle {
  // ... champs existants ...
  city      String?   // ex: "Paris", "Lyon", "Remote" — affiché sur la card, non filtrable en MVP
}
```

**Décision** : champ optionnel, string libre, enrichit la card Circle ("Paris · Tech & Dev")
sans être un axe de filtrage. Le filtrage géographique est post-MVP : la densité par ville
ne sera pas suffisante au lancement pour que le filtre soit utile.

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
  category?: CircleCategory;   // seul axe de filtre MVP
  limit?: number;
  offset?: number;
};

type PublicCircle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CircleCategory | null;
  city: string | null;           // affiché sur la card
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
  category?: CircleCategory;   // hérité du Circle, seul axe de filtre MVP
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
    upcomingMomentCount: c.moments.length,
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
**URL params** : `?tab=moments|circles`, `?category=TECH`

```typescript
// Structure de la page
export default async function ExplorerPage({ searchParams }) {
  const tab = searchParams.tab ?? "circles";
  const category = searchParams.category;  // seul filtre MVP

  const [circles, moments] = await Promise.all([
    getPublicCircles({ category }, { circleRepository: prismaCircleRepository }),
    getPublicUpcomingMoments({ category }, { momentRepository: prismaMomentRepository }),
  ]);

  return (
    <>
      <ExplorerHeader />          {/* titre + description */}
      <ExplorerFilterBar />       {/* filtre catégorie uniquement — Client Component */}
      <ExplorerTabs              {/* Communautés / Événements */}
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
  description: "Des communautés qui partagent vos valeurs, des événements à ne pas manquer.",
};
```

### Composants

#### `ExplorerFilterBar` (Client Component)

```
src/components/explorer/explorer-filter-bar.tsx
```

- Pills/chips de catégorie (une seule sélection, "Toutes" = aucun filtre)
- Mise à jour de l'URL via `router.push` (SSR-friendly, partageable, lien partageable avec le filtre)
- Pas d'input ville en MVP

#### `PublicCircleCard`

```
src/components/explorer/public-circle-card.tsx
```

Contenu :
- Gradient cover (petit)
- Nom du Circle
- Badge catégorie + ville en texte secondaire si renseignée ("Paris")
- N membres · N Moments à venir
- Teaser prochain Moment : titre + date
- CTA : lien vers `/circles/[slug]` (page Circle publique)

#### `PublicMomentCard`

```
src/components/explorer/public-moment-card.tsx
```

Contenu (community-first) :
- En-tête : nom du Circle (prominent) + badge catégorie
- Thumbnail gradient Moment
- Titre du Moment
- Date + heure · lieu ou "En ligne"
- N inscrits (+ places restantes si capacité définie)
- Ville du Circle en texte secondaire si renseignée
- CTA : lien vers `/m/[slug]`

---

## Page Circle publique (hors dashboard)

Actuellement, la page Circle n'existe qu'en version dashboard (authentifiée).
Pour Découvrir, il faut une **page Circle publique** accessible sans compte.

```
src/app/[locale]/(routes)/circles/[slug]/page.tsx
```

**Contenu** (similaire à la page Circle dashboard, sans les contrôles Host) :
- Layout 2 colonnes (identique au design existant)
- Description, Hosts, stats (membres, Moments)
- Timeline des Moments à venir (cliquables → `/m/[slug]`)
- Pas de bouton Modifier/Supprimer
- CTA : "S'inscrire à cette Communauté" → s'inscrit au prochain Moment ou demande à rejoindre

**Note** : cette page peut réutiliser `MomentTimelineItem` existant (sans les liens dashboard).

---

## Formulaire Circle — Champs à ajouter

```
src/components/circles/circle-form.tsx
```

- **Catégorie** : `Select` avec les 8 valeurs de l'enum (obligatoire à la création)
- **Ville** : `Input` texte libre, placeholder "Paris, Lyon, Remote..." (optionnel, affiché sur les cards)

---

## i18n — Clés

```json
{
  "Explorer": {
    "title": "Découvrir",
    "description": "Des communautés qui partagent vos passions, des événements à ne pas manquer.",
    "navLink": "Découvrir",
    "tabs": {
      "circles": "Communautés",
      "moments": "Événements"
    },
    "filters": {
      "allCategories": "Toutes les thématiques"
    },
    "empty": {
      "circles": "Aucune Communauté publique pour cette thématique.",
      "moments": "Aucun événement à venir pour cette thématique."
    }
  },
  "CircleCategory": {
    "TECH": "Tech & IA",
    "DESIGN": "Product & Design",
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

Découvrir est accessible depuis :

1. **Header principal** : lien "Explorer" (FR) / "Explore" (EN) dans la nav (visible pour les utilisateurs connectés)
2. **Dashboard** : lien dans les empty states pour les Players sans Moment à venir
3. **Page `/m/[slug]`** : lien "Voir d'autres Communautés" (footer ou sidebar)
4. **URL directe `/explorer`** : accessible et indexable sans authentification

---

## SEO & indexation

- Page `/explorer` : indexable, `sitemap.xml`
- Pages Circle publiques `/circles/[slug]` : indexables, metadata dynamiques
- Pages Moment publiques `/m/[slug]` : déjà existantes et indexables
- `revalidate: 60` sur toutes les pages → fraîcheur sans rebuild complet

---

## Plan d'implémentation — Séquençage

| Étape | Tâche | Dépendances |
| --- | --- | --- |
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
| 11 | Ajouter lien "Découvrir" dans le header | Étape 9 |
| 12 | i18n FR + EN | Toutes |

---

## Décisions prises

| Décision | Raison |
| --- | --- |
| Tab par défaut : Communautés (pas Événements) | Community-first : on découvre d'abord une communauté, pas un événement |
| Ordre chronologique uniquement | Pas d'algorithme, pas de ranking — invariant positionnement |
| **Filtre MVP : catégorie uniquement (pas de ville)** | La densité par ville sera insuffisante au lancement. La catégorie est utile dès le premier Circle. Un filtre ville vide est pire qu'absent. |
| `city` = affichage uniquement en MVP | Enrichit les cards sans créer un filtre inutile. Filtre géographique post-MVP quand la densité le justifie. |
| `city` = string libre (pas enum) | Flexibilité MVP, normalisation post-MVP si besoin |
| `category` = nullable en DB, obligatoire en UI | Rétrocompatibilité + meilleure expérience à la création |
| Page Circle publique séparée du dashboard | Accès sans auth, SEO, parcours cold traffic |
| `revalidate: 60` sur `/explorer` | Fraîcheur acceptable sans rebuild, pas de full SSR dynamique |
| Pas de pagination complexe en MVP | `limit: 20` suffit pour le lancement |
| Renommage "Répertoire" → "La Carte" → "Découvrir" | Nom plus direct, cohérent avec l'action utilisateur |
