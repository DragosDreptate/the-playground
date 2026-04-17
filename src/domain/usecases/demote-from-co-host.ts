import type { CircleMembership } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  InvalidDemotionTargetError,
  CircleNotFoundError,
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

  // 1. Seul le HOST principal peut rétrograder (D3)
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

  // 3. Seul un CO_HOST peut être rétrogradé
  if (targetMembership.role !== "CO_HOST") {
    throw new InvalidDemotionTargetError(targetMembership.role);
  }

  // 4. Rétrogradation
  const updated = await circleRepository.updateMembershipRole(
    input.circleId,
    input.targetUserId,
    "PLAYER"
  );

  // 5. Email de rétrogradation (D19) — best-effort
  if (emailService && emailStrings) {
    try {
      const [targetUser, circle] = await Promise.all([
        userRepository.findById(input.targetUserId),
        circleRepository.findById(input.circleId),
      ]);

      if (!targetUser || !circle) {
        if (!circle) throw new CircleNotFoundError(input.circleId);
      } else {
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
      // L'échec d'envoi d'email ne bloque pas la rétrogradation en base.
    }
  }

  return updated;
}
