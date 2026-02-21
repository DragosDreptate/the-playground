import { vi } from "vitest";
import type { EmailService } from "@/domain/ports/services/email-service";

export function createMockEmailService(
  overrides: Partial<EmailService> = {}
): EmailService {
  return {
    sendRegistrationConfirmation: vi.fn().mockResolvedValue(undefined),
    sendWaitlistPromotion: vi.fn().mockResolvedValue(undefined),
    sendHostNewRegistration: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
