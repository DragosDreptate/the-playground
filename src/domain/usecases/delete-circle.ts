import { isActivePrimaryHost } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  CircleHasUnrefundedPaymentsError,
  CircleNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";

type DeleteCircleInput = {
  circleId: string;
  userId: string;
};

type DeleteCircleDeps = {
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

export async function deleteCircle(
  input: DeleteCircleInput,
  deps: DeleteCircleDeps
): Promise<void> {
  const { circleRepository, registrationRepository } = deps;

  const circle = await circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActivePrimaryHost(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  // La suppression efface les inscriptions en cascade : un Participant payé ne
  // pourrait plus être remboursé par The Playground.
  if (await registrationRepository.hasUnrefundedPaymentsInCircle(input.circleId)) {
    throw new CircleHasUnrefundedPaymentsError(input.circleId);
  }

  await circleRepository.delete(input.circleId);
}
