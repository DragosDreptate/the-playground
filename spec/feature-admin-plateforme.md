# Admin plateforme — Spec d'implémentation

> Interface d'administration pour la gestion globale de la plateforme.
> Pages `/admin/*`, réservées aux utilisateurs avec `role: ADMIN`.
>
> Référence backlog : section "Admin plateforme"

---

## Vision produit

L'admin plateforme permet à l'équipe The Playground de :

- **Superviser** l'activité globale (stats, tendances)
- **Consulter** les utilisateurs, Circles et Moments
- **Modérer** en supprimant du contenu ou en forçant l'annulation d'un Moment
- **Débloquer** des situations (supprimer un utilisateur problématique, nettoyer des données)

**Ce que ce n'est pas** : un outil Host. Les outils Host (co-Hosts, gestion membres, stats Circle) sont une feature séparée, pas encore implémentée.

---

## Modèle de rôle

### Champ `role` sur User

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  // ... champs existants ...
  role  UserRole  @default(USER)
}
```

- Tout utilisateur est `USER` par défaut
- La promotion `ADMIN` se fait manuellement en base (pas d'UI de promotion)
- Admin dev : `ddreptate@gmail.com`

### Niveaux de protection

| Niveau | Mécanisme | Ce qu'il protège |
|--------|-----------|------------------|
| Layout | `session.user.role !== "ADMIN"` → `redirect("/")` | Routes admin (Server Component) |
| Server actions | `requireAdmin()` → retourne erreur `ADMIN_UNAUTHORIZED` | Mutations admin |
| Usecases | `callerRole !== "ADMIN"` → throw `AdminUnauthorizedError` | Logique métier admin |

Triple vérification : même si l'UI est contournée, les données restent protégées.

---

## Architecture hexagonale

### Port : `AdminRepository`

```
src/domain/ports/repositories/admin-repository.ts
```

Port dédié aux requêtes transversales admin. Séparé des ports domaine existants (CircleRepository, MomentRepository, etc.) car les requêtes admin sont cross-domain et ne suivent pas les mêmes patterns d'accès.

#### Interface (13 méthodes)

```typescript
interface AdminRepository {
  // Stats
  getStats(): Promise<AdminStats>;

  // Users
  findAllUsers(filters: AdminUserFilters): Promise<AdminUserRow[]>;
  countUsers(filters: AdminUserFilters): Promise<number>;
  findUserById(id: string): Promise<AdminUserDetail | null>;
  deleteUser(id: string): Promise<void>;

  // Circles
  findAllCircles(filters: AdminCircleFilters): Promise<AdminCircleRow[]>;
  countCircles(filters: AdminCircleFilters): Promise<number>;
  findCircleById(id: string): Promise<AdminCircleDetail | null>;
  deleteCircle(id: string): Promise<void>;

