import { getDisplayName } from "@/lib/display-name";

export const AVATAR_STACK_MAX = 5;
export const AVATAR_STACK_NAMES_TO_SHOW = 2;

type WithDisplayUser = {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

type Translator = (key: string, values?: Record<string, number | string>) => string;

type Options = {
  avatarsMax?: number;
  namesToShow?: number;
};

/**
 * Aperçu "stack d'avatars + et X autres" partagé entre la page Communauté
 * et la page événement.
 *
 * Le compteur "et X autres" est calculé par rapport à ce qui est *visible*
 * dans chaque contexte d'affichage, pour éviter une lecture fausse :
 * - desktop affiche les noms → compteur = total − noms affichés
 * - mobile n'affiche que les avatars → compteur = total − avatars visibles
 *
 * Sans cette distinction, un mobile à 5 avatars affichait "et 4 autres" pour
 * 6 inscrits (calcul desktop appliqué au mobile), donnant l'illusion de 9.
 *
 * Les `items` doivent être déjà triés par le caller dans l'ordre voulu —
 * la fonction se contente de slicer.
 */
export function computeAvatarStackMeta<T extends WithDisplayUser>(
  items: T[],
  totalCount: number,
  t: Translator,
  options: Options = {},
): {
  visibleAvatars: T[];
  metaText: string;
  metaMobileText: string;
} {
  const avatarsMax = options.avatarsMax ?? AVATAR_STACK_MAX;
  const namesToShow = options.namesToShow ?? AVATAR_STACK_NAMES_TO_SHOW;

  const visibleAvatars = items.slice(0, avatarsMax);
  const names = items
    .slice(0, namesToShow)
    .map((item) => getDisplayName(item.user.firstName, item.user.lastName, item.user.email));

  const desktopOthersCount = Math.max(0, totalCount - names.length);
  const desktopOthersText = desktopOthersCount > 0
    ? t("detail.andOthers", { count: desktopOthersCount })
    : "";
  const metaText = desktopOthersText
    ? `${names.join(", ")} ${desktopOthersText}`
    : names.join(", ");

  const mobileOthersCount = Math.max(0, totalCount - visibleAvatars.length);
  const metaMobileText = mobileOthersCount > 0
    ? t("detail.andOthers", { count: mobileOthersCount })
    : "";

  return { visibleAvatars, metaText, metaMobileText };
}
