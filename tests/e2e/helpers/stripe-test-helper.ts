import Stripe from "stripe";

/**
 * Helper for Stripe E2E tests.
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the environment.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Generate a signed webhook payload that our webhook route will accept.
 */
export function signWebhookPayload(payload: object): {
  body: string;
  signature: string;
} {
  const body = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: webhookSecret,
  });
  return { body, signature };
}

/**
 * Build a checkout.session.completed event payload.
 */
export function buildCheckoutCompletedEvent(params: {
  userId: string;
  momentId: string;
  circleId: string;
  paymentIntentId?: string;
}): object {
  const {
    userId,
    momentId,
    circleId,
    paymentIntentId = `pi_test_${Date.now()}`,
  } = params;

  return {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: "checkout.session",
        payment_intent: paymentIntentId,
        metadata: {
          userId,
          momentId,
          circleId,
        },
        customer_email: "test@test.playground",
        amount_total: 1000,
        currency: "eur",
      },
    },
  };
}

/**
 * Send a simulated webhook to the local server.
 */
export async function sendSimulatedWebhook(
  baseUrl: string,
  payload: object
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { body, signature } = signWebhookPayload(payload);
  const response = await fetch(`${baseUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "stripe-signature": signature,
    },
    body,
  });
  const json = await response.json();
  return { status: response.status, body: json as Record<string, unknown> };
}
