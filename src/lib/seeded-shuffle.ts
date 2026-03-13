/**
 * Mélange un tableau de façon déterministe selon un seed string.
 * Utilise Fisher-Yates avec un LCG (Linear Congruential Generator) initialisé
 * depuis un hash simple du seed. Même seed → même ordre, garanti.
 */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];

  // Hash simple du seed (polynomial rolling hash)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }

  // LCG — paramètres de Numerical Recipes
  let state = hash;
  const rand = () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0x100000000;
  };

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
