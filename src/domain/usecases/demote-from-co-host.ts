import type { CircleMembership } from "@/domain/models/circle";
import { isActivePrimaryHost } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  InvalidDemotionTargetError,
} from "@/domain/errors";

type DemoteFromCoHostInput = {
  circleId: string;
  hostUserId: string;
  targetUserId: string;
};

type DemoteFromCoHostDeps = {
  circleRepository: CircleRepository;
  userRepository: UserRepository;
  emailService?: EmailService;
  emailStrings?: {
    demoted: (args: { circleName: string }) => Promise<{
      subject: string;
      heading: string;
      intro: string;
      newRoleLabel: string;
      registrationsNote: string;
      ctaLabel: string;
      footer: string;
      preferencesLink: string;
    }>;
  };
};

export async function demoteFromCoHost(
  input: DemoteFromCoHostInput,
  deps: DemoteFromCoHostDeps
): Promise<CircleMembership> {
  const { circleRepository, userRepository, emailService, emailStrings } = deps;

  // D3 : seul le HOST principal peut rétrograder.
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
  if (targetMembership.role !== "CO_HOST") {
    throw new InvalidDemotionTargetError(targetMembership.role);
  }

  const updated = await circleRepository.updateMembershipRole(
    input.circleId,
    input.targetUserId,
    "PLAYER"
  );

  // D19 : email de rétrogradation best-effort.
  if (emailService && emailStrings) {
    try {
      const [targetUser, circle] = await Promise.all([
        userRepository.findById(input.targetUserId),
        circleRepository.findById(input.circleId),
      ]);
      if (targetUser && circle) {
        const strings = await emailStrings.demoted({ circleName: circle.name });
        await emailService.sendCoHostDemoted({
          to: targetUser.email,
          recipientName: targetUser.firstName ?? targetUser.email,
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
