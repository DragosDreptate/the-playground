import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

type DeleteMomentInput = {
  momentId: string;
  userId: string;
};

type DeleteMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

export async function deleteMoment(
  input: DeleteMomentInput,
  deps: DeleteMomentDeps
): Promise<void> {
  const { momentRepository, circleRepository } = deps;

  const existing = await momentRepository.findById(input.momentId);

  if (!existing) {
    throw new MomentNotFoundError(input.momentId);
  }

  const membership = await circleRepository.findMembership(
    existing.circleId,
    input.userId
  );

  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  await momentRepository.delete(input.momentId);
}
