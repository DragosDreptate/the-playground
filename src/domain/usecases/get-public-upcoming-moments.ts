import type { MomentRepository, PublicMomentFilters, PublicMoment } from "@/domain/ports/repositories/moment-repository";

type GetPublicUpcomingMomentsDeps = {
  momentRepository: MomentRepository;
};

export async function getPublicUpcomingMoments(
  filters: PublicMomentFilters,
  deps: GetPublicUpcomingMomentsDeps
): Promise<PublicMoment[]> {
  return deps.momentRepository.findPublicUpcoming(filters);
}
