import Stripe from "stripe";
import type {
  PaymentService,
  CheckoutSessionParams,
  CheckoutSessionResult,
  ConnectAccountStatus,
  PaymentEvent,
  RefundParams,
  RefundStatus,
} from "@/domain/ports/services/payment-service";
import type { Circle } from "@/domain/models/circle";

/**
 * L'Organisateur est le marchand : il paie les frais et il porte les pertes,
 * avec le tableau de bord Express. Cette combinaison est en preview chez Stripe,
 * et cette version ne sert qu'à créer le compte, tout le reste passe en version
 * stable. Voir spec/features/paiements-direct-charges.md (D1, D2).
 */
const CONNECT_ACCOUNT_API_VERSION = "2026-10-28.preview";

/** URL publique uniquement : en local, l'Organisateur saisit ce champ à l'inscription. */
function publicCircleUrl(circle: Circle): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.startsWith("https://") ? `${appUrl}/circles/${circle.slug}` : undefined;
}

function toRefundStatus(status: string | null): RefundStatus {
  if (status === "succeeded") return "succeeded";
  if (status === "failed" || status === "canceled") return "failed";
  return "pending";
}

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
      const account = await stripe.accounts.create(
        {
          controller: {
            fees: { payer: "account" },
            losses: { payments: "stripe" },
            requirement_collection: "stripe",
            stripe_dashboard: { type: "express" },
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: circle.name,
            url: publicCircleUrl(circle),
          },
          metadata: { circleId: circle.id },
        },
        { apiVersion: CONNECT_ACCOUNT_API_VERSION }
      );
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

      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          // Carte seule (règlement immédiat) et prix affiché = prix payé : D6 et D7.
          payment_method_types: ["card"],
          adaptive_pricing: { enabled: false },
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
          customer_email: user.email,
          metadata: {
            userId: user.id,
            momentId: moment.id,
            circleId: circle.id,
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes (Stripe minimum)
          custom_text: {
            terms_of_service_acceptance: {
              message: `En procédant au paiement, vous acceptez les [CGU](${process.env.NEXT_PUBLIC_APP_URL || "https://the-playground.fr"}/legal/cgu).`,
            },
          },
          consent_collection: {
            terms_of_service: "required",
          },
        },
        { stripeAccount: circle.stripeConnectAccountId! }
      );

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

      // Les paiements vivent sur les comptes des Organisateurs : un événement
      // sans compte ne nous concerne pas (ex. endpoint plateforme, mal configuré).
      const accountId = event.account;
      if (!accountId) {
        return { type: "unknown" };
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};

        if (!metadata.userId || !metadata.momentId || !metadata.circleId) {
          return { type: "unknown" };
        }

        // Ne jamais confirmer une inscription avant l'encaissement.
        if (session.payment_status !== "paid") {
          return { type: "unknown" };
        }

        // Retrieve the receipt URL from the charge
        let receiptUrl = "";
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string,
            {},
            { stripeAccount: accountId }
          );
          if (paymentIntent.latest_charge) {
            const charge = await stripe.charges.retrieve(
              paymentIntent.latest_charge as string,
              {},
              { stripeAccount: accountId }
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
          accountId,
        };
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        return {
          type: "charge_refunded",
          paymentIntentId: (charge.payment_intent as string) ?? "",
          accountId,
        };
      }

      return { type: "unknown" };
    },

    async refund({ paymentIntentId, accountId }: RefundParams) {
      const refund = await stripe.refunds.create(
        { payment_intent: paymentIntentId },
        { stripeAccount: accountId }
      );
      return { status: toRefundStatus(refund.status) };
    },
  };
}
