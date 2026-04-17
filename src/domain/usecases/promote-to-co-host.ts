import type { CircleMembership } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  CannotPromotePendingMemberError,
  InvalidPromotionTargetError,
  CircleNotFoundError,
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

  // 1. Seul le HOST principal peut promouvoir (D3)
  const callerMembership = await circleRepository.findMembership(
    input.circleId,
    input.hostUserId
  );
  if (
    !callerMembership ||
    callerMembership.role !== "HOST" ||
    callerMembership.status !== "ACTIVE"
  ) {
    throw new UnauthorizedCircleActionError(input.hostUserId, input.circleId);
  }

  // 2. Charger la membership de la cible
  const targetMembership = await circleRepository.findMembership(
    input.circleId,
    input.targetUserId
  );
  if (!targetMembership) {
    throw new NotMemberOfCircleError(input.circleId);
  }

  // 3. Guard D22 : uniquement les membres ACTIVE peuvent être promus
  if (targetMembership.status !== "ACTIVE") {
    throw new CannotPromotePendingMemberError();
  }

  // 4. Seul un PLAYER peut être promu en CO_HOST
  if (targetMembership.role !== "PLAYER") {
    throw new InvalidPromotionTargetError(targetMembership.role);
  }

  // 5. Promotion
  const updated = await circleRepository.updateMembershipRole(
    input.circleId,
    input.targetUserId,
    "CO_HOST"
  );

  // 6. Email de promotion (D19) — best-effort, n'annule pas la promotion en cas d'échec
  if (emailService && emailStrings) {
    try {
      const [targetUser, inviter, circle] = await Promise.all([
        userRepository.findById(input.targetUserId),
        userRepository.findById(input.hostUserId),
        circleRepository.findById(input.circleId),
      ]);

      if (!targetUser || !inviter || !circle) {
        if (!circle) throw new CircleNotFoundError(input.circleId);
      } else {
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
      // L'échec d'envoi d'email ne bloque pas la promotion en base.
    }
  }

  return updated;
}
