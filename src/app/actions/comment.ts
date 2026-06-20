"use server";

import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCommentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
  prismaUserRepository,
  prismaRegistrationRepository,
  prismaCommentAttachmentRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createResendEmailService } from "@/infrastructure/services";
import { addComment } from "@/domain/usecases/add-comment";
import type { CommentPhotoInput } from "@/domain/usecases/add-comment";
import { deleteComment } from "@/domain/usecases/delete-comment";
import { adminApproveComment } from "@/domain/usecases/admin/admin-approve-comment";
import { notifySlackNewComment } from "@/infrastructure/services/slack/slack-notification-service";
import { notifyAdminCommentPending } from "./notify-admin-comment-pending";
import {
  ALLOWED_COMMENT_PHOTO_TYPES,
  MAX_COMMENT_PHOTO_SIZE_BYTES,
} from "@/domain/models/comment-attachment";
import type { Comment } from "@/domain/models/comment";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";
import {
  buildEmailLocaleResolver,
  type EmailLocaleResolver,
} from "@/lib/email/email-locale";

const emailService = createResendEmailService();

export async function addCommentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  if (!session.user.onboardingCompleted) {
    return { success: false, error: "Onboarding required", code: "ONBOARDING_REQUIRED" };
  }
  const userId = session.user.id;

  const rawContent = formData.get("content");
  if (typeof rawContent !== "string" || !rawContent) {
    return { success: false, error: "Content missing", code: "MISSING_CONTENT" };
  }
  const content = rawContent;

  // Extract photo files from FormData (photo-0, photo-1, photo-2)
  const photoFiles: File[] = [];
  for (let i = 0; i < 3; i++) {
    const f = formData.get(`photo-${i}`);
    if (f instanceof File && f.size > 0) photoFiles.push(f);
  }

  // Validate and detect MIME for each photo
  let photos: CommentPhotoInput[] = [];
  if (photoFiles.length > 0) {
    try {
      photos = await Promise.all(
        photoFiles.map(async (file) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          const detected = await fileTypeFromBuffer(buffer);
          if (
            !detected ||
            !ALLOWED_COMMENT_PHOTO_TYPES.has(detected.mime)
          ) {
            return {
              buffer,
              filename: file.name,
              contentType: "invalid",
              sizeBytes: buffer.length,
            };
          }
          return {
            buffer,
            filename: file.name,
            contentType: detected.mime,
            sizeBytes: buffer.length,
          };
        })
      );

      // Check for invalid types (detected in parallel above)
      const invalid = photos.find((p) => p.contentType === "invalid");
      if (invalid) {
        return {
          success: false,
          error: "Format non supporté",
          code: "COMMENT_PHOTO_TYPE_NOT_ALLOWED",
        };
      }

      // Check sizes
      const tooLarge = photos.find(
        (p) => p.sizeBytes > MAX_COMMENT_PHOTO_SIZE_BYTES
      );
      if (tooLarge) {
        return {
          success: false,
          error: "Photo trop volumineuse",
          code: "COMMENT_PHOTO_TOO_LARGE",
        };
      }
    } catch (err) {
      Sentry.captureException(err);
      return {
        success: false,
        error: "Erreur de lecture des photos",
        code: "READ_ERROR",
      };
    }
  }

  return toActionResult(async () => {
    const result = await addComment(
      { momentId, userId, content, photos },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        userRepository: prismaUserRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
        commentAttachmentRepository: prismaCommentAttachmentRepository,
        storage: vercelBlobStorageService,
        now: new Date(),
      }
    );

    if (result.comment.status === "PUBLISHED") {
      // `buildEmailLocaleResolver` lit `getLocale()` (dépend de `headers()`) :
      // doit s'exécuter dans le request context, avant `after()`.
      const resolver = await buildEmailLocaleResolver(userId);

      // `after()` garantit la complétion sur Vercel Fluid Compute après le retour
      // de la Server Action. La callback DOIT être async et await la promise —
      // une callback synchrone qui n'attend pas la Promise reproduirait le bug
      // d'origine (5/39 emails partis, incident 2026-05-31).
      after(async () => {
        try {
          await sendCommentNotifications(momentId, userId, content, resolver);
        } catch (err) {
          console.error(err);
          Sentry.captureException(err);
        }
      });
    } else {
      // PENDING_REVIEW (compte de moins de 24h) : aucun broadcast aux
      // participants tant que l'admin n'a pas validé. On alerte l'admin.
      after(async () => {
        try {
          await notifyPendingComment(momentId, userId, content);
        } catch (err) {
          console.error(err);
          Sentry.captureException(err);
        }
      });
    }

    return result.comment;
  });
}

