const GRADIENTS = [
  "linear-gradient(135deg, #7c3aed, #4f46e5)",  // violet → indigo
  "linear-gradient(135deg, #06b6d4, #2563eb)",  // cyan → blue
  "linear-gradient(135deg, #f43f5e, #a21caf)",  // rose → fuchsia
  "linear-gradient(135deg, #10b981, #0891b2)",  // emerald → cyan
  "linear-gradient(135deg, #d946ef, #7c3aed)",  // fuchsia → violet
  "linear-gradient(135deg, #f59e0b, #e11d48)",  // amber → rose
  "linear-gradient(135deg, #14b8a6, #4f46e5)",  // teal → indigo
  "linear-gradient(135deg, #6366f1, #0284c7)",  // indigo → cyan
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getMomentGradient(seed: string): string {
  if (!seed) return GRADIENTS[0];
  return GRADIENTS[hashString(seed) % GRADIENTS.length];
}
