"use server";

import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createResendEmailService } from "@/infrastructure/services";

const emailService = createResendEmailService();
import { createCircle } from "@/domain/usecases/create-circle";
import { updateCircle } from "@/domain/usecases/update-circle";
import { deleteCircle } from "@/domain/usecases/delete-circle";
import { followCircle } from "@/domain/usecases/follow-circle";
import { unfollowCircle } from "@/domain/usecases/unfollow-circle";
import { leaveCircle } from "@/domain/usecases/leave-circle";
import { removeCircleMember } from "@/domain/usecases/remove-circle-member";
import { generateCircleInviteToken } from "@/domain/usecases/generate-circle-invite-token";
import { revokeCircleInviteToken } from "@/domain/usecases/revoke-circle-invite-token";
import { joinCircleByInvite } from "@/domain/usecases/join-circle-by-invite";
import { prismaRegistrationRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { DomainError } from "@/domain/errors";
import type { CircleVisibility, CircleCategory } from "@/domain/models/circle";
import type { Circle } from "@/domain/models/circle";
import type { ActionResult } from "./types";
import { processCoverImage } from "./cover-image";
import { notifyAdminEntityCreated } from "./notify-admin-entity-created";
import {
  resolveCustomCategoryForCreate,
  resolveCustomCategoryForUpdate,
} from "@/lib/circle-category-helpers";
import { resolveCircleRepository } from "@/lib/admin-host-mode";

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
        userId: session.user.id,
        ...coverData,
      },
      { circleRepository: prismaCircleRepository }
    );

    // Fire-and-forget : notifier les admins de la nouvelle Communauté
    after(async () => {
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

  if (name !== null && !name.trim()) {
    return { success: false, error: "Name cannot be empty", code: "VALIDATION" };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

    // Récupère l'ancienne cover pour cleanup si besoin
    const existingCircle = await prismaCircleRepository.findById(circleId);
    const oldCoverImage = existingCircle?.coverImage ?? null;

    const customCategory = resolveCustomCategoryForUpdate(
      category,
      existingCircle?.category ?? null,
      formData.get("customCategory") as string | null
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
        ...coverData,
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

export async function followCircleAction(
  circleId: string
): Promise<ActionResult<{ following: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await followCircle(
      { circleId, userId: session.user.id },
      { circleRepository: prismaCircleRepository }
    );

    // Notifier les HOSTs après la réponse (after garantit l'exécution en serverless)
    const followerName = session.user.name ?? session.user.email;
    after(async () => {
      try {
        const circle = await prismaCircleRepository.findById(circleId);
        if (!circle) return;
        const hosts = await prismaCircleRepository.findMembersByRole(circleId, "HOST");
        const hostUserIds = hosts.map((h) => h.userId);
        const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);
        await Promise.allSettled(
          hosts
            .filter((h) => prefsMap.get(h.userId)?.notifyNewFollower !== false)
            .map((h) =>
              emailService.sendHostNewFollower({
                to: h.user.email,
                hostName: h.user.firstName ?? h.user.email,
                followerName,
                circleName: circle.name,
                circleSlug: circle.slug,
                strings: {
                  subject: `🔔 Nouveau follower — ${circle.name}`,
                  heading: `Nouveau follower sur ${circle.name}`,
                  message: `${followerName} suit maintenant votre Communauté.`,
                  viewMembersCta: "Voir les membres",
                  footer: `Vous recevez cet email car vous êtes Organisateur de ${circle.name} sur The Playground.`,
                },
              })
            )
        );
      } catch (e) {
        Sentry.captureException(e);
      }
    });

    return { success: true, data: { following: true } };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function unfollowCircleAction(
  circleId: string
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await unfollowCircle(
      { circleId, userId: session.user.id },
      { circleRepository: prismaCircleRepository }
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
    await removeCircleMember(
      { circleId, hostUserId: session.user.id, targetUserId },
      {
        circleRepository: circleRepo,
        registrationRepository: prismaRegistrationRepository,
      }
    );
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

export async function generateCircleInviteTokenAction(
  circleId: string
): Promise<ActionResult<{ inviteUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const { token } = await generateCircleInviteToken(
      { circleId, userId: session.user.id },
      { circleRepository: circleRepo }
    );
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return { success: true, data: { inviteUrl: `${baseUrl}/circles/join/${token}` } };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function revokeCircleInviteTokenAction(
  circleId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    await revokeCircleInviteToken(
      { circleId, userId: session.user.id },
      { circleRepository: circleRepo }
    );
    const { revalidatePath } = await import("next/cache");
    const circle = await prismaCircleRepository.findById(circleId);
    if (circle) revalidatePath(`/dashboard/circles/${circle.slug}`);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function joinCircleByInviteAction(
  token: string
): Promise<ActionResult<{ circleSlug: string; alreadyMember: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const { circle, alreadyMember } = await joinCircleByInvite(
      { token, userId: session.user.id },
      { circleRepository: prismaCircleRepository }
    );
    return { success: true, data: { circleSlug: circle.slug, alreadyMember } };
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
    const { token, circle } = await generateCircleInviteToken(
      { circleId, userId: session.user.id },
      { circleRepository: circleRepo }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const inviteUrl = `${baseUrl}/circles/join/${token}`;
    const inviterName = session.user.name ?? session.user.email ?? "";
    const [memberCount, momentCount] = await Promise.all([
      circleRepo.countMembers(circleId),
      circleRepo.countMoments(circleId),
    ]);

    after(async () => {
      try {
        await emailService.sendCircleInvitations({
          recipients: emails,
          inviterName,
          circleName: circle.name,
          circleDescription: circle.description,
          circleSlug: circle.slug,
          coverImageUrl: circle.coverImage,
          memberCount,
          momentCount,
          inviteUrl,
          strings: {
            subject: `${inviterName} vous invite à rejoindre ${circle.name}`,
            heading: "",
            message: "",
            ctaLabel: "Rejoindre la Communauté",
            footer: "",
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

export async function getFollowStatusAction(
  circleId: string
): Promise<ActionResult<{ following: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const following = await prismaCircleRepository.getFollowStatus(
      session.user.id,
      circleId
    );
    return { success: true, data: { following } };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}
