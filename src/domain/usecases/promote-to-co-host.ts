import type { CircleMembership } from "@/domain/models/circle";
import { isActivePrimaryHost } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  CannotPromotePendingMemberError,
  InvalidPromotionTargetError,
} from "@/domain/errors";

type PromoteToCoHostInput = {
  circleId: string;
  hostUserId: string;
  targetUserId: string;
};

type PromoteToCoHostDeps = {
  circleRepository: CircleRepository;
  userRepository: UserRepository;
  emailService?: EmailService;
  emailStrings?: {
    promotedBy: (args: {
      inviterName: string;
      circleName: string;
    }) => Promise<{
      subject: string;
      heading: string;
      intro: string;
      rightsTitle: string;
      rightCreateEvents: string;
      rightManageRegistrations: string;
      rightUpdateCircle: string;
      rightBroadcast: string;
      rightReceiveNotifications: string;
      limitsNote: string;
      ctaLabel: string;
      footer: string;
      leaveLink: string;
    }>;
  };
};

export async function promoteToCoHost(
  input: PromoteToCoHostInput,
  deps: PromoteToCoHostDeps
): Promise<CircleMembership> {
  const { circleRepository, userRepository, emailService, emailStrings } = deps;

  // D3 : seul le HOST principal peut promouvoir (garde strict HOST, pas CO_HOST).
  const [callerMembership, targetMembership] = await Promise.all([
    circleRepository.findMembership(input.circleId, input.hostUserId),
    circleRepository.findMembership(input.circleId, input.targetUserId),
  ]);
  if (!isActivePrimaryHost(callerMembership)) {
    throw new UnauthorizedCircleActionError(input.hostUserId, input.circleId);
  }
  if (!targetMembership) {
    throw new NotMemberOfCircleError(input.circleId);
  }
  // D22 : uniquement les membres ACTIVE peuvent être promus.
  if (targetMembership.status !== "ACTIVE") {
    throw new CannotPromotePendingMemberError();
  }
  if (targetMembership.role !== "PLAYER") {
    throw new InvalidPromotionTargetError(targetMembership.role);
  }

  const updated = await circleRepository.updateMembershipRole(
    input.circleId,
    input.targetUserId,
    "CO_HOST"
  );

  // D19 : email de promotion best-effort — un échec ne bloque pas la promotion.
  if (emailService && emailStrings) {
    try {
      const [targetUser, inviter, circle] = await Promise.all([
        userRepository.findById(input.targetUserId),
        userRepository.findById(input.hostUserId),
        circleRepository.findById(input.circleId),
      ]);
      if (targetUser && inviter && circle) {
        const inviterName =
          [inviter.firstName, inviter.lastName].filter(Boolean).join(" ") ||
          inviter.email;
        const strings = await emailStrings.promotedBy({
          inviterName,
          circleName: circle.name,
        });
        await emailService.sendCoHostPromoted({
          to: targetUser.email,
          recipientName: targetUser.firstName ?? targetUser.email,
          inviterName,
          circleName: circle.name,
          circleSlug: circle.slug,
          circleCoverImage: circle.coverImage,
          strings,
        });
      }
    } catch {
      // Swallowed on purpose — see D19.
    }
  }

  return updated;
}
