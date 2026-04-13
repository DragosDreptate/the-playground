/**
 * Detects touch-first devices (phones, tablets) at call time.
 * `(pointer: coarse)` matches fingers vs. `fine` for mouse/trackpad.
 * Returns false during SSR — safe to call only in event handlers.
 */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
