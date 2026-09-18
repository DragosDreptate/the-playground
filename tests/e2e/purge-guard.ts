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
 * ⚠️ Une première version cherchait le nom de la branche Neon éphémère
 * (`e2e-<run_id>`) dans `DATABASE_URL`. C'était doublement faux : l'URL exposée
 * par Neon ne porte que l'identifiant d'endpoint auto-généré
 * (`ep-shiny-surf-altm3fsn-pooler…`), donc le motif ne matchait JAMAIS et la
 * purge ne se serait jamais exécutée ; et comme le motif était cherché dans la
 * chaîne entière, un mot de passe contenant `-e2e-1` aurait suffi à autoriser
 * un TRUNCATE sur une base de développement. Le format de cette URL appartient
 * à Neon, pas à nous : on ne fonde plus aucune décision de sûreté dessus.
 *
 * Règle : fail-closed. Dans le doute, on refuse.
 */

/** Variable d'intention : sans elle, aucune purge, jamais. */
export const PURGE_ENV_FLAG = "E2E_ALLOW_PURGE";

export type PurgeContext = {
  /** `GITHUB_ACTIONS` — posée à "true" par le runner, absente partout ailleurs. */
  githubActions: string | undefined;
  /** Valeur brute de `E2E_ALLOW_PURGE`. */
  allowFlag: string | undefined;
  /** Valeur brute de `VERCEL_ENV`. */
  vercelEnv: string | undefined;
  databaseUrl: string | undefined;
};

export type PurgeDecision = {
  allowed: boolean;
  /** L'appelant a-t-il DEMANDÉ une purge ? Sert à échouer bruyamment si elle est refusée malgré tout. */
  intended: boolean;
  reason?: string;
};

function isIntended(allowFlag: string | undefined): boolean {
  if (typeof allowFlag !== "string") return false;
  const normalized = allowFlag.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

/**
 * Décide si la purge est permise. Quatre verrous indépendants, tous requis.
 *
 * Le verrou décisif est `GITHUB_ACTIONS` : la purge n'est possible QUE dans un
 * job GitHub Actions, où la base est une branche Neon éphémère détruite en fin
 * de run. Sur un poste de développement, la variable est absente, donc la base
 * de travail est hors d'atteinte — quelle que soit son URL.
 */
export function evaluatePurge(context: PurgeContext): PurgeDecision {
  const intended = isIntended(context.allowFlag);

  if (context.vercelEnv === "production") {
    return { allowed: false, intended, reason: "environnement de production" };
  }

  if (!intended) {
    return { allowed: false, intended, reason: `${PURGE_ENV_FLAG} absent ou différent de "1"` };
  }

  if (context.githubActions !== "true") {
    return {
      allowed: false,
      intended,
      reason: "hors GitHub Actions — la base visée n'est pas une branche éphémère",
    };
  }

  if (!context.databaseUrl || context.databaseUrl.trim() === "") {
    return { allowed: false, intended, reason: "DATABASE_URL absente" };
  }

  return { allowed: true, intended };
}

/** Lit l'environnement courant et renvoie la décision. */
export function evaluatePurgeFromEnv(env: NodeJS.ProcessEnv = process.env): PurgeDecision {
  return evaluatePurge({
    githubActions: env.GITHUB_ACTIONS,
    allowFlag: env[PURGE_ENV_FLAG],
    vercelEnv: env.VERCEL_ENV,
    databaseUrl: env.DATABASE_URL,
  });
}
