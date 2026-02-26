import type { Moment } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError } from "@/domain/errors";

type GetCircleMomentsOptions = {
  /** Passe la vérification d'existence du Circle (utile quand la page appelante l'a déjà chargé). */
  skipCircleCheck?: boolean;
};

type GetCircleMomentsDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
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
