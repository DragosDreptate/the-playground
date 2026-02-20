import type { Moment, LocationType } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  MomentSlugAlreadyExistsError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import { generateSlug } from "@/lib/slug";

type CreateMomentInput = {
  circleId: string;
  userId: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
  capacity: number | null;
  price: number;
  currency: string;
};

type CreateMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

type CreateMomentResult = {
  moment: Moment;
};

export async function createMoment(
  input: CreateMomentInput,
  deps: CreateMomentDeps
): Promise<CreateMomentResult> {
  const { momentRepository, circleRepository } = deps;

  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId
  );

  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  let slug = generateSlug(input.title);

  if (await momentRepository.slugExists(slug)) {
    const suffix = Date.now().toString(36);
    slug = `${slug}-${suffix}`;

    if (await momentRepository.slugExists(slug)) {
      throw new MomentSlugAlreadyExistsError(slug);
    }
  }

  const moment = await momentRepository.create({
    slug,
    circleId: input.circleId,
    createdById: input.userId,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    locationType: input.locationType,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    videoLink: input.videoLink,
    capacity: input.capacity,
    price: input.price,
    currency: input.currency,
    status: "DRAFT",
  });

  return { moment };
}
