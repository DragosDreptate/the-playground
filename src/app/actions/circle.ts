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
import { prismaRegistrationRepository } from "@/infrastructure/repositories";
import { DomainError } from "@/domain/errors";
import type { CircleVisibility, CircleCategory } from "@/domain/models/circle";
import type { Circle } from "@/domain/models/circle";
import type { ActionResult } from "./types";
import { processCoverImage } from "./cover-image";

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
        city,
        userId: session.user.id,
        ...coverData,
      },
      { circleRepository: prismaCircleRepository }
    );
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
    // Récupère l'ancienne cover pour cleanup si besoin
    const existingCircle = await prismaCircleRepository.findById(circleId);
    const oldCoverImage = existingCircle?.coverImage ?? null;

    const coverData = await processCoverImage(formData);

    const result = await updateCircle(
      {
        circleId,
        userId: session.user.id,
        ...(name && { name: name.trim() }),
        ...(description !== null && { description: description.trim() }),
        ...(visibility && { visibility }),
        category,
        city,
        ...coverData,
      },
      { circleRepository: prismaCircleRepository }
    );

    // Cleanup ancien blob si une nouvelle image a été uploadée
    if (
      coverData.coverImage !== undefined &&
      coverData.coverImage !== oldCoverImage &&
      oldCoverImage
    ) {
      await vercelBlobStorageService.delete(oldCoverImage);
    }

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
    await deleteCircle(
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
        await Promise.allSettled(
          hosts.map((h) =>
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
