import type { UserAvatarInfo } from "@/domain/models/user";
import { getMomentGradient } from "@/lib/gradient";

/**
 * Construit le DTO d'avatar minimal (SANS email) à partir d'un enregistrement User.
 * Le dégradé de fallback est calculé ici, côté serveur, sur un identifiant stable
 * non-PII (`publicId ?? id`) : le client ne reçoit ni email, ni graine, juste la
 * chaîne CSS. `id` (clé primaire) garantit un dégradé distinct même sans `publicId`.
 * Source unique de la règle de graine — cf. SEC-10.
 */
export function toUserAvatarInfo(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  publicId?: string | null;
}): UserAvatarInfo {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
    gradient: getMomentGradient(user.publicId ?? user.id),
  };
}
