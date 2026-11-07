import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { InvalidWebhookSignatureError } from "@/domain/errors";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { handlePaymentWebhook } from "@/domain/usecases/handle-payment-webhook";
import { notifyRefundFailure } from "@/app/actions/helpers/notify-refund-failure";
import { sendRegistrationEmails } from "@/app/actions/registration";
import { buildEmailLocaleResolver } from "@/app/actions/helpers/email-locale-resolver";

const paymentService = createStripePaymentService();

export async function POST(request: Request) {
  try {
    // Raw body is required for Stripe signature verification
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const result = await handlePaymentWebhook(
      { payload, signature },
      {
        paymentService,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
      }
    );

    if (result.handled) {
      const { registration } = result;
      // Webhook : appelé par Stripe, sans page ni langue d'interface. Aucun
      // déclencheur → chaque destinataire (Participant payeur compris) reçoit
      // l'email dans la langue mémorisée sur son compte.
      const resolver = await buildEmailLocaleResolver(null);
      // `after()` garantit la complétion sur Vercel Fluid Compute après le retour
      // du route handler. Une promesse fire-and-forget nue serait larguée au gel
      // de l'instance (emails + Slack perdus par intermittence).
      after(async () => {
        try {
          await sendRegistrationEmails(
            registration.momentId,
            registration.userId,
            registration,
            resolver
          );
        } catch (error) {
          Sentry.captureException(error);
        }
      });

      return NextResponse.json({
        received: true,
        registrationId: registration.id,
      });
    }

    if (result.refundFailure) {
      const { momentId, userId } = result.refundFailure;
      Sentry.captureMessage(`Stripe webhook: ${result.reason}`, "error");
      const resolver = await buildEmailLocaleResolver(userId);
      after(() =>
        notifyRefundFailure(momentId, [userId], resolver).catch((error) =>
          Sentry.captureException(error)
        )
      );
    }

    // Not handled but not an error (idempotence, ignored event type, etc.)
    return NextResponse.json({ received: true, reason: result.reason });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Répondre une erreur pour que Stripe rejoue l'événement : sinon, une panne
    // passagère laisserait un Participant payé sans inscription. Le rejeu est sans
    // risque de doublon (garde d'idempotence sur stripePaymentIntentId).
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
