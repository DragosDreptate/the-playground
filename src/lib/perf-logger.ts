/**
 * Mesure le temps d'exécution d'une opération async.
 * Log structuré JSON → visible dans Vercel Function Logs.
 *
 * Usage :
 *   const [a, b] = await measureTime("my-page:data", () => Promise.all([...]))
 *
 * @param label    Identifiant lisible : "page-name:phase" (ex: "moment-page:data")
 * @param fn       Fonction async à mesurer
 * @param thresholdMs  Seuil au-delà duquel on log un warn (défaut: 200ms)
 */
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>,
  thresholdMs = 200
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = Math.round(performance.now() - start);
    if (duration > thresholdMs) {
      console.warn(
        JSON.stringify({ level: "warn", type: "slow_render", label, duration })
      );
    } else {
      console.log(
        JSON.stringify({ level: "info", type: "render", label, duration })
      );
    }
  }
}
