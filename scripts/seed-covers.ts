/**
 * Assigne automatiquement une image de couverture Unsplash aux Circles et
 * Moments qui n'en ont pas encore.
 *
 * Modes :
 *   --dry-run (défaut) : affiche les images qui seraient assignées, sans écrire en DB
 *   --execute          : télécharge vers Vercel Blob + met à jour la DB
 *
 * Env requis :
 *   DATABASE_URL          : URL Prisma (utilise .env.local par défaut, surchargeable)
 *   UNSPLASH_ACCESS_KEY   : clé API Unsplash
 *   BLOB_READ_WRITE_TOKEN : token Vercel Blob (requis uniquement en mode --execute)
 *
 * Usage dev   : pnpm tsx scripts/seed-covers.ts
 * Usage prod  : DATABASE_URL=<prod_url> BLOB_READ_WRITE_TOKEN=<token> pnpm tsx scripts/seed-covers.ts
 * Exécution   : pnpm tsx scripts/seed-covers.ts --execute
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // Sans effet si les vars sont déjà définies dans l'env

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { put } from "@vercel/blob";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});
const args = process.argv.slice(2);
const isDryRun = !args.includes("--execute");

// ── Mapping catégorie → query Unsplash ──────────────────────────────────────

const CATEGORY_QUERIES: Record<string, string> = {
  TECH: "technology workspace coding",
  DESIGN: "design creative studio",
  BUSINESS: "business meeting professional",
  SPORT_WELLNESS: "fitness sport wellness",
  ART_CULTURE: "art culture painting",
  SCIENCE_EDUCATION: "science education learning",
  SOCIAL: "community people gathering",
  OTHER: "community group diverse",
};

// ── Types ────────────────────────────────────────────────────────────────────

type UnsplashPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  author: { name: string; profileUrl: string };
};

type ResultEntry = {
  id: string;
  name: string;
  query: string;
  photo: UnsplashPhoto | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// Cache des résultats Unsplash par query — évite les doublons de requêtes
const unsplashCache = new Map<string, UnsplashPhoto[]>();

async function searchUnsplash(query: string, count = 5): Promise<UnsplashPhoto[]> {
  if (unsplashCache.has(query)) return unsplashCache.get(query)!;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) throw new Error("UNSPLASH_ACCESS_KEY manquante");

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "squarish");
  url.searchParams.set("per_page", String(count));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!res.ok) {
    console.error(`    ⚠  Unsplash error ${res.status} pour "${query}"`);
    unsplashCache.set(query, []);
    return [];
  }

  const data = await res.json();
  const photos: UnsplashPhoto[] = (data.results ?? []).map(
    (p: { id: string; urls: { regular: string; thumb: string }; user: { name: string; links: { html: string } } }) => ({
      id: p.id,
      url: p.urls.regular,
      thumbUrl: p.urls.thumb,
      author: { name: p.user.name, profileUrl: p.user.links.html },
    })
  );

  unsplashCache.set(query, photos);
  await sleep(400); // délai après chaque vraie requête API
  return photos;
}

async function uploadToBlob(imageUrl: string, filename: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Impossible de télécharger l'image : ${imageUrl}`);
  const buffer = await res.arrayBuffer();
  const { url } = await put(filename, Buffer.from(buffer), {
    access: "public",
    contentType: "image/jpeg",
  });
  return url;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pad(str: string, len: number) {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

// ── Traitement d'un item ─────────────────────────────────────────────────────

async function processItem(
  label: string,
  query: string,
  photoIndex: number,
  onExecute: (photo: UnsplashPhoto) => Promise<void>
): Promise<UnsplashPhoto | null> {
  const photos = await searchUnsplash(query, 10);
  const photo = photos[photoIndex % photos.length] ?? null;

  if (!photo) {
    console.log(`  ✗ ${label}`);
    console.log(`    Query   : "${query}"`);
    console.log(`    Résultat: aucune image trouvée\n`);
    return null;
  }

  console.log(`  ✓ ${label}`);
  console.log(`    Query   : "${query}" [photo ${photoIndex + 1}/${photos.length}]`);
  console.log(`    Aperçu  : ${photo.thumbUrl}`);
  console.log(`    Auteur  : ${photo.author.name} — ${photo.author.profileUrl}`);

  if (!isDryRun) {
    await onExecute(photo);
  }

  console.log();
  return photo;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─".repeat(60));
  console.log(
    `🎨  Seed covers — mode ${isDryRun ? "DRY-RUN (lecture seule)" : "EXECUTE (écriture DB + Blob)"}`
  );
  console.log("─".repeat(60));

  // ── Circles ────────────────────────────────────────────────────────────────

  const circles = await prisma.circle.findMany({
    where: { coverImage: null },
    select: { id: true, name: true, category: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n${"═".repeat(50)}`);
  console.log(`  CIRCLES SANS COVER : ${circles.length}`);
  console.log(`${"═".repeat(50)}\n`);

  const circleResults: ResultEntry[] = [];
  // Compteur par query pour varier les photos entre circles de même catégorie
  const queryCounters = new Map<string, number>();

  for (const circle of circles) {
    const query = circle.category
      ? (CATEGORY_QUERIES[circle.category] ?? circle.name)
      : circle.name;

    const idx = queryCounters.get(query) ?? 0;
    queryCounters.set(query, idx + 1);

    const photo = await processItem(
      `${circle.name} [${circle.category ?? "sans catégorie"}]`,
      query,
      idx,
      async (p) => {
        const blobUrl = await uploadToBlob(p.url, `covers/circle-${circle.id}-${Date.now()}.jpg`);
        await prisma.circle.update({
          where: { id: circle.id },
          data: {
            coverImage: blobUrl,
            coverImageAttribution: { name: p.author.name, url: p.author.profileUrl },
          },
        });
        console.log(`    ✅ Blob : ${blobUrl}`);
      }
    );

    circleResults.push({ id: circle.id, name: circle.name, query, photo });
    // Pas de sleep ici — déjà géré dans searchUnsplash (uniquement sur vraie requête API)
  }

  // ── Moments ────────────────────────────────────────────────────────────────

  const moments = await prisma.moment.findMany({
    where: { coverImage: null },
    select: {
      id: true,
      title: true,
      slug: true,
      circle: { select: { name: true, category: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  console.log(`\n${"═".repeat(50)}`);
  console.log(`  MOMENTS SANS COVER : ${moments.length}`);
  console.log(`${"═".repeat(50)}\n`);

  const momentResults: ResultEntry[] = [];
  // Stratégie : chercher par catégorie du Circle parent (1 req/catégorie, résultats mis en cache)
  // et faire tourner les photos entre moments de la même catégorie.
  // Cela réduit les appels Unsplash de N_moments à N_catégories (≤ 8).

  for (const moment of moments) {
    const query = moment.circle.category
      ? (CATEGORY_QUERIES[moment.circle.category] ?? moment.circle.name)
      : moment.circle.name;

    const idx = queryCounters.get(query) ?? 0;
    queryCounters.set(query, idx + 1);

    const photo = await processItem(
      `${moment.title} (Circle: ${moment.circle.name})`,
      query,
      idx,
      async (p) => {
        const blobUrl = await uploadToBlob(p.url, `covers/moment-${moment.id}-${Date.now()}.jpg`);
        await prisma.moment.update({
          where: { id: moment.id },
          data: {
            coverImage: blobUrl,
            coverImageAttribution: { name: p.author.name, url: p.author.profileUrl },
          },
        });
        console.log(`    ✅ Blob : ${blobUrl}`);
      }
    );

    momentResults.push({ id: moment.id, name: moment.title, query, photo });
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────

  const circlesOk = circleResults.filter((r) => r.photo).length;
  const momentsOk = momentResults.filter((r) => r.photo).length;
  const circlesMissed = circleResults.filter((r) => !r.photo).length;
  const momentsMissed = momentResults.filter((r) => !r.photo).length;
  const total = circlesOk + momentsOk;

  console.log(`\n${"═".repeat(50)}`);
  console.log("  RÉSUMÉ");
  console.log(`${"═".repeat(50)}\n`);
  console.log(`  ${pad("Circles", 12)}: ${circlesOk} image(s) trouvée(s), ${circlesMissed} introuvable(s)`);
  console.log(`  ${pad("Moments", 12)}: ${momentsOk} image(s) trouvée(s), ${momentsMissed} introuvable(s)`);
  console.log(`  ${pad("Total", 12)}: ${total} cover(s) ${isDryRun ? "prête(s) à appliquer" : "appliquée(s) en DB"}`);

  if (isDryRun) {
    console.log(`
⚠️  Mode dry-run — aucune modification effectuée.

   Pour appliquer sur la DB dev :
     pnpm tsx scripts/seed-covers.ts --execute

   Pour appliquer sur la DB prod :
     DATABASE_URL=<prod_url> BLOB_READ_WRITE_TOKEN=<token> \\
     UNSPLASH_ACCESS_KEY=<key> pnpm tsx scripts/seed-covers.ts --execute
`);
  } else {
    console.log(`\n✅  ${total} cover(s) uploadée(s) dans Vercel Blob et enregistrée(s) en DB.\n`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\n❌ Erreur fatale :", err);
  await prisma.$disconnect();
  process.exit(1);
});