  // Moments
  findAllMoments(filters: AdminMomentFilters): Promise<AdminMomentRow[]>;
  countMoments(filters: AdminMomentFilters): Promise<number>;
  findMomentById(id: string): Promise<AdminMomentDetail | null>;
  deleteMoment(id: string): Promise<void>;
  updateMomentStatus(id: string, status: MomentStatus): Promise<void>;
}
```

#### Types

**Stats** :
```typescript
type AdminStats = {
  totalUsers: number;
  totalCircles: number;
  totalMoments: number;
  totalRegistrations: number;
  recentUsers: number;        // 7 derniers jours
  recentCircles: number;
  recentMoments: number;
};
```

**Filtres** (3 types, même pattern) :
- `AdminUserFilters` : `search?`, `role?`, `limit?`, `offset?`
- `AdminCircleFilters` : `search?`, `visibility?`, `category?`, `limit?`, `offset?`
- `AdminMomentFilters` : `search?`, `status?`, `limit?`, `offset?`

**Rows** (listes paginées) :
- `AdminUserRow` : `id`, `email`, `firstName`, `lastName`, `role`, `circleCount`, `momentCount`, `createdAt`
- `AdminCircleRow` : `id`, `slug`, `name`, `visibility`, `category`, `city`, `memberCount`, `momentCount`, `hostName`, `createdAt`
- `AdminMomentRow` : `id`, `slug`, `title`, `status`, `circleName`, `registrationCount`, `capacity`, `startsAt`, `createdAt`

**Details** (pages de détail) :
- `AdminUserDetail` : extends `AdminUserRow` + `name`, `image`, `onboardingCompleted`, `registrationCount`, `circles[]`
- `AdminCircleDetail` : extends `AdminCircleRow` + `description`, `hosts[]`, `recentMoments[]` (10 derniers)
- `AdminMomentDetail` : extends `AdminMomentRow` + `description`, `circleId`, `circleSlug`, `createdByEmail`, `createdByName`, `registrations[]`

### Adapter : `PrismaAdminRepository`

```
src/infrastructure/repositories/prisma-admin-repository.ts
```

**Particularités** :
- `getStats()` : 7 queries en `Promise.all()`, helper pour les "7 derniers jours"
- Recherche : `OR` sur email/firstName/lastName (users), name/slug (circles), title/slug (moments), case-insensitive via `mode: "insensitive"`
- `deleteUser()` : transaction Prisma cascade — supprime les Circles où l'utilisateur est seul Host, puis supprime l'utilisateur
- `deleteCircle()` : cascade Prisma naturelle (memberships, moments, registrations)
- `deleteMoment()` : cascade Prisma naturelle (registrations, comments)

### Usecases (11 fichiers)

```
src/domain/usecases/admin/
```

| Fichier | Signature | Description |
|---------|-----------|-------------|
| `get-admin-stats.ts` | `getAdminStats(callerRole, deps)` | Stats globales plateforme |
| `get-admin-users.ts` | `getAdminUsers(callerRole, filters, deps)` | Liste utilisateurs paginée |
| `get-admin-user.ts` | `getAdminUser(callerRole, userId, deps)` | Détail utilisateur |
| `admin-delete-user.ts` | `adminDeleteUser(callerRole, userId, deps)` | Supprimer un utilisateur |
| `get-admin-circles.ts` | `getAdminCircles(callerRole, filters, deps)` | Liste Circles paginée |
| `get-admin-circle.ts` | `getAdminCircle(callerRole, circleId, deps)` | Détail Circle |
| `admin-delete-circle.ts` | `adminDeleteCircle(callerRole, circleId, deps)` | Supprimer un Circle |
| `get-admin-moments.ts` | `getAdminMoments(callerRole, filters, deps)` | Liste Moments paginée |
| `get-admin-moment.ts` | `getAdminMoment(callerRole, momentId, deps)` | Détail Moment |
| `admin-delete-moment.ts` | `adminDeleteMoment(callerRole, momentId, deps)` | Supprimer un Moment |
| `admin-update-moment-status.ts` | `adminUpdateMomentStatus(callerRole, momentId, status, deps)` | Forcer annulation (PUBLISHED → CANCELLED) |

**Pattern commun** :
```typescript
export async function adminXxx(
  callerRole: UserRole,
  // ... params
  deps: { adminRepository: AdminRepository }
): Promise<Result> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  return deps.adminRepository.xxx(...);
}
```

---

## Server actions

```
src/app/actions/admin.ts
```

14 fonctions exportées, toutes suivent le même pattern :

```typescript
export async function xxxAction(...): Promise<ActionResult<T>> {
  const admin = await requireAdmin();
  if (!admin.success) return admin;

  try {
    const result = await usecase(admin.role, ..., { adminRepository: prismaAdminRepository });
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}
```

- `requireAdmin()` : vérifie session + rôle ADMIN
- Mutations appellent `revalidatePath("/admin")` après succès

---

## Pages & UI

### Layout admin

```
src/app/[locale]/(routes)/admin/layout.tsx
```

- Guard : `session.user.role !== "ADMIN"` → `redirect("/")`
- Layout : sidebar fixe (gauche) + main content (droite, `max-w-6xl`)
- `AdminSidebar` : navigation Dashboard / Utilisateurs / Cercles / Escales + lien "Retour au site"

### Pages (7 routes + layout)

| Route | Contenu |
|-------|---------|
| `/admin` | Dashboard : 4 cartes stats (Users, Circles, Moments, Inscriptions) + deltas "cette semaine" |
| `/admin/users` | Table paginée (20/page) : nom, email, rôle badge, circles, moments, date inscription. Recherche |
| `/admin/users/[id]` | Détail : infos personnelles, rôle, onboarding, membre depuis, liste des Circles avec rôle. Bouton supprimer |
| `/admin/circles` | Table paginée (20/page) : nom, organisateur, membres, moments, visibilité, catégorie, date. Recherche |
| `/admin/circles/[id]` | Détail : slug, visibilité, catégorie, ville, date création, Hosts, 10 Moments récents. Bouton supprimer |
| `/admin/moments` | Table paginée (20/page) : titre, circle, date, statut badge, inscrits/capacité, date. Recherche |
| `/admin/moments/[id]` | Détail : slug, circle (lien), créateur, statut, date, capacité, description, liste inscriptions. Bouton forcer annulation + supprimer |

### Composants partagés

- `AdminSidebar` : navigation sidebar
- `AdminSearch` : input de recherche (met à jour URL `?search=...`)
- `AdminPagination` : navigation pages (URL `?page=N`)
- `StatsCard` : carte stat avec icône + delta hebdomadaire

### Design

- Tables : composants shadcn/ui (`Table`, `TableHeader`, `TableRow`, `TableCell`)
- Badges : statuts (PUBLISHED/CANCELLED/PAST), rôles (ADMIN/USER), visibilité (PUBLIC/PRIVATE)
- Boutons destructifs : modale de confirmation (`AlertDialog`) avant suppression/annulation
- Layout responsive : sidebar collapse sur mobile

---

## Cascading delete — Règles métier

### Suppression utilisateur

```
Transaction Prisma :
1. Trouver les Circles où l'utilisateur est HOST
2. Pour chaque Circle :
   - Compter les autres Hosts
   - Si seul Host → supprimer le Circle entier (cascade moments, registrations, etc.)
3. Supprimer l'utilisateur (cascade memberships, registrations restantes, comments)
```

### Suppression Circle

Cascade Prisma naturelle : supprime memberships, moments (+ leurs registrations, comments).

### Suppression Moment

Cascade Prisma naturelle : supprime registrations, comments.

### Forcer annulation Moment

Met le statut à `CANCELLED`. Uniquement possible sur les Moments `PUBLISHED`.
Ne supprime pas les inscriptions existantes (elles restent visibles dans l'historique).

---

## i18n

### Namespace `"Admin"`

~70 clés couvrant :
- Navigation : `title`, `dashboard`, `users`, `circles`, `moments`, `backToSite`
- Stats : `totalUsers`, `totalCircles`, `totalMoments`, `totalRegistrations`, `thisWeek`
- Tables : `search`, `noResults`, `previous`, `next`, `showing`
- Actions : `delete`, `cancel`, `confirmDelete`, `confirmCancel`, `cancelMoment`, `view`
- Détails : `userDetail.*`, `circleDetail.*`, `momentDetail.*`
- Colonnes : `columns.*` (name, email, role, circles, moments, etc.)

Les termes domaine suivent la convention de nommage : Circle → Cercle (FR), Moment → Escale (FR).

---

## Fichiers

### Nouveaux

| Fichier | Rôle |
|---------|------|
| `src/domain/ports/repositories/admin-repository.ts` | Port AdminRepository (interface + 15 types) |
| `src/infrastructure/repositories/prisma-admin-repository.ts` | Adapter Prisma |
| `src/domain/usecases/admin/*.ts` | 11 usecases admin |
| `src/app/actions/admin.ts` | 14 server actions |
| `src/app/[locale]/(routes)/admin/layout.tsx` | Layout + guard admin |
| `src/app/[locale]/(routes)/admin/page.tsx` | Dashboard stats |
| `src/app/[locale]/(routes)/admin/users/page.tsx` | Liste utilisateurs |
| `src/app/[locale]/(routes)/admin/users/[id]/page.tsx` | Détail utilisateur |
| `src/app/[locale]/(routes)/admin/circles/page.tsx` | Liste Circles |
| `src/app/[locale]/(routes)/admin/circles/[id]/page.tsx` | Détail Circle |
| `src/app/[locale]/(routes)/admin/moments/page.tsx` | Liste Moments |
| `src/app/[locale]/(routes)/admin/moments/[id]/page.tsx` | Détail Moment |
| Composants : `AdminSidebar`, `AdminSearch`, `AdminPagination`, `StatsCard` | UI partagée |

### Modifiés

| Fichier | Changement |
|---------|-----------|
| `prisma/schema.prisma` | Ajout enum `UserRole` + champ `role` sur User |
| `messages/fr.json` | Ajout namespace `"Admin"` (~70 clés) |
| `messages/en.json` | Ajout namespace `"Admin"` (~70 clés) |

---

## Décisions prises

| Décision | Raison |
|----------|--------|
| Port `AdminRepository` séparé | Requêtes transversales cross-domain, pas dans les ports existants |
| Triple vérification (layout + server action + usecase) | Defense in depth — même si l'UI est contournée |
| Promotion ADMIN manuelle (SQL) | Pas besoin d'UI de promotion dans le MVP |
| Cascade transaction pour deleteUser | Éviter les orphelins (Circles sans Host) |
| Pagination 20 items/page | Équilibre lisibilité / performance |
| Recherche case-insensitive | UX — l'admin ne devrait pas avoir à deviner la casse |
| Pas de soft delete | MVP — la suppression est définitive, avec confirmation modale |

---

## Évolutions futures

- UI de promotion/dépomotion ADMIN (éviter le SQL manuel)
- Historique des actions admin (audit log)
- Filtres avancés (date, tranche d'activité)
- Export admin (CSV des utilisateurs, Circles, etc.)
- Impersonation admin (se connecter "en tant que" un utilisateur)
