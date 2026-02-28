"use server";

import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCommentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
  prismaUserRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { addComment } from "@/domain/usecases/add-comment";
import { deleteComment } from "@/domain/usecases/delete-comment";
import { DomainError } from "@/domain/errors";
import type { Comment } from "@/domain/models/comment";
import type { ActionResult } from "./types";

const emailService = createResendEmailService();

export async function addCommentAction(
  momentId: string,
  content: string
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await addComment(
      { momentId, userId: session.user.id, content },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
      }
    );

    // Resolve i18n in the request context (before fire-and-forget)
    const locale = await getLocale();
    const t = await getTranslations("Email");

    // Fire-and-forget: notify all registrants without blocking the response
    sendCommentNotifications(
      momentId,
      session.user.id,
      content,
      t,
      locale
    ).catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });

    return { success: true, data: result.comment };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function deleteCommentAction(
  commentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await deleteComment(
      { commentId, userId: session.user.id },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

// --- Fire-and-forget email helpers ---

type TranslationFunction = Awaited<ReturnType<typeof getTranslations<"Email">>>;

async function sendCommentNotifications(
  momentId: string,
  commenterId: string,
  content: string,
  t: TranslationFunction,
  _locale: string
): Promise<void> {
  const [commenter, moment] = await Promise.all([
    prismaUserRepository.findById(commenterId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!commenter || !moment) return;

  const playerName =
    [commenter.firstName, commenter.lastName].filter(Boolean).join(" ") ||
    commenter.email;

  const commentPreview =
    content.length > 200 ? `${content.slice(0, 200)}…` : content;

  // Récupère inscrits actifs et hosts en parallèle
  const [registrations, hosts] = await Promise.all([
    prismaRegistrationRepository.findActiveWithUserByMomentId(momentId),
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
  ]);

  // Combine inscrits + hosts, déduplique par userId
  type Recipient = { userId: string; name: string; email: string };
  const recipientMap = new Map<string, Recipient>();

  for (const reg of registrations) {
    recipientMap.set(reg.userId, {
      userId: reg.userId,
      name:
        [reg.user.firstName, reg.user.lastName].filter(Boolean).join(" ") ||
        reg.user.email,
      email: reg.user.email,
    });
  }
  for (const host of hosts) {
    if (!recipientMap.has(host.userId)) {
      recipientMap.set(host.userId, {
        userId: host.userId,
        name:
          [host.user.firstName, host.user.lastName]
            .filter(Boolean)
            .join(" ") || host.user.email,
        email: host.user.email,
      });
    }
  }

  // Exclut l'auteur du commentaire
  recipientMap.delete(commenterId);

  if (recipientMap.size === 0) return;

  // Batch fetch des préférences (évite le N+1)
  const recipientIds = [...recipientMap.keys()];
  const prefsMap =
    await prismaUserRepository.findNotificationPreferencesByIds(recipientIds);

  const emailStrings = {
    subject: t("commentNotification.subject", {
      playerName,
      momentTitle: moment.title,
    }),
    heading: t("commentNotification.heading"),
    message: t("commentNotification.message", {
      playerName,
      momentTitle: moment.title,
    }),
    commentPreviewLabel: t("commentNotification.commentPreviewLabel"),
    viewCommentCta: t("commentNotification.viewCommentCta"),
    footer: t("common.footer"),
  };

  await Promise.all(
    [...recipientMap.values()].map(async (recipient) => {
      const prefs = prefsMap.get(recipient.userId);
      if (!prefs?.notifyNewComment) return;

      return emailService.sendNewComment({
        to: recipient.email,
        recipientName: recipient.name,
        playerName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        commentPreview,
        strings: emailStrings,
      });
    })
  );
}
