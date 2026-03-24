import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { createStripePaymentService } from "@/infrastructure/services";
import { handlePaymentWebhook } from "@/domain/usecases/handle-payment-webhook";

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
