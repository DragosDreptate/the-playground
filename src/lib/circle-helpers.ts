import type { CircleMemberWithUser } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";
import { MEMBER_AVATARS_MAX } from "@/lib/circle-constants";

const NAMES_TO_SHOW = 2;

type Translator = (key: string, values?: Record<string, number>) => string;

/**
 * Trie les organisateurs d'un Circle : HOST en premier, puis CO_HOST, chaque groupe
 * trié alphabétiquement par nom affiché (sensibilité accents ignorée).
 */
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

/**
 * Prépare les données d'aperçu "Membres" pour la colonne meta des pages Circle :
 * - avatars visibles (jusqu'à MEMBER_AVATARS_MAX, triés par joinedAt)
 * - texte desktop ("Alice, Bob et X autres")
 * - texte mobile ("et X autres" seul, ou les noms si pas d'autres)
 */
export function computeMembersMeta(
  hosts: CircleMemberWithUser[],
  players: CircleMemberWithUser[],
  totalCount: number,
  t: Translator,
): {
  visibleAvatars: CircleMemberWithUser[];
  metaText: string;
  metaMobileText: string;
} {
  const allMembers = [...hosts, ...players].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  const visibleAvatars = allMembers.slice(0, MEMBER_AVATARS_MAX);
  const namesToShow = allMembers
    .slice(0, NAMES_TO_SHOW)
    .map((m) => getDisplayName(m.user.firstName, m.user.lastName, m.user.email));
  const othersCount = Math.max(0, totalCount - namesToShow.length);
  const othersText = othersCount > 0 ? t("detail.andOthers", { count: othersCount }) : "";
  const metaText = othersText
    ? `${namesToShow.join(", ")} ${othersText}`
    : namesToShow.join(", ");
  const metaMobileText = othersText || namesToShow.join(", ");
  return { visibleAvatars, metaText, metaMobileText };
}
