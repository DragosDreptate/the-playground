/**
 * Surcouche dynamique de la blocklist anti-abus, stockée dans Vercel Edge
 * Config (clé `signInBlocklist`). Permet de bloquer un email / domaine /
 * identité OAuth en quelques secondes via la CLI (`pnpm block ...`), SANS
 * rebuild ni déploiement.
 *
 * Combinée à la baseline statique du code (`sign-in-blocklist.ts` et la liste
 * de ~120k domaines jetables), qui sert de filet : si Edge Config est absent
 * (local), indisponible ou lent, on retombe sur le statique — jamais de
 * lock-out global (fail-open).
 *
 * Périmètre des entrées dynamiques (toutes appliquées à TOUS les providers,
 * magic link ET OAuth, via `isBlockedSignIn`) :
 *  - `emails`   : adresses exactes
 *  - `oauthIds` : `providerAccountId`
 *  - `domains`  : domaines (suffix-walk, couvre les sous-domaines)
 *
 * La heuristique des ~120k domaines jetables statiques reste, elle, gated au
 * magic link (`isDisposableEmailDomain`, sync) — choix délibéré : on ne refuse
 * pas un email OAuth vérifié sous prétexte qu'il vient d'un domaine jetable.
 *
 * Pas de cache : le sign-in est peu fréquent et le read Edge Config est
 * négligeable ; on garde l'effet « instantané » d'un blocage.
 */
import { get } from "@vercel/edge-config";

import { isBlockedSignIn as isStaticBlockedSignIn } from "@/infrastructure/auth/sign-in-blocklist";
import { matchesDomainSuffix } from "@/lib/email/disposable-domains";

/** Forme de la clé `signInBlocklist` dans Edge Config. */
export type DynamicBlocklist = {
  emails: string[];
  oauthIds: string[];
  domains: string[];
};

/** Nom de la clé Edge Config (partagé avec la CLI d'édition). */
export const SIGN_IN_BLOCKLIST_KEY = "signInBlocklist";

/** Délai au-delà duquel la lecture Edge Config est abandonnée (fail-open). */
const READ_TIMEOUT_MS = 800;

const EMPTY: DynamicBlocklist = { emails: [], oauthIds: [], domains: [] };

/**
 * Coerce une valeur Edge Config arbitraire (potentiellement éditée à la main /
 * corrompue) en `DynamicBlocklist` sûre : chaque champ devient un tableau de
 * strings, les éléments non-string sont filtrés. Garantit qu'aucun `null`/objet
 * ne se propage jusqu'au matcher (sinon `e.trim()` planterait le sign-in).
 */
export function coerceBlocklist(value: unknown): DynamicBlocklist {
  const obj =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const toStringArray = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((e): e is string => typeof e === "string") : [];
  return {
    emails: toStringArray(obj.emails),
    oauthIds: toStringArray(obj.oauthIds),
    domains: toStringArray(obj.domains),
  };
}

/** `get()` borné par un timeout : un hang Edge Config ne doit pas bloquer l'auth. */
async function getWithTimeout(): Promise<unknown> {
  return Promise.race([
    get(SIGN_IN_BLOCKLIST_KEY),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("edge-config-timeout")), READ_TIMEOUT_MS)
    ),
  ]);
}

/**
 * Lit la surcouche dynamique. Fail-open : `EMPTY` si pas d'`EDGE_CONFIG`
 * (local), en cas d'erreur, ou si la lecture dépasse le timeout.
 */
async function readDynamic(): Promise<DynamicBlocklist> {
  if (!process.env.EDGE_CONFIG) return EMPTY;
  try {
    return coerceBlocklist(await getWithTimeout());
  } catch {
    return EMPTY;
  }
}

/**
 * Matching pur de l'identité (email + OAuth id) contre la surcouche dynamique.
 * Le matching domaine n'est PAS traité ici (délégué à `matchesDomainSuffix`).
 * Testable sans IO.
 */
export function matchesIdentityBlocklist(
  data: DynamicBlocklist,
  identity: { email?: string | null; oauthId?: string | null }
): boolean {
  const email = identity.email?.trim().toLowerCase();
  if (email && data.emails.some((e) => e.trim().toLowerCase() === email)) {
    return true;
  }
  if (identity.oauthId && data.oauthIds.includes(identity.oauthId)) {
    return true;
  }
  return false;
}

/**
 * Bloqué au sign-in (tous providers) : baseline statique OU surcouche dynamique
 * (email, providerAccountId, ou domaine via suffix-walk).
 */
export async function isBlockedSignIn(
  email?: string | null,
  oauthId?: string | null
): Promise<boolean> {
  if (isStaticBlockedSignIn(email, oauthId)) return true;
  const dynamic = await readDynamic();
  if (matchesIdentityBlocklist(dynamic, { email, oauthId })) return true;
  if (email && matchesDomainSuffix(email, dynamic.domains)) return true;
  return false;
}
