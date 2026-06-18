import type { CircleMembership } from "@/domain/models/circle";
import { isActivePrimaryHost } from "@/domain/models/circle";
import { isConfirmedParticipation } from "@/domain/models/registration";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
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
  momentRepository: MomentRepository;
  registrationRepository: RegistrationRepository;
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
  const {
    circleRepository,
    momentRepository,
    registrationRepository,
    userRepository,
    emailService,
    emailStrings,
  } = deps;

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

  // Le nouveau co-host est automatiquement inscrit à tous les événements à venir
  // du Circle (REGISTERED), comme tout organisateur — voir
  // spec/features/co-host-event-participation.md. Insertion directe sans email.
  const now = new Date();
  const moments = await momentRepository.findByCircleId(input.circleId);
  const upcoming = moments.filter(
    (moment) =>
      moment.startsAt > now &&
      (moment.status === "DRAFT" || moment.status === "PUBLISHED")
  );
  // Une seule requête pour les inscriptions existantes du membre sur ces
  // événements (évite le N+1).
  const existingByMoment = await registrationRepository.findByMomentIdsAndUser(
    upcoming.map((moment) => moment.id),
    input.targetUserId
  );
  await Promise.all(
    upcoming.map((moment) => {
      const existing = existingByMoment.get(moment.id) ?? null;
      // Déjà participant (REGISTERED / CHECKED_IN) : idempotent, rien à faire.
      if (existing && isConfirmedParticipation(existing.status)) {
        return undefined;
      }
      // WAITLISTED / PENDING_APPROVAL / CANCELLED / REJECTED → forcé REGISTERED
      // (un organisateur n'est ni en liste d'attente ni en attente de validation
      // d'un événement de son propre Circle).
      if (existing) {
        return registrationRepository.update(existing.id, {
          status: "REGISTERED",
          cancelledAt: null,
        });
      }
      return registrationRepository.create({
        momentId: moment.id,
        userId: input.targetUserId,
        status: "REGISTERED",
      });
    })
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
