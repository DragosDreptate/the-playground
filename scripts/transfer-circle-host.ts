/**
 * One-shot : transférer le rôle d'Organisateur d'une Communauté.
 *
 * Actions :
 *   1. Rétrograde l'Organisateur actuel en PLAYER (reste membre)
 *   2. Promeut le nouvel utilisateur en HOST (upsert — crée la membership si besoin)
 *   3. Envoie un email de notification au nouvel Organisateur
 *
 * Mode dry-run (défaut) : affiche ce qui sera fait, n'écrit rien.
 * Mode execute          : applique les changements.
 *
 * Usage dev  : DATABASE_URL=... npx tsx scripts/transfer-circle-host.ts [--execute]
 * Usage prod : pnpm transfer-circle-host:prod
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Resend } from "resend";
import { render, Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../src/infrastructure/services/email/templates/components/email-layout";
import {
  ctaButton,
  headingLg as heading,
} from "../src/infrastructure/services/email/templates/components/email-styles";

// ── Config ──────────────────────────────────────────────────────────────────

const CIRCLE_SLUG     = "ever-t-les-experts-t-shaped";
const OLD_HOST_EMAIL  = "ddreptate@gmail.com";
const NEW_HOST_EMAIL  = "quentin.branchet@gmail.com";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://the-playground.fr";
const FOOTER   = "Powered by The Playground — Lancez votre communauté, gratuitement.";

// ── Init ────────────────────────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const IS_EXECUTE = process.argv.includes("--execute");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// ── Email template ───────────────────────────────────────────────────────────

function NewHostEmail({
  newHostName,
  circleName,
  circleSlug,
}: {
  newHostName: string;
  circleName: string;
  circleSlug: string;
}) {
  const dashboardUrl = `${BASE_URL}/dashboard/circles/${circleSlug}`;

  return React.createElement(
    EmailLayout,
    { preview: `Vous êtes maintenant Organisateur de ${circleName}`, footer: FOOTER },
    React.createElement(Text, { style: heading }, "Vous êtes Organisateur 🎉"),
    React.createElement(
      Text,
      { style: message },
      `Bonjour ${newHostName},`
    ),
    React.createElement(
      Text,
      { style: message },
      `Vous avez été nommé Organisateur de la communauté « ${circleName} » sur The Playground. ` +
        `Vous pouvez désormais créer des événements, gérer les membres et animer votre communauté.`
    ),
    React.createElement(
      Section,
      { style: ctaSection },
      React.createElement(Button, { style: ctaButton, href: dashboardUrl }, "Gérer ma communauté")
    )
  );
}

const message: React.CSSProperties = {
  fontSize: "14px",
  color: "#52525b",
  margin: "0 0 16px 0",
  lineHeight: "22px",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginTop: "8px",
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─────────────────────────────────────────────────────────────");
  console.log(IS_EXECUTE ? "🚀 MODE EXECUTE — changements réels" : "🔍 MODE DRY-RUN — aucune modification");
  console.log(`   Communauté : ${CIRCLE_SLUG}`);
  console.log(`   Ancien host : ${OLD_HOST_EMAIL} → PLAYER`);
  console.log(`   Nouveau host : ${NEW_HOST_EMAIL} → HOST`);
  console.log("─────────────────────────────────────────────────────────────\n");

  // 1. Trouver la communauté
  const circle = await prisma.circle.findUnique({
    where: { slug: CIRCLE_SLUG },
    select: { id: true, name: true, slug: true },
  });

  if (!circle) {
    console.error(`❌ Communauté introuvable : slug="${CIRCLE_SLUG}"`);
    process.exit(1);
  }
  console.log(`✅ Communauté trouvée : "${circle.name}" (slug: ${circle.slug})\n`);

  // 2. Trouver les deux utilisateurs
  const [oldHostUser, newHostUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: OLD_HOST_EMAIL }, select: { id: true, name: true, email: true } }),
    prisma.user.findUnique({ where: { email: NEW_HOST_EMAIL }, select: { id: true, name: true, email: true } }),
  ]);

  if (!oldHostUser) {
    console.error(`❌ Utilisateur introuvable : ${OLD_HOST_EMAIL}`);
    process.exit(1);
  }
  if (!newHostUser) {
    console.error(`❌ Utilisateur introuvable : ${NEW_HOST_EMAIL}`);
    process.exit(1);
  }

  console.log(`👤 Ancien host : ${oldHostUser.name ?? oldHostUser.email} (${oldHostUser.id})`);
  console.log(`👤 Nouveau host : ${newHostUser.name ?? newHostUser.email} (${newHostUser.id})\n`);

  // 3. Vérifier que l'ancien host EST bien HOST de cette communauté
  const oldMembership = await prisma.circleMembership.findUnique({
    where: { userId_circleId: { userId: oldHostUser.id, circleId: circle.id } },
    select: { role: true },
  });

  if (!oldMembership) {
    console.error(`❌ ${OLD_HOST_EMAIL} n'est pas membre de cette communauté.`);
    process.exit(1);
  }
  if (oldMembership.role !== "HOST") {
    console.error(`❌ ${OLD_HOST_EMAIL} est "${oldMembership.role}" dans cette communauté, pas HOST.`);
    process.exit(1);
  }

  // 4. Vérifier la membership existante du nouveau host
  const newMembership = await prisma.circleMembership.findUnique({
    where: { userId_circleId: { userId: newHostUser.id, circleId: circle.id } },
    select: { role: true },
  });

  if (newMembership) {
    console.log(`ℹ️  ${NEW_HOST_EMAIL} est déjà membre (rôle actuel : ${newMembership.role}) → sera promu HOST`);
  } else {
    console.log(`ℹ️  ${NEW_HOST_EMAIL} n'est pas encore membre → sera créé directement en HOST`);
  }

  console.log("\n📋 Actions prévues :");
  console.log(`   [1] ${OLD_HOST_EMAIL} : HOST → PLAYER (reste membre)`);
  console.log(`   [2] ${NEW_HOST_EMAIL} : ${newMembership?.role ?? "(nouveau)"} → HOST`);
  console.log(`   [3] Email envoyé à ${NEW_HOST_EMAIL}\n`);

  if (!IS_EXECUTE) {
    console.log("💡 Relancez avec --execute pour appliquer les changements.");
    return;
  }

  // 5. Appliquer en transaction
  await prisma.$transaction([
    // Rétrogradation de l'ancien host
    prisma.circleMembership.update({
      where: { userId_circleId: { userId: oldHostUser.id, circleId: circle.id } },
      data: { role: "PLAYER" },
    }),
    // Promotion du nouveau host
    ...(newMembership
      ? [
          prisma.circleMembership.update({
            where: { userId_circleId: { userId: newHostUser.id, circleId: circle.id } },
            data: { role: "HOST" },
          }),
        ]
      : [
          prisma.circleMembership.create({
            data: { userId: newHostUser.id, circleId: circle.id, role: "HOST" },
          }),
        ]),
  ]);

  console.log(`✅ DB mise à jour :`);
  console.log(`   ${OLD_HOST_EMAIL} → PLAYER`);
  console.log(`   ${NEW_HOST_EMAIL} → HOST\n`);

  // 6. Envoi email
  if (!process.env.AUTH_RESEND_KEY) {
    console.warn("⚠️  AUTH_RESEND_KEY non défini — email non envoyé.");
    return;
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const from   = process.env.EMAIL_FROM ?? "The Playground <noreply@the-playground.fr>";
  const subject = `Vous êtes maintenant Organisateur de ${circle.name}`;

  const html = await render(
    React.createElement(NewHostEmail, {
      newHostName: newHostUser.name ?? newHostUser.email,
      circleName: circle.name,
      circleSlug: circle.slug,
    })
  );

  const { error } = await resend.emails.send({ from, to: NEW_HOST_EMAIL, subject, html });

  if (error) {
    console.error(`❌ Échec envoi email : ${error.message}`);
  } else {
    console.log(`✅ Email envoyé → ${NEW_HOST_EMAIL}`);
  }

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("✅ Transfert terminé avec succès.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
