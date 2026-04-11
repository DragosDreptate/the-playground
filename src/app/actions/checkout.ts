"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { createCheckoutSession } from "@/domain/usecases/create-checkout-session";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";

const paymentService = createStripePaymentService();

export async function createCheckoutAction(
  momentId: string,
  momentSlug: string,
  cancelUrl: string
): Promise<ActionResult<{ url: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const user = await prismaUserRepository.findById(session.user.id);
  if (!user) {
    return { success: false, error: "User not found", code: "USER_NOT_FOUND" };
  }

  return toActionResult(async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/api/stripe/checkout-return?slug=${encodeURIComponent(momentSlug)}&userId=${encodeURIComponent(session.user.id!)}&momentId=${encodeURIComponent(momentId)}`;

    const result = await createCheckoutSession(
      { momentId, user, successUrl, cancelUrl },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
        paymentService,
      }
    );

    return { url: result.url };
  });
}
