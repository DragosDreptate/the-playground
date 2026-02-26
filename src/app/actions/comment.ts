"use server";

import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCommentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
  prismaUserRepository,
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

    // Fire-and-forget: notify hosts without blocking the response
    sendHostCommentNotification(
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

async function sendHostCommentNotification(
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

  // Note : circle dépend de moment.circleId → séquentiel volontaire
  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const playerName =
    [commenter.firstName, commenter.lastName].filter(Boolean).join(" ") ||
    commenter.email;

  const commentPreview =
    content.length > 200 ? `${content.slice(0, 200)}…` : content;

  const hosts = await prismaCircleRepository.findMembersByRole(
    moment.circleId,
    "HOST"
  );

  // Récupère toutes les préférences en une seule requête pour éviter le N+1
  const filteredHosts = hosts.filter((host) => host.userId !== commenterId);
  const hostUserIds = filteredHosts.map((h) => h.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

  await Promise.all(
    filteredHosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewComment) return;

      const hostName =
        [host.user.firstName, host.user.lastName].filter(Boolean).join(" ") ||
        host.user.email;

      return emailService.sendHostNewComment({
        to: host.user.email,
        hostName,
        playerName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        circleSlug: circle.slug,
        commentPreview,
        strings: {
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
        },
      });
    })
  );
}
