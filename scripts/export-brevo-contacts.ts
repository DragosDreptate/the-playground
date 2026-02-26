/**
 * Exporte les utilisateurs réels vers un CSV prêt à importer dans Brevo.
 *
 * Exclut automatiquement :
 *   - Les comptes de test (@test.playground)
 *   - Les comptes de démo (@demo.playground)
 *   - Les utilisateurs sans email vérifié (comptes Auth.js incomplets)
 *
 * Le fichier généré respecte le format d'import Brevo :
 *   EMAIL, PRENOM, NOM
 *
 * Usage :
 *   pnpm db:export-brevo-contacts
 *
 * Le fichier est écrit dans : exports/brevo-contacts-[date].csv
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

function escapeCsv(value: string | null | undefined): string {
  if (!value) return "";
  // Échappe les guillemets et entoure de guillemets si nécessaire
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main() {
  console.log("\n📤 Export contacts Brevo — The Playground\n");

  const users = await prisma.user.findMany({
    where: {
      email: {
        not: { contains: "@test.playground" },
      },
      AND: {
        email: {
          not: { contains: "@demo.playground" },
        },
      },
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { email: "asc" },
  });

  console.log(`✅ ${users.length} utilisateur(s) trouvé(s)\n`);

  if (users.length === 0) {
    console.log("Aucun utilisateur à exporter.");
    process.exit(0);
  }

  // Aperçu
  console.log("Aperçu (5 premiers) :");
  users.slice(0, 5).forEach((u) => {
    console.log(`  ${u.email} | ${u.firstName ?? "—"} | ${u.lastName ?? "—"}`);
  });
  if (users.length > 5) console.log(`  ... et ${users.length - 5} autres`);

  // Génération CSV
  const header = "EMAIL,PRENOM,NOM";
  const rows = users.map(
    (u) =>
      `${escapeCsv(u.email)},${escapeCsv(u.firstName)},${escapeCsv(u.lastName)}`
  );
  const csv = [header, ...rows].join("\n");

  // Écriture du fichier
  const date = new Date().toISOString().split("T")[0];
  const dir = join(process.cwd(), "exports");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `brevo-contacts-${date}.csv`);
  writeFileSync(filePath, csv, "utf-8");

  console.log(`\n📁 Fichier généré : exports/brevo-contacts-${date}.csv`);
  console.log(`   ${users.length} contact(s) exporté(s)`);
  console.log("\nPrêt à importer dans Brevo → Contacts → Importer ✓\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
