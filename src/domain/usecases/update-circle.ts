import type { Circle, CircleVisibility, CircleCategory, CoverImageAttribution } from "@/domain/models/circle";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

type UpdateCircleInput = {
  circleId: string;
  userId: string;
  name?: string;
  description?: string;
  visibility?: CircleVisibility;
  category?: CircleCategory | null;
  customCategory?: string | null;
  city?: string | null;
  website?: string | null;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  requiresApproval?: boolean;
};

type UpdateCircleDeps = {
  circleRepository: CircleRepository;
};

type UpdateCircleResult = {
  circle: Circle;
};

export async function updateCircle(
  input: UpdateCircleInput,
  deps: UpdateCircleDeps
): Promise<UpdateCircleResult> {
  const { circleRepository } = deps;

  const circle = await circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  const updated = await circleRepository.update(input.circleId, {
    name: input.name,
    description: input.description,
    visibility: input.visibility,
    category: input.category,
    customCategory: input.customCategory,
    city: input.city,
    website: input.website,
    ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
    ...(input.coverImageAttribution !== undefined && {
      coverImageAttribution: input.coverImageAttribution,
    }),
    ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
  });

  return { circle: updated };
}
