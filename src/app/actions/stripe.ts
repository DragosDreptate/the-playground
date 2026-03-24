"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { onboardStripeConnect, getStripeConnectStatus } from "@/domain/usecases/onboard-stripe-connect";
import { DomainError } from "@/domain/errors";
import type { ConnectAccountStatus } from "@/domain/ports/services/payment-service";
import type { ActionResult } from "./types";

const paymentService = createStripePaymentService();

export async function onboardStripeConnectAction(
  circleId: string,
  returnUrl: string
): Promise<ActionResult<{ onboardingUrl: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const result = await onboardStripeConnect(
      { circleId, userId: session.user.id, returnUrl },
      { circleRepository: prismaCircleRepository, paymentService }
    );

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function getStripeConnectStatusAction(
  circleId: string
): Promise<ActionResult<{ hasAccount: boolean; status: ConnectAccountStatus | null }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const result = await getStripeConnectStatus(
      { circleId, userId: session.user.id },
      { circleRepository: prismaCircleRepository, paymentService }
    );

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function getStripeLoginLinkAction(
  circleId: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const circle = await prismaCircleRepository.findById(circleId);
    if (!circle?.stripeConnectAccountId) {
      return { success: false, error: "Stripe Connect not configured", code: "STRIPE_CONNECT_NOT_ACTIVE" };
    }

    const membership = await prismaCircleRepository.findMembership(circleId, session.user.id);
    if (!membership || membership.role !== "HOST") {
      return { success: false, error: "Not authorized", code: "UNAUTHORIZED_CIRCLE_ACTION" };
    }

    const { url } = await paymentService.createLoginLink(circle.stripeConnectAccountId);
    return { success: true, data: { url } };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}
