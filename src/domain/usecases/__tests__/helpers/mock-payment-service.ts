import { vi } from "vitest";
import type { PaymentService } from "@/domain/ports/services/payment-service";

export function createMockPaymentService(
  overrides: Partial<PaymentService> = {}
): PaymentService {
  return {
    createConnectAccount: vi.fn().mockResolvedValue({ accountId: "acct_test_123" }),
    createOnboardingLink: vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/setup/test" }),
    createLoginLink: vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/express/test" }),
    getConnectAccountStatus: vi.fn().mockResolvedValue("active"),
    createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test", sessionId: "cs_test_123" }),
    handleWebhookEvent: vi.fn().mockResolvedValue({ type: "unknown" }),
    refund: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
