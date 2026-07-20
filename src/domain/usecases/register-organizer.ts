import type { Registration } from "@/domain/models/registration";
import { isConfirmedParticipation } from "@/domain/models/registration";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import { isPersistedOrganizer } from "./is-persisted-organizer";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

type RegisterOrganizerInput = {
  momentId: string;
  userId: string;
};

type RegisterOrganizerDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

type RegisterOrganizerResult = {
  registration: Registration;
};

/**
 * Inscrit un organisateur (HOST/CO_HOST) comme Participant à un événement de son
 * propre Circle, sur action volontaire. Contrairement à joinMoment : REGISTERED
 * direct, sans paiement, sans contrôle de capacité, sans liste d'attente — un
 * organisateur n'attend jamais une place ni une validation sur son propre
 * événement. Idempotent : déjà REGISTERED / CHECKED_IN → no-op.
 *
 * Le contrôle d'appartenance passe par findOrganizers (membres réels et actifs du
 * Circle) : un admin en host mode (membership synthétique, non persistée) n'y
 * figure pas et ne peut donc pas s'inscrire — cohérent avec l'auto-inscription du
 * créateur dans createMoment (pas de Registration fantôme).
 */
export async function registerOrganizer(
  input: RegisterOrganizerInput,
  deps: RegisterOrganizerDeps
): Promise<RegisterOrganizerResult> {
  const { momentRepository, circleRepository, registrationRepository } = deps;

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  // Un événement passé ou annulé n'accepte plus d'inscription.
  if (moment.status === "PAST" || moment.status === "CANCELLED") {
    throw new MomentNotOpenForRegistrationError(input.momentId);
  }

  // Seul un organisateur réel (membre persisté) du Circle peut s'inscrire ainsi.
  if (!(await isPersistedOrganizer(circleRepository, moment.circleId, input.userId))) {
    throw new UnauthorizedMomentActionError();
  }

  const existing = await registrationRepository.findByMomentAndUser(
    input.momentId,
    input.userId
  );

  // Déjà participant (REGISTERED / CHECKED_IN) → idempotent, rien à faire.
  if (existing && isConfirmedParticipation(existing.status)) {
    return { registration: existing };
  }

  // Tout autre statut existant (WAITLISTED, PENDING_APPROVAL, CANCELLED,
  // REJECTED) est forcé à REGISTERED ; sinon on crée l'inscription.
  const registration = existing
    ? await registrationRepository.update(existing.id, {
        status: "REGISTERED",
        cancelledAt: null,
      })
    : await registrationRepository.create({
        momentId: input.momentId,
        userId: input.userId,
        status: "REGISTERED",
      });

  return { registration };
}
