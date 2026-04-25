// Unsplash limite `per_page` (search) et `count` (random) à 30 — clamp commun
// pour éviter les 422 Unprocessable Entity en cas de paramètre client invalide.
const UNSPLASH_MAX_PER_PAGE = 30;

export function parsePerPage(raw: string | null, fallback: number): number {
  const parsed = parseInt(raw ?? String(fallback), 10);
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(UNSPLASH_MAX_PER_PAGE, Math.max(1, value));
}
