import type { CircleRepository, FeaturedCircle } from "@/domain/ports/repositories/circle-repository";

type GetFeaturedCirclesDeps = {
  circleRepository: CircleRepository;
};

export async function getFeaturedCircles(
  deps: GetFeaturedCirclesDeps
): Promise<FeaturedCircle[]> {
  return deps.circleRepository.findFeatured();
}
