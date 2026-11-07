/**
 * Tarif Stripe d'une carte européenne standard, prélevé à l'Organisateur.
 * Les cartes premium ou hors d'Europe coûtent plus cher : le net affiché reste une estimation.
 */
const PERCENT_FEE = 0.015;
const FIXED_FEE_CENTS = 25;

export function estimateNetAfterStripeFees(cents: number): number {
  return Math.max(0, cents - Math.round(cents * PERCENT_FEE + FIXED_FEE_CENTS));
}
