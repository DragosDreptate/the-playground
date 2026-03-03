import type { CircleCategory } from "@/domain/models/circle";

/**
 * Calcule la valeur de customCategory à passer lors de la CRÉATION d'un Circle.
 *
 * - category = "OTHER"  → retourne la valeur saisie (trimmée), ou null si vide
 * - category != "OTHER" → retourne undefined (champ exclu de la création Prisma)
 */
export function resolveCustomCategoryForCreate(
  category: CircleCategory | undefined,
  formValue: string | null | undefined
): string | null | undefined {
  if (category !== "OTHER") return undefined;
  return (formValue ?? "").trim() || null;
}

/**
 * Calcule la valeur de customCategory à passer lors de la MISE À JOUR d'un Circle.
 *
 * - newCategory = "OTHER"                 → retourne la valeur saisie (trimmée), ou null si vide
 * - existingCategory = "OTHER" et on change → retourne null (effacement en DB)
 * - ni l'un ni l'autre                   → retourne undefined (champ non touché)
 */
export function resolveCustomCategoryForUpdate(
  newCategory: CircleCategory | null | undefined,
  existingCategory: CircleCategory | null | undefined,
  formValue: string | null | undefined
): string | null | undefined {
  if (newCategory === "OTHER") {
    return (formValue ?? "").trim() || null;
  }
  if (existingCategory === "OTHER") {
    return null;
  }
  return undefined;
}
