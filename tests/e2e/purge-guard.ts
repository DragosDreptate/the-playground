/**
 * Garde-fou de la purge E2E.
 *
 * La suite E2E vide la base avant de la seeder, pour ne dépendre d'aucune donnée
 * préexistante. C'est la SEULE opération de ce projet capable de détruire du
 * travail : en local, `pnpm test:e2e` pointe sur la base de développement.
 *
 * Ce module décide, et lui seul, si une purge est permise. Il est PUR (aucun
 * accès réseau ni base) pour être testable exhaustivement.
 *
 * Règle : fail-closed. Dans le doute, on refuse.
 */

/** Variable d'intention : sans elle, aucune purge, jamais. */
export const PURGE_ENV_FLAG = "E2E_ALLOW_PURGE";

/**
 * Nom des branches Neon éphémères créées par la CI
 * (`e2e-${github.run_id}-${github.run_attempt}`, cf. `.github/workflows/ci.yml`).
 */
const EPHEMERAL_BRANCH_PATTERN = /(^|[^a-z0-9])e2e-\d+/i;

export type PurgeContext = {
  databaseUrl: string | undefined;
  /** Valeur brute de `E2E_ALLOW_PURGE`. */
  allowFlag: string | undefined;
  /** Valeur brute de `VERCEL_ENV`. */
  vercelEnv: string | undefined;
};

export type PurgeDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Décide si la purge est permise. Trois verrous indépendants, tous requis.
 *
 * Le verrou décisif est le troisième : l'URL doit désigner une branche
 * éphémère `e2e-<run_id>`. Une base de développement, de staging ou de
 * production n'en porte jamais le nom, donc elle ne peut pas être purgée même
 * si les deux autres verrous étaient levés par erreur.
 */
export function evaluatePurge(context: PurgeContext): PurgeDecision {
  if (context.vercelEnv === "production") {
    return { allowed: false, reason: "environnement de production" };
  }

  if (context.allowFlag !== "1" && context.allowFlag?.toLowerCase() !== "true") {
    return { allowed: false, reason: `${PURGE_ENV_FLAG} absent ou différent de "1"` };
  }

  const url = context.databaseUrl;
  if (!url || url.trim() === "") {
    return { allowed: false, reason: "DATABASE_URL absente" };
  }

  if (!EPHEMERAL_BRANCH_PATTERN.test(url)) {
    return {
      allowed: false,
      reason: "la base ciblée n'est pas une branche éphémère e2e-<run_id>",
    };
  }

  return { allowed: true };
}

/** Lit l'environnement courant et renvoie la décision. */
export function evaluatePurgeFromEnv(env: NodeJS.ProcessEnv = process.env): PurgeDecision {
  return evaluatePurge({
    databaseUrl: env.DATABASE_URL,
    allowFlag: env[PURGE_ENV_FLAG],
    vercelEnv: env.VERCEL_ENV,
  });
}
