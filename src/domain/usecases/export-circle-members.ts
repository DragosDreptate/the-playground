import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

export type ExportCircleMembersDeps = {
  circleRepository: CircleRepository;
};

export type ExportCircleMembersInput = {
  circleId: string;
  callerUserId: string | null;
};

/**
 * Renvoie tous les membres ACTIFS d'un Circle pour export CSV.
 * Règle d'accès : caller ACTIVE avec rôle HOST ou CO_HOST.
 * Tri : HOST > CO_HOST > PLAYER, puis par date d'arrivée (asc) dans chaque groupe.
 */
export async function exportCircleMembers(
  input: ExportCircleMembersInput,
  deps: ExportCircleMembersDeps,
): Promise<CircleMemberWithUser[]> {
  const { circleId, callerUserId } = input;

  if (!callerUserId) {
    throw new UnauthorizedCircleActionError("anonymous", circleId);
  }

  const circle = await deps.circleRepository.findById(circleId);
  if (!circle) throw new CircleNotFoundError(circleId);

  const membership = await deps.circleRepository.findMembership(circleId, callerUserId);
  if (
    membership?.status !== "ACTIVE" ||
    (membership.role !== "HOST" && membership.role !== "CO_HOST")
  ) {
    throw new UnauthorizedCircleActionError(callerUserId, circleId);
  }

  const [organizers, players] = await Promise.all([
    deps.circleRepository.findOrganizers(circleId),
    deps.circleRepository.findMembersByRole(circleId, "PLAYER"),
  ]);

  return [...organizers, ...players];
}
