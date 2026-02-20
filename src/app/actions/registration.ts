"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { joinMoment } from "@/domain/usecases/join-moment";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import { DomainError } from "@/domain/errors";
import type { Registration } from "@/domain/models/registration";
import type { ActionResult } from "./types";

export async function joinMomentAction(
  momentId: string
): Promise<ActionResult<Registration>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await joinMoment(
      { momentId, userId: session.user.id },
      {
        momentRepository: prismaMomentRepository,
        registrationRepository: prismaRegistrationRepository,
        circleRepository: prismaCircleRepository,
      }
    );
    return { success: true, data: result.registration };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

export async function cancelRegistrationAction(
  registrationId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await cancelRegistration(
      { registrationId, userId: session.user.id },
      {
        registrationRepository: prismaRegistrationRepository,
      }
    );
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}
