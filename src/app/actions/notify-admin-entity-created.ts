"use server";

import { prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { notifySlackNewEntity, isAdminEmailEnabled } from "@/infrastructure/services/slack/slack-notification-service";

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
  // Pour les moments uniquement
  momentDate?: string;
  locationText?: string;
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

  const copy = {
    circle: {
      subjectPrefix: "Nouvelle Communauté créée",
      heading: "Nouvelle Communauté sur The Playground",
      messageEntity: "une nouvelle Communauté",
      ctaTarget: "la Communauté",
    },
    moment: {
      subjectPrefix: "Nouvel événement créé",
      heading: "Nouvel événement sur The Playground",
      messageEntity: "un nouvel événement",
      ctaTarget: "l'événement",
    },
  }[params.entityType];

  const strings = {
    subject: `[Admin] ${copy.subjectPrefix} — ${params.entityName}`,
    heading: copy.heading,
    message: `${params.creatorName} vient de créer ${copy.messageEntity}.`,
    ctaLabel: `Voir ${copy.ctaTarget} dans l'admin`,
    footer: "Vous recevez cet email car vous êtes administrateur de The Playground.",
    dateLabel: "Date",
    locationLabel: "Lieu",
  };

  if (isAdminEmailEnabled()) {
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
          momentDate: params.momentDate,
          locationText: params.locationText,
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
  }

  await notifySlackNewEntity({
    entityType: params.entityType,
    entityName: params.entityName,
    creatorName: params.creatorName,
    creatorEmail: params.creatorEmail,
    circleName: params.circleName,
    entityUrl,
    momentDate: params.momentDate,
    locationText: params.locationText,
  });
}
