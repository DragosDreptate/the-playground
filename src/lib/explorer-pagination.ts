/**
 * Tailles de page de l'Explorer — source unique partagée entre le rendu initial
 * (`explorer/page.tsx`) et le chargement progressif (`actions/explorer.ts`), pour
 * que la frontière over-fetch/offset reste cohérente (sinon doublons/trous au
 * « charger plus »).
 */

// Communautés : grille jusqu'à 4 colonnes (sm:2 / md:3 / lg:4). 12 = lignes
// complètes à chaque palier (multiple de 2, 3 et 4), jamais de ligne tronquée.
export const CIRCLES_PAGE_SIZE = 12;
export const CIRCLES_FETCH_SIZE = CIRCLES_PAGE_SIZE + 1;

// Événements : liste verticale à une colonne, pas de contrainte de grille.
export const MOMENTS_PAGE_SIZE = 10;
export const MOMENTS_FETCH_SIZE = MOMENTS_PAGE_SIZE + 1;