export async function deleteCommentAction(
  commentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  return toActionResult(async () => {
    await deleteComment(
      { commentId, userId },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        commentAttachmentRepository: prismaCommentAttachmentRepository,
        storage: vercelBlobStorageService,
      }
    );
  });
}

// --- Modération admin ---

/**
 * Approuve un commentaire en attente (admin plateforme uniquement) : passe en
 * PUBLISHED puis broadcaste aux participants (c'est au moment de l'approbation
 * que la notification part, le commentaire ayant été retenu à la création).
 */
export async function adminApproveCommentAction(
  commentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" };
  }

  return toActionResult(async () => {
    const comment = await adminApproveComment(
      { commentId },
      { commentRepository: prismaCommentRepository }
    );

    // Resolver construit dans le request context (lit getLocale via headers),
    // avant after().
    const resolver = await buildEmailLocaleResolver(comment.userId);
    after(async () => {
      try {
        await sendCommentNotifications(
          comment.momentId,
          comment.userId,
          comment.content,
          resolver
        );
      } catch (err) {
        console.error(err);
        Sentry.captureException(err);
      }
    });
  });
}

/**
 * Supprime n'importe quel commentaire (admin plateforme uniquement), pending ou
 * publié. Réutilise le usecase deleteComment avec le bypass isAdmin (et son
 * nettoyage des pièces jointes).
 */
export async function adminDeleteCommentAction(
  commentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" };
  }
  const adminId = session.user.id;

  return toActionResult(async () => {
    await deleteComment(
      { commentId, userId: adminId, isAdmin: true },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        commentAttachmentRepository: prismaCommentAttachmentRepository,
        storage: vercelBlobStorageService,
      }
    );
  });
}

// --- Fire-and-forget email helpers ---

async function sendCommentNotifications(
  momentId: string,
  commenterId: string,
  content: string,
  resolver: EmailLocaleResolver
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
    prismaCircleRepository.findOrganizers(moment.circleId),
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

  // Filtre opt-in AVANT le batch — n'envoie qu'aux destinataires qui ont
  // activé `notifyNewComment`.
  const recipients = [...recipientMap.values()]
    .filter((r) => prefsMap.get(r.userId)?.notifyNewComment)
    .map((r) => ({ to: r.email, recipientName: r.name }));

  if (recipients.length > 0) {
    // Le commenter (=trigger) est exclu du recipientMap (cf. delete ci-dessus),
    // donc tous les destinataires sont ≠ trigger → buildEmailLocaleResolver
    // retourne toujours DEFAULT_RECIPIENT_LOCALE pour eux. Les strings sont
    // donc identiques pour tous → précalcul une seule fois.
    const t = await resolver.defaultTranslations();

    await emailService.sendNewCommentBatch({
      recipients,
      playerName,
      momentTitle: moment.title,
      momentSlug: moment.slug,
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
        manageNotifications: t("commentNotification.manageNotifications"),
        footer: t("common.footer"),
      },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await notifySlackNewComment({
    playerName,
    momentTitle: moment.title,
    commentPreview,
    momentUrl: `${baseUrl}/m/${moment.slug}`,
  });
}

/**
 * Commentaire mis en file de validation (compte de moins de 24h) : on n'envoie
 * RIEN aux participants, on alerte uniquement l'admin pour modération.
 */
async function notifyPendingComment(
  momentId: string,
  commenterId: string,
  content: string
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

  await notifyAdminCommentPending({
    playerName,
    momentTitle: moment.title,
    commentPreview,
  });
}
