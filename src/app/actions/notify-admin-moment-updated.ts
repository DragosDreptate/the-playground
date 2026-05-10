"use server";

import { prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import {
  notifySlackMomentUpdated,
  isAdminEmailEnabled,
} from "@/infrastructure/services/slack/slack-notification-service";
import { getAppUrl } from "@/lib/app-url";

const emailService = createResendEmailService();

export type AdminMomentUpdatedParams = {
  momentTitle: string;
  momentSlug: string;
  circleName: string;
  circleSlug: string;
  hostName: string;
  hostEmail: string;
  momentDate: string;
  locationText: string;
  changedFields: string[];
};

export async function notifyAdminMomentUpdated(
  params: AdminMomentUpdatedParams,
): Promise<void> {
  if (params.changedFields.length === 0) return;

  const adminEmails = await prismaUserRepository.findAdminEmails();
  const recipients = adminEmails.filter((email) => email !== params.hostEmail);
  if (recipients.length === 0) return;

  const momentUrl = `${getAppUrl()}/dashboard/circles/${params.circleSlug}/moments/${params.momentSlug}`;

  const strings = {
    subject: `[Admin] Événement modifié — ${params.momentTitle}`,
    heading: "Événement modifié sur The Playground",
    message: `${params.hostName} vient de modifier un événement publié.`,
    changesLabel: "Champs modifiés",
    dateLabel: "Date",
    locationLabel: "Lieu",
    ctaLabel: "Voir l'événement dans l'admin",
    footer: "Vous recevez cet email car vous êtes administrateur de The Playground.",
  };

  if (isAdminEmailEnabled()) {
    const results = await Promise.allSettled(
      recipients.map((to) =>
        emailService.sendAdminMomentUpdated({
          to,
          momentTitle: params.momentTitle,
          circleName: params.circleName,
          hostName: params.hostName,
          hostEmail: params.hostEmail,
          momentUrl,
          momentDate: params.momentDate,
          locationText: params.locationText,
          changedFields: params.changedFields,
          strings,
        }),
      ),
    );

    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(
          `[notifyAdminMomentUpdated] Échec envoi email admin ${recipients[i]}:`,
          result.reason,
        );
      }
    });
  }

  await notifySlackMomentUpdated({
    momentTitle: params.momentTitle,
    circleName: params.circleName,
    hostName: params.hostName,
    hostEmail: params.hostEmail,
    momentUrl,
    momentDate: params.momentDate,
    locationText: params.locationText,
    changedFields: params.changedFields,
  });
}
