import type { RegistrationWithUser } from "@/domain/models/registration";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";

export type MomentUpdateRecipient = {
  to: string;
  playerName: string;
};

/**
 * Sépare les destinataires d'une notif de mise à jour d'événement en deux groupes :
 * - `participants` : inscrits REGISTERED qui ne sont PAS Organisateurs du Circle
 * - `hosts` : Organisateurs du Circle (reçoivent la version « Organisateur » du mail)
 *
 * Un Organisateur inscrit à son propre événement ne reçoit donc qu'un seul email
 * (la version Organisateur), jamais la version Participant en plus.
 */
export function partitionMomentUpdateRecipients(
  confirmedRegistrations: RegistrationWithUser[],
  hosts: CircleMemberWithUser[]
): { participants: MomentUpdateRecipient[]; hosts: MomentUpdateRecipient[] } {
  const hostUserIds = new Set(hosts.map((h) => h.userId));

  const participants = confirmedRegistrations
    .filter((r) => r.user?.email && !hostUserIds.has(r.userId))
    .map((r) => ({
      to: r.user!.email!,
      playerName: getDisplayName(r.user!.firstName, r.user!.lastName, r.user!.email!),
    }));

  const hostRecipients = hosts
    .filter((h) => h.user?.email)
    .map((h) => ({
      to: h.user!.email!,
      playerName: getDisplayName(h.user!.firstName, h.user!.lastName, h.user!.email!),
    }));

  return { participants, hosts: hostRecipients };
}
