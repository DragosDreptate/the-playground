import type { Circle } from "@/domain/models/circle";
import type { Moment } from "@/domain/models/moment";
import type { User } from "@/domain/models/user";

// --- Types ---

export type ConnectAccountStatus = "pending" | "active" | "restricted" | "disabled";

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
    }
  | { type: "charge_refunded"; paymentIntentId: string }
  | { type: "unknown" };

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

  refund(paymentIntentId: string): Promise<void>;
}
