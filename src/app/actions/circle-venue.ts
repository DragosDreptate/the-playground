"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaCircleVenueRepository,
} from "@/infrastructure/repositories";
import { createCircleVenue } from "@/domain/usecases/create-circle-venue";
import { updateCircleVenue } from "@/domain/usecases/update-circle-venue";
import { deleteCircleVenue } from "@/domain/usecases/delete-circle-venue";
import type { CircleVenue } from "@/domain/models/circle-venue";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";

function parseVenueForm(formData: FormData): ActionResult<{ name: string; address: string }> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const address = (formData.get("address") as string | null)?.trim() ?? "";

  if (!name) {
    return { success: false, error: "Venue name is required", code: "VALIDATION" };
  }
  if (!address) {
    return { success: false, error: "Venue address is required", code: "VALIDATION" };
  }

  return { success: true, data: { name, address } };
}

export async function createCircleVenueAction(
  circleId: string,
  circleSlug: string,
  formData: FormData
): Promise<ActionResult<CircleVenue>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const parsed = parseVenueForm(formData);
  if (!parsed.success) return parsed;

  const userId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const venue = await createCircleVenue(
      { circleId, userId, ...parsed.data },
      {
        circleRepository: circleRepo,
        circleVenueRepository: prismaCircleVenueRepository,
      }
    );

    revalidatePath(`/dashboard/circles/${circleSlug}/venues`);
    invalidateDashboardCache(userId);
    return venue;
  });
}

export async function updateCircleVenueAction(
  circleId: string,
  circleSlug: string,
  venueId: string,
  formData: FormData
): Promise<ActionResult<CircleVenue>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const parsed = parseVenueForm(formData);
  if (!parsed.success) return parsed;

  const userId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const venue = await updateCircleVenue(
      { circleId, venueId, userId, ...parsed.data },
      {
        circleRepository: circleRepo,
        circleVenueRepository: prismaCircleVenueRepository,
      }
    );

    revalidatePath(`/dashboard/circles/${circleSlug}/venues`);
    invalidateDashboardCache(userId);
    return venue;
  });
}

export async function deleteCircleVenueAction(
  circleId: string,
  circleSlug: string,
  venueId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const userId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    await deleteCircleVenue(
      { circleId, venueId, userId },
      {
        circleRepository: circleRepo,
        circleVenueRepository: prismaCircleVenueRepository,
      }
    );

    revalidatePath(`/dashboard/circles/${circleSlug}/venues`);
    invalidateDashboardCache(userId);
  });
}
