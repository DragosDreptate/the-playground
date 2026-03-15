/**
 * Backfill one-shot : notifier les Organisateurs des nouvelles adhésions du 15/03/2026.
 *
 * Contexte : la notification "nouveau membre Communauté" n'existait pas avant ce jour.
 * Ce script envoie rétroactivement les emails aux Organisateurs concernés.
 *
 * Mode dry-run (défaut) : affiche la liste des envois prévus sans envoyer.
 * Mode execute          : envoie réellement les emails.
 *
 * Usage dev  : DATABASE_URL=... npx tsx scripts/notify-host-new-circle-members-today.ts [--execute]
 * Usage prod : pnpm notify:host-new-circle-members-today:prod
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { HostNewCircleMemberEmail } from "../src/infrastructure/services/email/templates/host-new-circle-member";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const IS_EXECUTE = process.argv.includes("--execute");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// Paris = UTC+1 en mars (CET)
const DAY_START = new Date("2026-03-14T23:00:00.000Z"); // 00:00 Paris
const DAY_END   = new Date("2026-03-15T22:59:59.999Z"); // 23:59 Paris

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://the-playground.fr";
const FOOTER   = "Powered by The Playground — Lancez votre communauté, gratuitement.";

async function main() {
  console.log("─────────────────────────────────────────────────────────");
  console.log(IS_EXECUTE ? "🚀 MODE EXECUTE — envoi réel des emails" : "🔍 MODE DRY-RUN — aucun email envoyé");
  console.log(`   Fenêtre : 15/03/2026 00:00 → 23:59 (Paris)`);
  console.log("─────────────────────────────────────────────────────────\n");

  // 1. Nouveaux membres (PLAYER) qui ont rejoint aujourd'hui (hors demo/test)
  const newMemberships = await prisma.circleMembership.findMany({
    where: {
      role: "PLAYER",
      joinedAt: { gte: DAY_START, lte: DAY_END },
      user: {
        email: {
          not: { endsWith: "@demo.playground" },
        },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      circle: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (newMemberships.length === 0) {
    console.log("✅ Aucun nouveau membre trouvé pour le 15/03/2026. Rien à faire.");
    return;
  }

  console.log(`📋 ${newMemberships.length} nouvelle(s) adhésion(s) trouvée(s)\n`);

  // 2. Pour chaque nouveau membre, trouver les Organisateurs du Circle
  const circleIds = [...new Set(newMemberships.map((m) => m.circleId))];

  const hostMemberships = await prisma.circleMembership.findMany({
    where: {
      circleId: { in: circleIds },
      role: "HOST",
      user: { email: { not: { endsWith: "@demo.playground" } } },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      circle: { select: { id: true, name: true, slug: true } },
    },
  });

  // 3. Charger les préférences de notification
  const hostUserIds = [...new Set(hostMemberships.map((h) => h.userId))];
  const prefs = await prisma.user.findMany({
    where: { id: { in: hostUserIds } },
    select: { id: true, notifyNewRegistration: true },
  });
  const prefsMap = new Map(prefs.map((p) => [p.id, p.notifyNewRegistration]));

  // 4. Construire la liste des envois
  type SendJob = {
    newMemberName: string;
    newMemberEmail: string;
    hostName: string;
    hostEmail: string;
    circleName: string;
    circleSlug: string;
    circleId: string;
    memberCount?: number;
    skippedReason?: string;
  };

  const jobs: SendJob[] = [];

  for (const membership of newMemberships) {
    const circleHosts = hostMemberships.filter((h) => h.circleId === membership.circleId);

    for (const host of circleHosts) {
      // Ne pas notifier l'hôte s'il est lui-même le nouveau membre
      if (host.userId === membership.userId) continue;

      const notifyEnabled = prefsMap.get(host.userId) !== false;

      jobs.push({
        newMemberName: membership.user.name ?? membership.user.email ?? "",
        newMemberEmail: membership.user.email ?? "",
        hostName: host.user.name ?? host.user.email ?? "",
        hostEmail: host.user.email ?? "",
        circleName: membership.circle.name,
        circleSlug: membership.circle.slug,
        circleId: membership.circleId,
        skippedReason: notifyEnabled ? undefined : "notifyNewRegistration = false",
      });
    }
  }

  const toSend = jobs.filter((j) => !j.skippedReason);
  const skipped = jobs.filter((j) => j.skippedReason);

  // 5. Afficher le rapport
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│  ENVOIS PRÉVUS                                                              │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  if (toSend.length === 0) {
    console.log("  (aucun — tous les Organisateurs ont désactivé les notifications)\n");
  } else {
    for (const job of toSend) {
      console.log(`  ✉️  → ${job.hostEmail} (${job.hostName})`);
      console.log(`       Communauté : ${job.circleName}`);
      console.log(`       Nouveau membre : ${job.newMemberName} <${job.newMemberEmail}>`);
      console.log("");
    }
  }

  if (skipped.length > 0) {
    console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│  IGNORÉS (notifications désactivées)                                        │");
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");
    for (const job of skipped) {
      console.log(`  ⏭️  ${job.hostEmail} — ${job.circleName} (${job.skippedReason})`);
    }
    console.log("");
  }

  console.log(`Total : ${toSend.length} email(s) à envoyer, ${skipped.length} ignoré(s)\n`);

  if (!IS_EXECUTE) {
    console.log("💡 Relancez avec --execute pour envoyer réellement les emails.");
    return;
  }

  // 6. Envoi réel
  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const from = process.env.EMAIL_FROM ?? "The Playground <noreply@the-playground.fr>";

  // Récupérer le memberCount par circle (une seule fois par circle)
  const memberCountMap = new Map<string, number>();
  for (const circleId of circleIds) {
    const count = await prisma.circleMembership.count({ where: { circleId, role: "PLAYER" } });
    memberCountMap.set(circleId, count);
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let sent = 0;
  let failed = 0;

  for (const job of toSend) {
    const memberCount = memberCountMap.get(job.circleId) ?? 0;
    try {
      const html = await render(
        HostNewCircleMemberEmail({
          to: job.hostEmail,
          hostName: job.hostName,
          playerName: job.newMemberName,
          circleName: job.circleName,
          circleSlug: job.circleSlug,
          memberCount,
          strings: {
            subject: `${job.newMemberName} a rejoint ${job.circleName}`,
            heading: "Nouveau membre",
            message: `${job.newMemberName} vient de rejoindre ${job.circleName}.`,
            memberCountInfo: `${memberCount} membre${memberCount > 1 ? "s" : ""} au total`,
            manageMembersCta: "Voir les membres",
            footer: FOOTER,
          },
          baseUrl: BASE_URL,
        })
      );

      const { error } = await resend.emails.send({
        from,
        to: job.hostEmail,
        subject: `${job.newMemberName} a rejoint ${job.circleName}`,
        html,
      });

      if (error) {
        console.error(`  ❌ Échec ${job.hostEmail} : ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ Envoyé → ${job.hostEmail} (${job.circleName} ← ${job.newMemberName})`);
        sent++;
      }
    } catch (err) {
      console.error(`  ❌ Erreur ${job.hostEmail} :`, err);
      failed++;
    }

    // Respecter la limite Resend : 2 req/s max
    await sleep(600);
  }

  console.log(`\n─────────────────────────────────────────────────────────`);
  console.log(`✅ ${sent} email(s) envoyé(s), ❌ ${failed} échec(s)`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
