import type { CircleRepository, PublicCircleFilters, PublicCircle } from "@/domain/ports/repositories/circle-repository";

type GetPublicCirclesDeps = {
  circleRepository: CircleRepository;
};

export async function getPublicCircles(
  filters: PublicCircleFilters,
  deps: GetPublicCirclesDeps
): Promise<PublicCircle[]> {
  return deps.circleRepository.findPublic(filters);
}
