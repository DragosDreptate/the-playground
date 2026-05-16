import type { EmailService } from "@/domain/ports/services/email-service";

export function createNoopEmailService(): EmailService {
  const noop = async (): Promise<void> => {};
  return {
    sendRegistrationConfirmation: noop,
    sendWaitlistPromotion: noop,
    sendHostNewRegistration: noop,
    sendNewComment: noop,
    sendNewMomentToMember: noop,
    sendNewMomentToMembers: noop,
    sendMomentUpdate: noop,
    sendMomentUpdateBatch: noop,
    sendMomentCancelled: noop,
    sendMomentCancelledBatch: noop,
    sendHostMomentCreated: noop,
    sendBroadcastMoments: noop,
    sendAdminEntityCreated: noop,
    sendCircleInvitation: noop,
    sendCircleInvitations: noop,
    sendAdminNewUser: noop,
    sendHostNewCircleMember: noop,
    sendRegistrationReminderBatch: noop,
    sendMemberRemovedFromCircle: noop,
    sendRegistrationRemovedByHost: noop,
    sendApprovalNotification: noop,
    sendHostPaidCancellation: noop,
    sendOnboardingWelcome: noop,
    sendCoHostPromoted: noop,
    sendCoHostDemoted: noop,
    sendHostContactMessage: noop,
  };
}
