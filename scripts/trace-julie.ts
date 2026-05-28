/**
 * Trace user journey for julie.ramondougazo@i-bp.fr in PROD
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const TARGET_EMAIL = "julie.ramondougazo@i-bp.fr";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`\n=== USER (case-insensitive) ===`);
  const allUsersCi = await prisma.$queryRaw<
    Array<{
      id: string;
      email: string;
      createdAt: Date;
      emailVerified: Date | null;
      onboardingCompleted: boolean;
      welcomeEmailSentAt: Date | null;
      dashboardMode: string | null;
      name: string | null;
    }>
  >`SELECT id, email, name, "createdAt", "emailVerified", "onboardingCompleted", "welcome_email_sent_at" as "welcomeEmailSentAt", "dashboardMode"
    FROM users WHERE LOWER(email) = LOWER(${TARGET_EMAIL})`;
  console.log(`Found: ${allUsersCi.length}`);
  for (const u of allUsersCi) {
    console.log(`  id=${u.id}`);
    console.log(`  email=${u.email}`);
    console.log(`  name=${u.name ?? "null"}`);
    console.log(`  createdAt=${new Date(u.createdAt).toISOString()}`);
    console.log(`  emailVerified=${u.emailVerified ? new Date(u.emailVerified).toISOString() : "null"}`);
    console.log(`  onboardingCompleted=${u.onboardingCompleted}`);
    console.log(`  dashboardMode=${u.dashboardMode ?? "null"}`);
    console.log(`  welcomeEmailSentAt=${u.welcomeEmailSentAt ? new Date(u.welcomeEmailSentAt).toISOString() : "null"}`);
  }

  console.log(`\n=== VERIFICATION TOKENS (case-insensitive) ===`);
  const tokens = await prisma.$queryRaw<Array<{ identifier: string; token: string; expires: Date }>>`
    SELECT identifier, token, expires FROM verification_tokens
    WHERE LOWER(identifier) = LOWER(${TARGET_EMAIL})
    ORDER BY expires DESC`;
  console.log(`Found: ${tokens.length}`);
  for (const t of tokens) {
    console.log(`  identifier=${t.identifier}  expires=${new Date(t.expires).toISOString()}  token=${t.token.slice(0, 12)}...`);
  }

  if (allUsersCi.length === 0) {
    console.log(`\n(Pas de User → on s'arrête ici, le reste serait vide.)`);
    return;
  }

  for (const u of allUsersCi) {
    console.log(`\n--- Détails pour user ${u.id} ---`);

    const accounts = await prisma.$queryRaw<Array<{ provider: string; type: string; providerAccountId: string }>>`
      SELECT provider, type, "providerAccountId" FROM accounts WHERE "userId" = ${u.id}`;
    console.log(`  Accounts (OAuth): ${accounts.length}`);
    for (const a of accounts) console.log(`    - provider=${a.provider} type=${a.type}`);

    const sessions = await prisma.$queryRaw<Array<{ expires: Date; sessionToken: string }>>`
      SELECT expires, "sessionToken" FROM sessions WHERE "userId" = ${u.id} ORDER BY expires DESC`;
    console.log(`  Sessions: ${sessions.length}`);
    for (const s of sessions) console.log(`    - expires=${new Date(s.expires).toISOString()}`);

    const regs = await prisma.$queryRaw<Array<{ id: string; status: string; createdAt: Date; title: string; slug: string }>>`
      SELECT r.id, r.status, r."createdAt", m.title, m.slug
      FROM registrations r JOIN moments m ON m.id = r."momentId"
      WHERE r."userId" = ${u.id}
      ORDER BY r."createdAt" DESC`;
    console.log(`  Registrations: ${regs.length}`);
    for (const r of regs) console.log(`    - "${r.title}" (${r.slug}) status=${r.status} createdAt=${new Date(r.createdAt).toISOString()}`);

    const ms = await prisma.$queryRaw<Array<{ role: string; name: string; slug: string; createdAt: Date }>>`
      SELECT cm.role, c.name, c.slug, cm."createdAt"
      FROM circle_memberships cm JOIN circles c ON c.id = cm."circleId"
      WHERE cm."userId" = ${u.id}
      ORDER BY cm."createdAt" DESC`;
    console.log(`  Memberships: ${ms.length}`);
    for (const m of ms) console.log(`    - role=${m.role} circle="${m.name}" (${m.slug}) joined=${new Date(m.createdAt).toISOString()}`);
  }
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
