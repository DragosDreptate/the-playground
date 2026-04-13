/**
 * Backfill one-shot : envoyer la lettre du fondateur aux utilisateurs existants.
 *
 * Contexte : l'email applicatif `onboarding-welcome` est envoyé en différé
 * (J+1) par le cron /api/cron/send-onboarding-welcome. Pour les utilisateurs
 * déjà inscrits après la campagne Brevo du 12/03/2026 (lettre ambassadeur),
 * on envoie la lettre via ce script one-shot.
 *
 * Cutoff : utilisateurs inscrits après le 12/03/2026 (avant cette date, ils
 * ont déjà reçu la lettre ambassadeur via Brevo — pas de doublon).
 *
 * Exclusions manuelles :
 *  - Les emails @test.playground / @demo.playground (filtre endsWith)
 *  - Les admins (role = ADMIN) — ils voient déjà tout depuis l'intérieur
 *  - Une liste codée en dur (famille, tests throwaway, multi-compte fondateur)
 *
 * Idempotence : les users avec welcomeEmailSentAt != null sont filtrés.
 * Safe à relancer — aucun doublon possible.
 *
 * Mode dry-run (défaut) : affiche la liste des envois prévus sans envoyer.
 * Mode execute          : envoie réellement les emails + marque welcomeEmailSentAt.
 *
 * Usage dev  : pnpm db:send-onboarding-welcome-backfill [--execute]
 * Usage prod : pnpm db:send-onboarding-welcome-backfill:prod [--execute]
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { OnboardingWelcomeEmail } from "../src/infrastructure/services/email/templates/onboarding-welcome";
import { onboardingWelcomeContent } from "../src/content/emails/onboarding-welcome.content";
import { getOnboardingSender } from "../src/infrastructure/services/email/resend-email-service";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const IS_EXECUTE = process.argv.includes("--execute");

// Cutoff : après la campagne Brevo du 12/03/2026 (lettre ambassadeur)
// La campagne du 18/03 était la newsletter produit — les users inscrits entre
// le 12/03 et le 17/03 n'ont donc PAS reçu la lettre fondateur : ils doivent
// être inclus dans le backfill.
const BREVO_FOUNDER_LETTER_DATE = new Date("2026-03-12T00:00:00.000Z");

// Exclusions manuelles — codées en dur, pas d'ambiguïté, pas de config externe.
const EXCLUDED_EMAILS = [
  "dragos.dreptate@gmail.com", // fondateur principal
  "dragos@thespark.fr", // alt fondateur
  "darie.dreptate@gmail.com", // famille
  "swykin.ed@gmail.com", // famille (Edouard Dreptate)
  "ddreptate@mailinator.com", // test throwaway
  "testeric@yopmail.com", // test throwaway
];

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("─────────────────────────────────────────────────────────");
  console.log(
    IS_EXECUTE
      ? "🚀 MODE EXECUTE — envoi réel de la lettre du fondateur"
      : "🔍 MODE DRY-RUN — aucun email envoyé"
  );
  console.log(`   Cutoff : utilisateurs inscrits après ${BREVO_FOUNDER_LETTER_DATE.toISOString()}`);
  console.log(`   Expéditeur : ${getOnboardingSender()}`);
  console.log(`   Reply-to   : ${onboardingWelcomeContent.replyTo}`);
  console.log("─────────────────────────────────────────────────────────\n");

  const users = await prisma.user.findMany({
    where: {
      onboardingCompleted: true,
      welcomeEmailSentAt: null,
      createdAt: { gte: BREVO_FOUNDER_LETTER_DATE },
      role: { not: "ADMIN" },
      email: { notIn: EXCLUDED_EMAILS },
      AND: [
        { email: { not: { endsWith: "@test.playground" } } },
        { email: { not: { endsWith: "@demo.playground" } } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("✅ Aucun utilisateur éligible. Rien à faire.");
    return;
  }

  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│  ENVOIS PRÉVUS                                                              │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  for (const user of users) {
    const displayName = user.firstName ?? "(sans prénom)";
    const createdAt = user.createdAt.toISOString().slice(0, 10);
    console.log(`  ✉️  → ${user.email.padEnd(40)} ${displayName.padEnd(20)} (inscrit ${createdAt})`);
  }

  console.log(`\nTotal : ${users.length} email(s) à envoyer.\n`);

  if (!IS_EXECUTE) {
    console.log("💡 Relancez avec --execute pour envoyer réellement les emails.");
    return;
  }

  // ─── Envoi réel ───
  if (!process.env.AUTH_RESEND_KEY) {
    console.error("❌ AUTH_RESEND_KEY non défini. Envoi impossible.");
    process.exit(1);
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Marquer AVANT l'envoi : en cas d'échec, on ne re-tente pas automatiquement
      // (même politique que le wire-up applicatif — mieux un email perdu qu'un doublon)
      await prisma.user.update({
        where: { id: user.id },
        data: { welcomeEmailSentAt: new Date() },
      });

      const html = await render(
        OnboardingWelcomeEmail({
          firstName: user.firstName,
          baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://the-playground.fr",
        })
      );

      const { error } = await resend.emails.send({
        from: getOnboardingSender(),
        to: user.email,
        replyTo: onboardingWelcomeContent.replyTo,
        subject: onboardingWelcomeContent.subject,
        html,
      });

      if (error) {
        console.error(`  ❌ Échec ${user.email} : ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ Envoyé → ${user.email}`);
        sent++;
      }
    } catch (err) {
      console.error(`  ❌ Erreur ${user.email} :`, err);
      failed++;
    }

    // Respecter la limite Resend (2 req/s max)
    await sleep(600);
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`✅ ${sent} email(s) envoyé(s), ❌ ${failed} échec(s)`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
