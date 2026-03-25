import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { handlePaymentWebhook } from "@/domain/usecases/handle-payment-webhook";
import { sendRegistrationEmails } from "@/app/actions/registration";

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
      // Send confirmation email (fire-and-forget — don't block the webhook response)
      const t = await getTranslations("Email");
      sendRegistrationEmails(
        result.registration.momentId,
        result.registration.userId,
        result.registration,
        t,
        "fr" // Default locale for webhook-triggered emails
      ).catch((error) => Sentry.captureException(error));

      return NextResponse.json({
        received: true,
        registrationId: result.registration.id,
      });
    }

    // Not handled but not an error (idempotence, ignored event type, etc.)
    return NextResponse.json({ received: true, reason: result.reason });
  } catch (error) {
    Sentry.captureException(error);
    // Always return 200 to Stripe to prevent retries on our errors
    // (Stripe retries on 4xx/5xx, which could cause duplicate processing)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 200 }
    );
  }
}
