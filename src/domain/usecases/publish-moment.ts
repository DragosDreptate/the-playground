import type { Moment } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  MomentAlreadyPublishedError,
} from "@/domain/errors";

type PublishMomentInput = {
  momentId: string;
  userId: string;
};

type PublishMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

type PublishMomentResult = {
  moment: Moment;
};

export async function publishMoment(
  input: PublishMomentInput,
  deps: PublishMomentDeps
): Promise<PublishMomentResult> {
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

  if (existing.status !== "DRAFT") {
    throw new MomentAlreadyPublishedError(input.momentId);
  }

  const moment = await momentRepository.update(input.momentId, {
    status: "PUBLISHED",
  });

  return { moment };
}
