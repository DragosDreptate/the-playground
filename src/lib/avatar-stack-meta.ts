import { getPublicDisplayName } from "@/lib/display-name";

export const AVATAR_STACK_MAX = 5;
export const AVATAR_STACK_NAMES_TO_SHOW = 2;

type WithDisplayUser = {
  user: {
    firstName: string | null;
    lastName: string | null;
  };
};

type Translator = (key: string, values?: Record<string, number | string>) => string;

type Options = {
  avatarsMax?: number;
  namesToShow?: number;
  /** Étiquette pour un user sans nom (typiquement `t("Common.anonymousFallback")`). */
  anonymousFallback: string;
};

// Le compteur "et X autres" diffère selon le contexte d'affichage :
//   desktop affiche les noms → compteur = total − noms
//   mobile n'affiche que les avatars → compteur = total − avatars visibles
// Avant cette distinction, un mobile à 5 avatars affichait "et 4 autres" pour
// 6 inscrits (calcul desktop appliqué au mobile), donnant l'illusion de 9.
// `items` doit être pré-trié par le caller — la fonction se contente de slicer.
export function computeAvatarStackMeta<T extends WithDisplayUser>(
  items: T[],
  totalCount: number,
  t: Translator,
  options: Options,
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
    .map((item) =>
      getPublicDisplayName(
        item.user.firstName,
        item.user.lastName,
        options.anonymousFallback,
      ),
    );

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
