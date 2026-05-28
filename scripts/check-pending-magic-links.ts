/**
 * Lecture seule : magic links envoyés dans les dernières 24h
 * et non activés (token toujours présent dans la table).
 *
 * Pour chaque destinataire, on enrichit avec :
 *  - existence du User en DB
 *  - emailVerified, onboardingCompleted, createdAt
 *  - nombre de sessions actives
 *  - providers OAuth liés
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tokens = await prisma.$queryRaw<
    Array<{ identifier: string; expires: Date }>
  >`SELECT identifier, expires FROM verification_tokens
    WHERE expires BETWEEN ${now} AND ${in24h}
    ORDER BY expires ASC`;

  console.log(`\n=== Magic links non activés (envoyés dans les 24h) ===`);
  console.log(`Total : ${tokens.length}\n`);

  if (tokens.length === 0) return;

  const uniqueIdentifiers = [...new Set(tokens.map((t) => t.identifier))];

  for (const identifier of uniqueIdentifiers) {
    const myTokens = tokens.filter((t) => t.identifier === identifier);
    console.log(`\n────────────────────────────────────────────`);
    console.log(`📧 ${identifier}  (${myTokens.length} magic link(s) pending)`);
    for (const t of myTokens) {
      const sentAt = new Date(t.expires.getTime() - 24 * 60 * 60 * 1000);
      const ageMin = Math.round((now.getTime() - sentAt.getTime()) / 60000);
      console.log(`   sent at ${sentAt.toISOString()}  (${ageMin} min ago)`);
    }

    const user = await prisma.$queryRaw<
      Array<{
        id: string;
        createdAt: Date;
        emailVerified: Date | null;
        onboardingCompleted: boolean;
        name: string | null;
      }>
    >`SELECT id, "createdAt", "emailVerified", "onboardingCompleted", name
      FROM users WHERE LOWER(email) = LOWER(${identifier})`;

    if (user.length === 0) {
      console.log(`   ❌ Pas de User en DB → magic link jamais validé`);
      continue;
    }

    const u = user[0];
    console.log(`   ✅ User existe`);
    console.log(`      id=${u.id}`);
    console.log(`      name=${u.name ?? "null"}`);
    console.log(`      createdAt=${u.createdAt.toISOString()}`);
    console.log(
      `      emailVerified=${u.emailVerified ? u.emailVerified.toISOString() : "null"}`,
    );
    console.log(`      onboardingCompleted=${u.onboardingCompleted}`);

    const accounts = await prisma.$queryRaw<
      Array<{ provider: string; type: string }>
    >`SELECT provider, type FROM accounts WHERE "userId" = ${u.id}`;
    console.log(
      `      OAuth providers: ${accounts.length === 0 ? "(none)" : accounts.map((a) => a.provider).join(", ")}`,
    );

    const sessions = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*)::bigint as count FROM sessions WHERE "userId" = ${u.id} AND expires > NOW()`;
    console.log(`      Active sessions: ${sessions[0].count}`);
  }
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
