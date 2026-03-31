"use server";

import { prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { sendSlackAdminNotification } from "@/infrastructure/services/slack/slack-notification-service";

const emailService = createResendEmailService();

export type AdminEntityCreatedParams = {
  entityType: "circle" | "moment";
  entityName: string;
  entitySlug: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  circleName?: string; // Pour les moments
  circleSlug?: string; // Pour les moments
};

export async function notifyAdminEntityCreated(
  params: AdminEntityCreatedParams
): Promise<void> {
  const adminEmails = await prismaUserRepository.findAdminEmails();

  // Exclure le créateur s'il est lui-même admin
  const recipients = adminEmails.filter((email) => email !== params.creatorEmail);
  if (recipients.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const entityUrl =
    params.entityType === "circle"
      ? `${appUrl}/dashboard/circles/${params.entitySlug}`
      : `${appUrl}/dashboard/circles/${params.circleSlug}/moments/${params.entitySlug}`;

  const isCircle = params.entityType === "circle";
  const entityLabel = isCircle ? "Communauté" : "événement";
  const entityLabelCap = isCircle ? "Communauté" : "Événement";

  const strings = {
    subject: `[Admin] Nouvelle ${entityLabel} créé${isCircle ? "e" : ""} — ${params.entityName}`,
    heading: `Nouvelle ${entityLabel} sur The Playground`,
    message: `${params.creatorName} vient de créer ${isCircle ? "une nouvelle Communauté" : "un nouvel événement"}.`,
    ctaLabel: `Voir ${isCircle ? "la Communauté" : "l'événement"} dans l'admin`,
    footer: "Vous recevez cet email car vous êtes administrateur de The Playground.",
  };

  const results = await Promise.allSettled(
    recipients.map((to) =>
      emailService.sendAdminEntityCreated({
        to,
        entityType: params.entityType,
        entityName: params.entityName,
        creatorName: params.creatorName,
        creatorEmail: params.creatorEmail,
        circleName: params.circleName,
        entityUrl,
        strings,
      })
    )
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[notifyAdminEntityCreated] Échec envoi email admin ${recipients[i]}:`,
        result.reason
      );
    }
  });

  const icon = isCircle ? "🟣" : "📅";
  await sendSlackAdminNotification(
    `${icon} *Nouveau${isCircle ? "lle" : ""} ${entityLabel}* — ${params.entityName}\nPar ${params.creatorName} (${params.creatorEmail})${params.circleName ? `\nCommunaute : ${params.circleName}` : ""}\n${entityUrl}`
  );
}
