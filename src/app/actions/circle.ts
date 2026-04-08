"use server";

import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { prisma } from "@/infrastructure/db/prisma";
import { calculateCircleScore } from "@/infrastructure/services/explorer-score.service";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createResendEmailService } from "@/infrastructure/services";

const emailService = createResendEmailService();
import { createCircle } from "@/domain/usecases/create-circle";
import { updateCircle } from "@/domain/usecases/update-circle";
import { deleteCircle } from "@/domain/usecases/delete-circle";
import { joinCircleDirectly } from "@/domain/usecases/join-circle-directly";
import { leaveCircle } from "@/domain/usecases/leave-circle";
import { removeCircleMember } from "@/domain/usecases/remove-circle-member";
import { approveCircleMembership } from "@/domain/usecases/approve-circle-membership";
import { rejectCircleMembership } from "@/domain/usecases/reject-circle-membership";
import { prismaRegistrationRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { DomainError } from "@/domain/errors";
import type { CircleVisibility, CircleCategory, CircleMembership } from "@/domain/models/circle";
import type { Circle } from "@/domain/models/circle";
import type { ActionResult } from "./types";
import { processCoverImage } from "./cover-image";
import { notifyAdminEntityCreated } from "./notify-admin-entity-created";
import { notifyHostNewCircleMember } from "./notify-host-new-circle-member";
import {
  resolveCustomCategoryForCreate,
  resolveCustomCategoryForUpdate,
  isCustomCategoryMissing,
} from "@/lib/circle-category-helpers";
import { isAdminUser, resolveCircleRepository } from "@/lib/admin-host-mode";
import { getDisplayName } from "@/lib/display-name";
import { isValidUrl } from "@/lib/url";

export async function createCircleAction(
  formData: FormData
): Promise<ActionResult<Circle>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const visibility = (formData.get("visibility") as CircleVisibility) ?? "PUBLIC";
  const category = (formData.get("category") as CircleCategory) || undefined;
  const customCategory = resolveCustomCategoryForCreate(
    category,
    formData.get("customCategory") as string | null
  );
  const city = (formData.get("city") as string)?.trim() || undefined;
  const websiteRaw = (formData.get("website") as string)?.trim() || undefined;
  const website = websiteRaw && isValidUrl(websiteRaw) ? websiteRaw : undefined;
  const requiresApproval = formData.get("requiresApproval") === "on";

  if (!name?.trim()) {
    return { success: false, error: "Name is required", code: "VALIDATION" };
  }
  if (!description?.trim()) {
    return {
      success: false,
      error: "Description is required",
      code: "VALIDATION",
    };
  }
  if (isCustomCategoryMissing(category, customCategory)) {
    return {
      success: false,
      error: "Custom category is required when 'Other' is selected",
      code: "VALIDATION",
    };
  }

  try {
    const coverData = await processCoverImage(formData);

    const result = await createCircle(
      {
        name: name.trim(),
        description: description.trim(),
        visibility,
        category,
        ...(customCategory !== undefined && { customCategory }),
        city,
        website,
        requiresApproval,
        userId: session.user.id,
        ...coverData,
      },
      { circleRepository: prismaCircleRepository }
    );

    // Fire-and-forget : calculer le score initial + notifier les admins
    after(async () => {
      try {
        // Calcul et persistance du score Explorer initial.
        // Sans ça, la communauté resterait à score=0 jusqu'au cron de 3h00
        // et n'apparaîtrait pas dans Explorer avant le lendemain.
        const initialScore = calculateCircleScore({
          description: result.circle.description,
          coverImage: result.circle.coverImage ?? null,
          category: result.circle.category ?? null,
          createdAt: result.circle.createdAt,
          isDemo: false,
          overrideScore: null,
          memberCount: 0,
          pastEventCount: 0,
          hasPastEventWithRegistrant: false,
          hasUpcomingEvent: false,
        });
        await prisma.circle.update({
          where: { id: result.circle.id },
          data: { explorerScore: initialScore, scoreUpdatedAt: new Date() },
        });
      } catch (e) {
        Sentry.captureException(e);
      }

      try {
        const creator = await prismaUserRepository.findById(session.user.id);
        await notifyAdminEntityCreated({
          entityType: "circle",
          entityName: result.circle.name,
          entitySlug: result.circle.slug,
          creatorId: session.user.id,
          creatorName: creator?.name ?? creator?.email ?? session.user.email ?? "",
          creatorEmail: creator?.email ?? session.user.email ?? "",
        });
      } catch (e) {
        Sentry.captureException(e);
      }
    });

    return { success: true, data: result.circle };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function updateCircleAction(
  circleId: string,
  formData: FormData
): Promise<ActionResult<Circle>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const visibility = formData.get("visibility") as CircleVisibility | null;
  const categoryRaw = formData.get("category") as string | null;
  const category = categoryRaw ? (categoryRaw as CircleCategory) : null;
  const cityRaw = formData.get("city") as string | null;
  const city = cityRaw ? cityRaw.trim() : null;
  const websiteTrimmed = (formData.get("website") as string | null)?.trim() || null;
  const website = websiteTrimmed && isValidUrl(websiteTrimmed) ? websiteTrimmed : null;
  const customCategoryRaw = formData.get("customCategory") as string | null;
  const requiresApprovalUpdate = formData.get("requiresApproval") === "on";

  if (name !== null && !name.trim()) {
    return { success: false, error: "Name cannot be empty", code: "VALIDATION" };
  }
  if (isCustomCategoryMissing(category, customCategoryRaw)) {
    return {
      success: false,
      error: "Custom category is required when 'Other' is selected",
      code: "VALIDATION",
    };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

    // Récupère l'ancienne cover pour cleanup si besoin
    const existingCircle = await prismaCircleRepository.findById(circleId);
    const oldCoverImage = existingCircle?.coverImage ?? null;

    const customCategory = resolveCustomCategoryForUpdate(
      category,
      existingCircle?.category ?? null,
      customCategoryRaw
    );

    const coverData = await processCoverImage(formData);

    const result = await updateCircle(
      {
        circleId,
        userId: session.user.id,
        ...(name && { name: name.trim() }),
        ...(description !== null && { description: description.trim() }),
        ...(visibility && { visibility }),
        category,
        ...(customCategory !== undefined && { customCategory }),
        city,
        website,
        ...coverData,
        requiresApproval: requiresApprovalUpdate,
      },
      { circleRepository: circleRepo }
    );

    // Cleanup ancien blob si une nouvelle image a été uploadée
    if (
      coverData.coverImage !== undefined &&
      coverData.coverImage !== oldCoverImage &&
      oldCoverImage
    ) {
      await vercelBlobStorageService.delete(oldCoverImage);
    }

    // Invalide le cache Next.js pour que la page détail reflète les changements
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/dashboard/circles/${result.circle.slug}`);

    return { success: true, data: result.circle };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function deleteCircleAction(
  circleId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    await deleteCircle(
      { circleId, userId: session.user.id },
      { circleRepository: circleRepo }
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

export async function joinCircleDirectlyAction(
  circleId: string
): Promise<ActionResult<{ alreadyMember: boolean; pendingApproval: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const { alreadyMember, pendingApproval } = await joinCircleDirectly(
      { circleId, userId: session.user.id },
      { circleRepository: prismaCircleRepository }
    );

    if (!alreadyMember) {
      const t = await getTranslations("Email");
      const userId = session.user.id;
      // Fire-and-forget (pas de after() — peut être coupé par Vercel serverless)
      notifyHostCircleJoin(circleId, userId, pendingApproval, t).catch((err) => {
        console.error("[joinCircleDirectlyAction] Erreur notification host :", err);
        Sentry.captureException(err);
      });
    }

    return { success: true, data: { alreadyMember, pendingApproval } };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function leaveCircleAction(
  circleId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await leaveCircle(
      { circleId, userId: session.user.id },
      {
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
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

export async function removeCircleMemberAction(
  circleId: string,
  targetUserId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const result = await removeCircleMember(
      { circleId, hostUserId: session.user.id, targetUserId },
      {
        circleRepository: circleRepo,
        registrationRepository: prismaRegistrationRepository,
      }
    );

    const t = await getTranslations("Email");
    after(async () => {
      try {
        const [targetUser, circle] = await Promise.all([
          prismaUserRepository.findById(targetUserId),
          prismaCircleRepository.findById(circleId),
        ]);
        if (!targetUser || !circle) return;

        const memberName = getDisplayName(targetUser.firstName, targetUser.lastName, targetUser.email);
        const footer = t("common.footer");

        await emailService.sendMemberRemovedFromCircle({
          to: targetUser.email,
          memberName,
          circleName: circle.name,
          cancelledRegistrations: result.cancelledRegistrations,
          strings: {
            subject: t("memberRemovedFromCircle.subject", { circleName: circle.name }),
            heading: t("memberRemovedFromCircle.heading"),
            message: t("memberRemovedFromCircle.message", { circleName: circle.name }),
            cancelledRegistrationsMessage:
              result.cancelledRegistrations > 0
                ? t("memberRemovedFromCircle.cancelledRegistrationsMessage", {
                    count: result.cancelledRegistrations,
                  })
                : undefined,
            ctaLabel: t("memberRemovedFromCircle.ctaLabel"),
            footer,
          },
        });
      } catch {
        // fire-and-forget — ne pas bloquer l'action si l'email échoue
      }
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard/circles");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function inviteToCircleByEmailAction(
  circleId: string,
  emails: string[]
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

    // Check d'autorisation HOST (auparavant porté par generateCircleInviteToken)
    const membership = await circleRepo.findMembership(circleId, session.user.id);
    if (!membership || membership.role !== "HOST") {
      return { success: false, error: "Only hosts can send invitations", code: "UNAUTHORIZED" };
    }

    const circle = await circleRepo.findById(circleId);
    if (!circle) {
      return { success: false, error: "Circle not found", code: "NOT_FOUND" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const circleUrl = `${baseUrl}/circles/${circle.slug}`;
    const inviterName = session.user.name ?? session.user.email ?? "";
    const t = await getTranslations("Email.circleInvitation");

    after(async () => {
      try {
        const [memberCount, momentCount] = await Promise.all([
          circleRepo.countMembers(circleId),
          circleRepo.countMoments(circleId),
        ]);
        await emailService.sendCircleInvitations({
          recipients: emails,
          inviterName,
          circleName: circle.name,
          circleDescription: circle.description,
          circleSlug: circle.slug,
          coverImageUrl: circle.coverImage,
          memberCount,
          momentCount,
          circleUrl,
          strings: {
            subject: t("subject", { inviterName, circleName: circle.name }),
            ctaLabel: t("ctaLabel"),
            footer: t("footer", { inviterName }),
          },
        });
      } catch (e) {
        Sentry.captureException(e);
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function approveCircleMembershipAction(
  circleId: string,
  memberUserId: string
): Promise<ActionResult<CircleMembership>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await approveCircleMembership(
      { circleId, memberUserId, hostUserId: session.user.id },
      { circleRepository: prismaCircleRepository }
    );

    const t = await getTranslations("Email");
    after(async () => {
      try {
        const [circle, user] = await Promise.all([
          prismaCircleRepository.findById(circleId),
          prismaUserRepository.findById(memberUserId),
        ]);
        if (!circle || !user) return;
        const playerName = getDisplayName(user.firstName, user.lastName, user.email);
        await emailService.sendApprovalNotification({
          to: user.email,
          recipientName: playerName,
          entityName: circle.name,
          entitySlug: `circles/${circle.slug}`,
          strings: {
            subject: t("approvalNotification.membershipApprovedSubject", { circleName: circle.name }),
            heading: t("approvalNotification.membershipApprovedHeading"),
            message: t("approvalNotification.membershipApprovedMessage", { circleName: circle.name }),
            ctaLabel: t("approvalNotification.viewCircleCta"),
            footer: t("common.footer"),
          },
        });
      } catch (err) {
        Sentry.captureException(err);
      }
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function rejectCircleMembershipAction(
  circleId: string,
  memberUserId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await rejectCircleMembership(
      { circleId, memberUserId, hostUserId: session.user.id },
      { circleRepository: prismaCircleRepository }
    );

    const t = await getTranslations("Email");
    after(async () => {
      try {
        const [circle, user] = await Promise.all([
          prismaCircleRepository.findById(circleId),
          prismaUserRepository.findById(memberUserId),
        ]);
        if (!circle || !user) return;
        const playerName = getDisplayName(user.firstName, user.lastName, user.email);
        await emailService.sendApprovalNotification({
          to: user.email,
          recipientName: playerName,
          entityName: circle.name,
          entitySlug: `circles/${circle.slug}`,
          strings: {
            subject: t("approvalNotification.membershipRejectedSubject", { circleName: circle.name }),
            heading: t("approvalNotification.rejectedHeading"),
            message: t("approvalNotification.membershipRejectedMessage", { circleName: circle.name }),
            ctaLabel: t("approvalNotification.viewCircleCta"),
            footer: t("common.footer"),
          },
        });
      } catch (err) {
        Sentry.captureException(err);
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

// ── Notification helper : nouveau membre ou demande d'adhésion ──

async function notifyHostCircleJoin(
  circleId: string,
  userId: string,
  pendingApproval: boolean,
  t: Awaited<ReturnType<typeof getTranslations<"Email">>>,
  circleSlug?: string,
  circleName?: string,
): Promise<void> {
  const [circle, user] = await Promise.all([
    circleSlug && circleName
      ? Promise.resolve({ id: circleId, slug: circleSlug, name: circleName })
      : prismaCircleRepository.findById(circleId),
    prismaUserRepository.findById(userId),
  ]);
  if (!circle || !user) return;

  const playerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  if (pendingApproval) {
    // Demande d'adhésion en attente → notifier les HOSTs
    const hosts = await prismaCircleRepository.findMembersByRole(circleId, "HOST");
    const hostUserIds = hosts.map((h) => h.userId);
    const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

    await Promise.allSettled(
      hosts.map(async (host) => {
        const prefs = prefsMap.get(host.userId);
        if (!prefs?.notifyNewRegistration) return;
        const hostName =
          [host.user.firstName, host.user.lastName].filter(Boolean).join(" ") || host.user.email;
        return emailService.sendApprovalNotification({
          to: host.user.email,
          recipientName: hostName,
          entityName: circle.name,
          entitySlug: `dashboard/circles/${circle.slug}`,
          strings: {
            subject: t("approvalNotification.hostPendingMembershipSubject", { playerName, circleName: circle.name }),
            heading: t("approvalNotification.hostPendingMembershipHeading"),
            message: t("approvalNotification.hostPendingMembershipMessage", { playerName, circleName: circle.name }),
            ctaLabel: t("approvalNotification.manageCta"),
            footer: t("common.footer"),
          },
        });
      })
    );
  } else {
    // Membre accepté directement → notification classique
    await notifyHostNewCircleMember(
      circleId,
      circle.slug,
      circle.name,
      userId,
      playerName,
      (count) => t("hostCircleMemberNotification.memberCountInfo", { count }),
      {
        subject: t("hostCircleMemberNotification.subject", { playerName, circleName: circle.name }),
        heading: t("hostCircleMemberNotification.heading"),
        message: t("hostCircleMemberNotification.message", { playerName, circleName: circle.name }),
        manageMembersCta: t("hostCircleMemberNotification.manageMembersCta"),
        footer: t("common.footer"),
      }
    );
  }
}

