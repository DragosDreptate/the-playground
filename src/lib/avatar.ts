import type { UserAvatarInfo } from "@/domain/models/user";
import { getMomentGradient } from "@/lib/gradient";

/**
 * Graine du dégradé d'avatar : `user.id`. **Source unique**, utilisée partout
 * (piles d'avatars, DTO minimal, `UserAvatar`), pour qu'un même utilisateur ait
 * TOUJOURS la même couleur, quelle que soit la surface. `id` (clé primaire) est
 * le seul identifiant présent dans tous les contextes — y compris la session, qui
 * ne porte pas `publicId` — et il est non-PII (opaque). Cf. SEC-10.
 */
export function avatarGradientSeed(user: { id: string }): string {
  return getMomentGradient(user.id);
}

/**
 * Construit le DTO d'avatar minimal (SANS email) à partir d'un enregistrement User.
 * Le dégradé de fallback est calculé ici, côté serveur : le client ne reçoit ni
 * email, ni graine, juste la chaîne CSS.
 */
export function toUserAvatarInfo(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}): UserAvatarInfo {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
    gradient: avatarGradientSeed(user),
  };
}
