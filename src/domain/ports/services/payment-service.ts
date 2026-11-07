import type { Circle } from "@/domain/models/circle";
import type { Moment } from "@/domain/models/moment";
import type { User } from "@/domain/models/user";

// --- Types ---

/**
 * `verifying` : dossier complet, Stripe vérifie, rien à faire pour l'Organisateur.
 * `pending`, `restricted`, `disabled` : l'Organisateur doit reprendre son dossier.
 */
export type ConnectAccountStatus = "pending" | "verifying" | "active" | "restricted" | "disabled";

export type CheckoutSessionParams = {
  moment: Moment;
  user: User;
  circle: Circle;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSessionResult = {
  url: string;
  sessionId: string;
};

export type PaymentEvent =
  | {
      type: "checkout_completed";
      userId: string;
      momentId: string;
      circleId: string;
      paymentIntentId: string;
      receiptUrl: string;
      /** Compte de l'Organisateur, sur lequel le paiement a eu lieu. */
      accountId: string;
    }
  | { type: "charge_refunded"; paymentIntentId: string; accountId: string }
  | { type: "unknown" };

/**
 * Le paiement vit sur le compte de l'Organisateur : le rembourser exige de
 * désigner ce compte.
 */
export type RefundParams = {
  paymentIntentId: string;
  accountId: string;
};

export type RefundStatus = "succeeded" | "pending" | "failed";

// --- Port interface ---

export interface PaymentService {
  createConnectAccount(circle: Circle): Promise<{ accountId: string }>;

  createOnboardingLink(
    accountId: string,
    returnUrl: string
  ): Promise<{ url: string }>;

  createLoginLink(accountId: string): Promise<{ url: string }>;

  getConnectAccountStatus(
    accountId: string
  ): Promise<ConnectAccountStatus>;

  createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult>;

  handleWebhookEvent(
    payload: string,
    signature: string
  ): Promise<PaymentEvent>;

  refund(params: RefundParams): Promise<{ status: RefundStatus }>;
}
