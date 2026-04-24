import type { CircleMemberWithUser } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";
import { MEMBER_AVATARS_MAX } from "@/lib/circle-constants";

const NAMES_TO_SHOW = 2;

type Translator = (key: string, values?: Record<string, number>) => string;

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
