import Stripe from "stripe";
import type {
  PaymentService,
  CheckoutSessionParams,
  CheckoutSessionResult,
  ConnectAccountStatus,
  PaymentEvent,
} from "@/domain/ports/services/payment-service";
import type { Circle } from "@/domain/models/circle";

export function createStripePaymentService(): PaymentService {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    // Return a stub that throws on any call — prevents crash at module load
    const notConfigured = () => {
      throw new Error("Stripe is not configured: STRIPE_SECRET_KEY is missing");
    };
    return {
      createConnectAccount: notConfigured,
      createOnboardingLink: notConfigured,
      createLoginLink: notConfigured,
      getConnectAccountStatus: notConfigured,
      createCheckoutSession: notConfigured,
      handleWebhookEvent: notConfigured,
      refund: notConfigured,
    } as unknown as PaymentService;
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: "2026-02-25.clover",
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  return {
    async createConnectAccount(circle: Circle) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { circleId: circle.id },
      });
      return { accountId: account.id };
    },

    async createOnboardingLink(accountId: string, returnUrl: string) {
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: returnUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
      return { url: link.url };
    },

    async createLoginLink(accountId: string) {
      const link = await stripe.accounts.createLoginLink(accountId);
      return { url: link.url };
    },

    async getConnectAccountStatus(
      accountId: string
    ): Promise<ConnectAccountStatus> {
      const account = await stripe.accounts.retrieve(accountId);
      if (account.details_submitted && account.charges_enabled) {
        return "active";
      }
      if (account.requirements?.disabled_reason) {
        return "disabled";
      }
      if (account.requirements?.currently_due?.length) {
        return "restricted";
      }
      return "pending";
    },

    async createCheckoutSession(
      params: CheckoutSessionParams
    ): Promise<CheckoutSessionResult> {
      const { moment, user, circle, successUrl, cancelUrl } = params;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: moment.currency.toLowerCase(),
              product_data: {
                name: moment.title,
              },
              unit_amount: moment.price,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: {
            destination: circle.stripeConnectAccountId!,
          },
        },
        customer_email: user.email,
        metadata: {
          userId: user.id,
          momentId: moment.id,
          circleId: circle.id,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes (Stripe minimum)
        allow_promotion_codes: true,
      });

      return { url: session.url!, sessionId: session.id };
    },

    async handleWebhookEvent(
      payload: string,
      signature: string
    ): Promise<PaymentEvent> {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};

        if (!metadata.userId || !metadata.momentId || !metadata.circleId) {
          return { type: "unknown" };
        }

        // Retrieve the receipt URL from the charge
        let receiptUrl = "";
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string
          );
          if (paymentIntent.latest_charge) {
            const charge = await stripe.charges.retrieve(
              paymentIntent.latest_charge as string
            );
            receiptUrl = charge.receipt_url ?? "";
          }
        }

        return {
          type: "checkout_completed",
          userId: metadata.userId,
          momentId: metadata.momentId,
          circleId: metadata.circleId,
          paymentIntentId: (session.payment_intent as string) ?? "",
          receiptUrl,
        };
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        return {
          type: "charge_refunded",
          paymentIntentId: (charge.payment_intent as string) ?? "",
        };
      }

      return { type: "unknown" };
    },

    async refund(paymentIntentId: string) {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });
    },
  };
}
