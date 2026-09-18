/**
 * Purge de la base E2E, exécutée en tête de `globalSetup`.
 *
 * But : la suite ne doit dépendre d'AUCUNE donnée préexistante. Avant ce
 * mécanisme, la CI clonait la base de développement et héritait de son état ;
 * le 18/09/2026, une PR sans rapport est tombée parce que cette base n'avait
 * plus un seul événement à venir.
 *
 * Toute la sûreté repose sur `purge-guard.ts` : voir la règle fail-closed. En
 * local, la purge est refusée et le setup continue sans elle.
 */
import type { PrismaClient } from "@prisma/client";

import { evaluatePurgeFromEnv } from "./purge-guard";

type PurgeOutcome =
  | { purged: true; tables: number }
  | { purged: false; reason: string; intended: boolean };

export async function purgeDatabase(prisma: PrismaClient): Promise<PurgeOutcome> {
  const decision = evaluatePurgeFromEnv();
  if (!decision.allowed) {
    return {
      purged: false,
      reason: decision.reason ?? "refusée",
      intended: decision.intended,
    };
  }

  // Liste lue dans le catalogue plutôt que maintenue à la main : une table
  // ajoutée au schéma et oubliée ici laisserait des données derrière elle,
  // et la dépendance cachée que ce chantier supprime reviendrait par la porte
  // de service.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'
  `;
  if (tables.length === 0) {
    return { purged: false, reason: "aucune table trouvée", intended: true };
  }

  const quoted = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  // CASCADE : l'ordre des clés étrangères n'a pas à être connu.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

  return { purged: true, tables: tables.length };
}
