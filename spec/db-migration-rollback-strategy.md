# Stratégie de migrations DB et rollback — Production

> **Statut** : À implémenter avant lancement MVP
> **Priorité** : Bloquant pour la mise en production (infrastructure / sécurité données)
> **Contexte** : Actuellement `db:push` sans historique de migrations. Ce document spécifie la migration vers un workflow production-safe.

---

## Problème actuel

Le setup actuel utilise `prisma db push` sans fichiers de migration :

- **Pas de trace** des changements de schéma appliqués en prod
- **Pas de rollback SQL** automatique possible (pas de `migrate down`)
- **`db:push` peut être destructif** — si une colonne est supprimée du schema, Prisma supprime la colonne en prod (après confirmation, mais sans filet)
- **Aucune validation pré-déploiement** que le schema est bien en sync avec le code

---

## Solution en 2 axes

### Axe 1 — Passer à Prisma Migrate (versioning des migrations)

Remplacer `db:push` par `prisma migrate` pour avoir un historique versionné et déployable.

#### Étape 1 : Baseline des migrations existantes

À faire **une seule fois**, au moment de la bascule :

```bash
# Crée un fichier de migration "baseline" représentant le schéma actuel
# Sans l'appliquer (la DB est déjà dans cet état)
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0001_baseline/migration.sql

# Marquer la migration comme déjà appliquée dans la DB prod
npx prisma migrate resolve --applied 0001_baseline
```

Ce fichier `0001_baseline/migration.sql` contient le `CREATE TABLE` complet du schéma actuel. Il sert de point de départ versionné.

#### Étape 2 : Workflow migration forward-only

Pour tout changement de schéma futur :

```bash
# Dev : crée + applique une migration locale
pnpm db:migrate        # = prisma migrate dev --name <description>

# Prod : applique les migrations en attente (sans interactivité)
pnpm db:migrate:prod   # = prisma migrate deploy
```

`prisma migrate deploy` :
- N'est pas interactif
- N'applique que les migrations en attente (idempotent)
- Safe pour CI/CD
- Ne modifie jamais le schéma au-delà de ce qui est versionné

#### Étape 3 : Scripts pnpm à ajouter

| Commande | Description | Commande sous-jacente |
|----------|-------------|----------------------|
| `pnpm db:migrate` | Crée + applique une migration en dev | `prisma migrate dev` |
| `pnpm db:migrate:prod` | Applique les migrations en attente en prod | `prisma migrate deploy` |
| `pnpm db:migrate:status` | Vérifie l'état des migrations (quelles sont appliquées / en attente) | `prisma migrate status` |

#### Ce qu'on garde de db:push

`db:push` reste utile **uniquement** pour les environments éphémères (branches Neon de test, CI) où l'historique ne compte pas.

| Usage | Commande |
|-------|----------|
| Dev local (itération rapide) | `pnpm db:push` (inchangé) |
| Production / pre-prod | `pnpm db:migrate:prod` |
| CI tests d'intégration | `pnpm db:push` (branche Neon éphémère) |

---

### Axe 2 — Snapshots Neon + Point-in-Time Restore comme filet de sécurité

Même avec des migrations versionnées, Neon offre deux niveaux de protection supplémentaires.

#### Snapshot manuel pré-déploiement (recommandé)

Avant tout changement de schéma significatif en production, créer une branche Neon depuis `production` :

```bash
# Via CLI Neon (ou console Neon)
neon branches create \
  --name "pre-migration-$(date +%Y%m%d-%H%M)" \
  --parent production
```

- **Instantané** (copy-on-write, zéro coût initial)
- La branche snapshot reste disponible pendant 7 jours minimum
- En cas de problème : pointer `DATABASE_URL` vers la branche snapshot, rollback immédiat

À ajouter dans les scripts pnpm :

```bash
pnpm db:snapshot   # = neon branches create --name pre-migration-$(date +%Y%m%d) --parent production
```

#### Point-in-Time Restore (PITR)

Neon conserve l'historique WAL (Write-Ahead Log) et permet de restaurer une branche à n'importe quel instant passé.

- **Console Neon** → sélectionner la branche `production` → "Restore" → choisir le timestamp
- Précision : à la **seconde** près
- Rétention par défaut : **7 jours** (configurable selon le plan Neon)

Cas d'usage :
- Migration appliquée avec succès mais data corrompue post-déploiement
- Bug applicatif ayant écrit des données incorrectes
- Suppression accidentelle de données

---

## Workflow complet recommandé pour un déploiement en prod

```
1. [Dev] Modifier prisma/schema.prisma
2. [Dev] pnpm db:migrate            → crée migrations/XXXX_description/migration.sql
3. [Dev] Tester en local
4. [Avant deploy] pnpm db:snapshot  → branche Neon "pre-migration-YYYYMMDD"
5. [Deploy] pnpm db:migrate:prod    → applique les migrations en attente
6. [Post deploy] pnpm db:migrate:status → vérifier que tout est appliqué
7. [Si problème] Restaurer depuis la branche snapshot ou PITR
```

---

## Validation du titre d'un Moment (sujet connexe)

La limite de 200 caractères sur le titre d'un Moment est actuellement **uniquement côté client** (`maxLength={200}` sur l'input HTML). Elle peut être bypassée via un appel direct à la Server Action.

**À corriger en même temps** :

1. Ajouter une validation Zod dans les usecases `CreateMoment` et `UpdateMoment` :

```typescript
// domain/usecases/create-moment.ts
import { z } from "zod";

const CreateMomentInput = z.object({
  title: z.string().min(1).max(200),
  // ...
});
```

2. Optionnellement, encoder la contrainte en DB via une `CHECK` constraint dans la migration :

```sql
ALTER TABLE moments ADD CONSTRAINT moments_title_length CHECK (char_length(title) <= 200);
```

---

## Critères d'acceptance

- [ ] Baseline migration créée et résolue en prod (`0001_baseline`)
- [ ] `pnpm db:migrate` fonctionne en dev
- [ ] `pnpm db:migrate:prod` fonctionne (non interactif, safe pour CI)
- [ ] `pnpm db:migrate:status` affiche l'état des migrations
- [ ] `pnpm db:snapshot` crée une branche Neon de sauvegarde avant migration
- [ ] Validation titre Moment dans les usecases (max 200 chars)
- [ ] CLAUDE.md + BACKLOG mis à jour avec les nouveaux scripts
- [ ] README ou doc interne sur le workflow deploy

---

## Références

- [Prisma Migrate deploy (CI/CD)](https://www.prisma.io/docs/orm/prisma-migrate/workflows/team-development)
- [Prisma Migrate baseline](https://www.prisma.io/docs/orm/prisma-migrate/getting-started)
- [Neon Branching](https://neon.tech/docs/introduction/branching)
- [Neon Point-in-Time Restore](https://neon.tech/docs/guides/branching-pitr)
