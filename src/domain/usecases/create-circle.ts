import type { Circle, CircleVisibility, CircleCategory, CoverImageAttribution } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { SlugAlreadyExistsError } from "@/domain/errors";
import { generateSlug } from "@/lib/slug";

type CreateCircleInput = {
  name: string;
  description: string;
  visibility: CircleVisibility;
  category?: CircleCategory;
  city?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  userId: string;
};

type CreateCircleDeps = {
  circleRepository: CircleRepository;
};

type CreateCircleResult = {
  circle: Circle;
};

export async function createCircle(
  input: CreateCircleInput,
  deps: CreateCircleDeps
): Promise<CreateCircleResult> {
  const { circleRepository } = deps;

  let slug = generateSlug(input.name);

  if (await circleRepository.slugExists(slug)) {
    const suffix = Date.now().toString(36);
    slug = `${slug}-${suffix}`;

    if (await circleRepository.slugExists(slug)) {
      throw new SlugAlreadyExistsError(slug);
    }
  }

  // Création atomique : le Circle et la membership HOST sont créés dans une seule transaction
  const circle = await circleRepository.createWithHostMembership(
    {
      name: input.name,
      slug,
      description: input.description,
      visibility: input.visibility,
      ...(input.category !== undefined && { category: input.category }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
      ...(input.coverImageAttribution !== undefined && {
        coverImageAttribution: input.coverImageAttribution,
      }),
    },
    input.userId
  );

  return { circle };
}
