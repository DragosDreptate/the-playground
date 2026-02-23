import type { Moment, LocationType, MomentStatus, CoverImageAttribution } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

type UpdateMomentInput = {
  momentId: string;
  userId: string;
  title?: string;
  description?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  startsAt?: Date;
  endsAt?: Date | null;
  locationType?: LocationType;
  locationName?: string | null;
  locationAddress?: string | null;
  videoLink?: string | null;
  capacity?: number | null;
  price?: number;
  currency?: string;
  status?: MomentStatus;
};

type UpdateMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

type UpdateMomentResult = {
  moment: Moment;
};

export async function updateMoment(
  input: UpdateMomentInput,
  deps: UpdateMomentDeps
): Promise<UpdateMomentResult> {
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

  const { momentId: _, userId: __, ...updates } = input;

  const moment = await momentRepository.update(input.momentId, updates);

  return { moment };
}
