import { vi } from "vitest";
import type { EmailService } from "@/domain/ports/services/email-service";

export function createMockEmailService(
  overrides: Partial<EmailService> = {}
): EmailService {
  return {
    sendRegistrationConfirmation: vi.fn().mockResolvedValue(undefined),
    sendWaitlistPromotion: vi.fn().mockResolvedValue(undefined),
    sendHostNewRegistration: vi.fn().mockResolvedValue(undefined),
    sendNewComment: vi.fn().mockResolvedValue(undefined),
    sendNewMomentToMember: vi.fn().mockResolvedValue(undefined),
    sendNewMomentToMembers: vi.fn().mockResolvedValue(undefined),
    sendMomentUpdate: vi.fn().mockResolvedValue(undefined),
    sendMomentUpdateBatch: vi.fn().mockResolvedValue(undefined),
    sendMomentCancelled: vi.fn().mockResolvedValue(undefined),
    sendMomentCancelledBatch: vi.fn().mockResolvedValue(undefined),
    sendHostMomentCreated: vi.fn().mockResolvedValue(undefined),
    sendBroadcastMoments: vi.fn().mockResolvedValue(undefined),
    sendAdminEntityCreated: vi.fn().mockResolvedValue(undefined),
    sendCircleInvitation: vi.fn().mockResolvedValue(undefined),
    sendCircleInvitations: vi.fn().mockResolvedValue(undefined),
    sendAdminNewUser: vi.fn().mockResolvedValue(undefined),
    sendHostNewCircleMember: vi.fn().mockResolvedValue(undefined),
    sendRegistrationReminderBatch: vi.fn().mockResolvedValue(undefined),
    sendMemberRemovedFromCircle: vi.fn().mockResolvedValue(undefined),
    sendRegistrationRemovedByHost: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
