import { generateSlug } from "@/lib/slug";

/**
 * Génère un publicId lisible pour un utilisateur.
 * Format : {prénom-nom}-{nombre aléatoire 4 chiffres}
 * Exemple : jean-dupont-4821
 *
 * Si firstName/lastName sont vides, fallback sur user-{5 chiffres}.
 */
export function generatePublicId(
  firstName: string | null,
  lastName: string | null
): string {
  const random = Math.floor(1000 + Math.random() * 9000);

  const base = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (!base) {
    return `user-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  const slug = generateSlug(base);
  return `${slug}-${random}`;
}
