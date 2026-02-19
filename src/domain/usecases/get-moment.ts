import type { Moment } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import { MomentNotFoundError } from "@/domain/errors";

type GetMomentDeps = {
  momentRepository: MomentRepository;
};

export async function getMomentBySlug(
  slug: string,
  deps: GetMomentDeps
): Promise<Moment> {
  const moment = await deps.momentRepository.findBySlug(slug);

  if (!moment) {
    throw new MomentNotFoundError(slug);
  }

  return moment;
}

export async function getMomentById(
  id: string,
  deps: GetMomentDeps
): Promise<Moment> {
  const moment = await deps.momentRepository.findById(id);

  if (!moment) {
    throw new MomentNotFoundError(id);
  }

  return moment;
}
