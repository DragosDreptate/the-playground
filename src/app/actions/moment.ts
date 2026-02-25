"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createMoment } from "@/domain/usecases/create-moment";
import { updateMoment } from "@/domain/usecases/update-moment";
import { deleteMoment } from "@/domain/usecases/delete-moment";
import { DomainError } from "@/domain/errors";
import type { LocationType } from "@/domain/models/moment";
import type { Moment } from "@/domain/models/moment";
import type { ActionResult } from "./types";
import { processCoverImage } from "./cover-image";
import { notifyNewMoment } from "./notify-new-moment";

export async function createMomentAction(
  circleId: string,
  formData: FormData
): Promise<ActionResult<Moment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const startsAtRaw = formData.get("startsAt") as string;
  const endsAtRaw = formData.get("endsAt") as string | null;
  const locationType = (formData.get("locationType") as LocationType) ?? "IN_PERSON";
  const locationName = (formData.get("locationName") as string) || null;
  const locationAddress = (formData.get("locationAddress") as string) || null;
  const videoLink = (formData.get("videoLink") as string) || null;
  const capacityRaw = formData.get("capacity") as string | null;
  const priceRaw = formData.get("price") as string | null;
  const currency = (formData.get("currency") as string) || "EUR";

  if (!title?.trim()) {
    return { success: false, error: "Title is required", code: "VALIDATION" };
  }
  if (!description?.trim()) {
    return { success: false, error: "Description is required", code: "VALIDATION" };
  }
  if (!startsAtRaw) {
    return { success: false, error: "Start date is required", code: "VALIDATION" };
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  const capacity = capacityRaw ? parseInt(capacityRaw, 10) || null : null;
  const price = priceRaw ? parseInt(priceRaw, 10) || 0 : 0;

  try {
    const coverData = await processCoverImage(formData);

    const result = await createMoment(
      {
        circleId,
        userId: session.user.id,
        title: title.trim(),
        description: description.trim(),
        ...coverData,
        startsAt,
        endsAt,
        locationType,
        locationName,
        locationAddress,
        videoLink,
        capacity,
        price,
        currency,
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
      }
    );

    // Fire-and-forget : notifier les followers et membres du Circle
    prismaCircleRepository.findById(circleId).then((circle) => {
      if (circle) {
        notifyNewMoment(result.moment, session.user.id, circle.name, circle.slug).catch(
          console.error
        );
      }
    }).catch(console.error);

    return { success: true, data: result.moment };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function updateMomentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<Moment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const startsAtRaw = formData.get("startsAt") as string;
  const endsAtRaw = formData.get("endsAt") as string | null;
  const locationType = formData.get("locationType") as LocationType | null;
  const locationName = formData.get("locationName") as string | null;
  const locationAddress = formData.get("locationAddress") as string | null;
  const videoLink = formData.get("videoLink") as string | null;
  const capacityRaw = formData.get("capacity") as string | null;
  const priceRaw = formData.get("price") as string | null;
  const currency = formData.get("currency") as string | null;
  const status = formData.get("status") as string | null;

  if (title !== null && !title.trim()) {
    return { success: false, error: "Title cannot be empty", code: "VALIDATION" };
  }

  const capacity = capacityRaw ? parseInt(capacityRaw, 10) || null : undefined;
  const price = priceRaw !== null ? parseInt(priceRaw, 10) || 0 : undefined;

  try {
    // Récupère l'ancienne cover pour cleanup si besoin
    const existingMoment = await prismaMomentRepository.findById(momentId);
    const oldCoverImage = existingMoment?.coverImage ?? null;

    const coverData = await processCoverImage(formData);

    const result = await updateMoment(
      {
        momentId,
        userId: session.user.id,
        ...(title && { title: title.trim() }),
        ...(description !== null && { description: description.trim() }),
        ...coverData,
        ...(startsAtRaw && { startsAt: new Date(startsAtRaw) }),
        ...(endsAtRaw !== undefined && { endsAt: endsAtRaw ? new Date(endsAtRaw) : null }),
        ...(locationType && { locationType }),
        ...(locationName !== undefined && { locationName: locationName || null }),
        ...(locationAddress !== undefined && { locationAddress: locationAddress || null }),
        ...(videoLink !== undefined && { videoLink: videoLink || null }),
        ...(capacity !== undefined && { capacity }),
        ...(price !== undefined && { price }),
        ...(currency && { currency }),
        ...(status && { status: status as Moment["status"] }),
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    // Cleanup ancien blob si une nouvelle image a été uploadée
    if (
      coverData.coverImage !== undefined &&
      coverData.coverImage !== oldCoverImage &&
      oldCoverImage
    ) {
      await vercelBlobStorageService.delete(oldCoverImage);
    }

    return { success: true, data: result.moment };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function deleteMomentAction(
  momentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await deleteMoment(
      { momentId, userId: session.user.id },
      {
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
