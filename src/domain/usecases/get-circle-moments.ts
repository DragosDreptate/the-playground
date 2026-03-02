import type { Moment } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError } from "@/domain/errors";

type GetCircleMomentsDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

type GetCircleMomentsOptions = {
  /**
   * Passer `true` si le Circle a déjà été chargé et vérifié en amont.
   * Évite un `findById` redondant (économise une requête DB).
   */
  skipCircleCheck?: boolean;
};

export async function getCircleMoments(
  circleId: string,
  deps: GetCircleMomentsDeps,
  options: GetCircleMomentsOptions = {}
): Promise<Moment[]> {
  if (!options.skipCircleCheck) {
    const circle = await deps.circleRepository.findById(circleId);
    if (!circle) {
      throw new CircleNotFoundError(circleId);
    }
  }

  return deps.momentRepository.findByCircleId(circleId);
}
