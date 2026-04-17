"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { onboardStripeConnect, getStripeConnectStatus } from "@/domain/usecases/onboard-stripe-connect";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { isActivePrimaryHost } from "@/domain/models/circle";
import type { ConnectAccountStatus } from "@/domain/ports/services/payment-service";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";

const paymentService = createStripePaymentService();

export async function onboardStripeConnectAction(
  circleId: string,
  returnUrl: string
): Promise<ActionResult<{ onboardingUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    return onboardStripeConnect(
      { circleId, userId, returnUrl },
      { circleRepository: circleRepo, paymentService }
    );
  });
}

export async function getStripeConnectStatusAction(
  circleId: string
): Promise<ActionResult<{ hasAccount: boolean; status: ConnectAccountStatus | null }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    return getStripeConnectStatus(
      { circleId, userId },
      { circleRepository: circleRepo, paymentService }
    );
  });
}

export async function getStripeLoginLinkAction(
  circleId: string
): Promise<ActionResult<{ url: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const circle = await circleRepo.findById(circleId);
  if (!circle?.stripeConnectAccountId) {
    return { success: false, error: "Stripe Connect not configured", code: "STRIPE_CONNECT_NOT_ACTIVE" };
  }

  const membership = await circleRepo.findMembership(circleId, userId);
  if (!isActivePrimaryHost(membership)) {
    return { success: false, error: "Not authorized", code: "UNAUTHORIZED_CIRCLE_ACTION" };
  }

  return toActionResult(async () => {
    const { url } = await paymentService.createLoginLink(circle.stripeConnectAccountId!);
    return { url };
  });
}

export async function cancelStripeConnectAction(
  circleId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const membership = await circleRepo.findMembership(circleId, userId);
  if (!isActivePrimaryHost(membership)) {
    return { success: false, error: "Not authorized", code: "UNAUTHORIZED_CIRCLE_ACTION" };
  }

  return toActionResult(async () => {
    await circleRepo.update(circleId, { stripeConnectAccountId: null });
  });
}
