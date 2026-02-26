import type { Moment, LocationType, CoverImageAttribution } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  MomentSlugAlreadyExistsError,
  MomentPastDateError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import { generateSlug } from "@/lib/slug";

type CreateMomentInput = {
  circleId: string;
  userId: string;
  title: string;
  description: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
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
  registrationRepository: RegistrationRepository;
};

type CreateMomentResult = {
  moment: Moment;
};

export async function createMoment(
  input: CreateMomentInput,
  deps: CreateMomentDeps
): Promise<CreateMomentResult> {
  const { momentRepository, circleRepository, registrationRepository } = deps;

  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId
  );

  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  if (input.startsAt < new Date()) {
    throw new MomentPastDateError();
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
    coverImage: input.coverImage,
    coverImageAttribution: input.coverImageAttribution,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    locationType: input.locationType,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    videoLink: input.videoLink,
    capacity: input.capacity,
    price: input.price,
    currency: input.currency,
    status: "PUBLISHED",
  });

  // L'organisateur est automatiquement inscrit en tant que Participant
  await registrationRepository.create({
    momentId: moment.id,
    userId: input.userId,
    status: "REGISTERED",
  });

  return { moment };
}
