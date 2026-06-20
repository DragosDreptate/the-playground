"use server";

import { prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import {
  notifySlackCommentPending,
  isAdminEmailEnabled,
} from "@/infrastructure/services/slack/slack-notification-service";
import { getAppUrl } from "@/lib/app-url";

const emailService = createResendEmailService();

export type AdminCommentPendingParams = {
  playerName: string;
  momentTitle: string;
  commentPreview: string;
};

/**
 * Alerte l'admin qu'un commentaire d'un compte récent est en attente de
 * validation, via email ET Slack. Non bloquant (échecs avalés/loggés).
 */
export async function notifyAdminCommentPending(
  params: AdminCommentPendingParams
): Promise<void> {
  const adminUrl = `${getAppUrl()}/admin/insights/comments?status=pending`;

  const adminEmails = await prismaUserRepository.findAdminEmails();
  if (adminEmails.length > 0 && isAdminEmailEnabled()) {
    const strings = {
      subject: `[Admin] Commentaire à valider — ${params.momentTitle}`,
      heading: "Commentaire en attente de validation",
      message: `${params.playerName} (compte récent) a commenté un événement. Le commentaire n'est pas visible tant que vous ne l'avez pas validé.`,
      commentLabel: "Commentaire",
      ctaLabel: "Modérer le commentaire",
      footer:
        "Vous recevez cet email car vous êtes administrateur de The Playground.",
    };

    const results = await Promise.allSettled(
      adminEmails.map((to) =>
        emailService.sendAdminCommentPending({
          to,
          playerName: params.playerName,
          momentTitle: params.momentTitle,
          commentPreview: params.commentPreview,
          adminUrl,
          strings,
        })
      )
    );
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(
          `[notifyAdminCommentPending] Échec envoi email admin ${adminEmails[i]}:`,
          result.reason
        );
      }
    });
  }

  await notifySlackCommentPending({
    playerName: params.playerName,
    momentTitle: params.momentTitle,
    commentPreview: params.commentPreview,
    adminUrl,
  });
}
