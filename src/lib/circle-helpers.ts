import type { CircleMemberWithUser } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";
import { computeAvatarStackMeta } from "@/lib/avatar-stack-meta";

type Translator = (key: string, values?: Record<string, number | string>) => string;

// HOST puis CO_HOST, alphabétique sur le nom (insensible aux accents).
// `getDisplayName` sert de clé de tri uniquement (jamais rendue) : le
// fallback email reste interne à la fonction.
export function sortCircleOrganizers(
  organizers: CircleMemberWithUser[],
): CircleMemberWithUser[] {
  const byName = (a: CircleMemberWithUser, b: CircleMemberWithUser) => {
    const nameA = getDisplayName(a.user.firstName, a.user.lastName, a.user.email);
    const nameB = getDisplayName(b.user.firstName, b.user.lastName, b.user.email);
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  };
  return [
    ...organizers.filter((h) => h.role === "HOST").sort(byName),
    ...organizers.filter((h) => h.role === "CO_HOST").sort(byName),
  ];
}

// Bloc "Membres" des pages Communauté : merge hosts+players, trie par
// `joinedAt` ascendant, délègue le rendu de la stack.
export function computeMembersMeta(
  hosts: CircleMemberWithUser[],
  players: CircleMemberWithUser[],
  totalCount: number,
  t: Translator,
  anonymousFallback: string,
): {
  visibleAvatars: CircleMemberWithUser[];
  metaText: string;
  metaMobileText: string;
} {
  const allMembers = [...hosts, ...players].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  return computeAvatarStackMeta(allMembers, totalCount, t, { anonymousFallback });
}
