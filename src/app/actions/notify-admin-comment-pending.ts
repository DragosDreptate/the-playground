"use server";

import { notifySlackCommentPending } from "@/infrastructure/services/slack/slack-notification-service";
import { getAppUrl } from "@/lib/app-url";

export type AdminCommentPendingParams = {
  playerName: string;
  momentTitle: string;
  commentPreview: string;
};

/**
 * Alerte l'admin qu'un commentaire d'un compte récent est en attente de
 * validation (canal Slack). L'email admin est ajouté avec son template à
 * l'étape de la console de modération.
 */
export async function notifyAdminCommentPending(
  params: AdminCommentPendingParams
): Promise<void> {
  const adminUrl = `${getAppUrl()}/admin/comments`;
  await notifySlackCommentPending({
    playerName: params.playerName,
    momentTitle: params.momentTitle,
    commentPreview: params.commentPreview,
    adminUrl,
  });
}
