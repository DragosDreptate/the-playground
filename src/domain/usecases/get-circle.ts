import type { Circle } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError } from "@/domain/errors";

type GetCircleDeps = {
  circleRepository: CircleRepository;
};

export async function getCircleBySlug(
  slug: string,
  deps: GetCircleDeps
): Promise<Circle> {
  const circle = await deps.circleRepository.findBySlug(slug);

  if (!circle) {
    throw new CircleNotFoundError(slug);
  }

  return circle;
}

export async function getCircleById(
  id: string,
  deps: GetCircleDeps
): Promise<Circle> {
  const circle = await deps.circleRepository.findById(id);

  if (!circle) {
    throw new CircleNotFoundError(id);
  }

  return circle;
}
