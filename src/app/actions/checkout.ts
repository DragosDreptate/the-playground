"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { createCheckoutSession } from "@/domain/usecases/create-checkout-session";
import { DomainError } from "@/domain/errors";
import type { ActionResult } from "./types";

const paymentService = createStripePaymentService();

export async function createCheckoutAction(
  momentId: string,
  successUrl: string,
  cancelUrl: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const user = await prismaUserRepository.findById(session.user.id);
    if (!user) {
      return { success: false, error: "User not found", code: "USER_NOT_FOUND" };
    }

    const result = await createCheckoutSession(
      { momentId, user, successUrl, cancelUrl },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
        paymentService,
      }
    );

    return { success: true, data: { url: result.url } };
  } catch (error) {
    console.error("[createCheckoutSession] Error:", error);
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}
