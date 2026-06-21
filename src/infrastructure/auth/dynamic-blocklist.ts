/**
 * Surcouche dynamique de la blocklist anti-abus, stockée dans Vercel Edge
 * Config (clé `signInBlocklist`). Permet de bloquer un email / domaine jetable
 * / identité OAuth en quelques secondes via la CLI (`pnpm block ...`), SANS
 * rebuild ni déploiement.
 *
 * Combinée à la baseline statique du code (`sign-in-blocklist.ts` et
 * `disposable-domains.ts`), qui sert de filet : si Edge Config est absent
 * (local) ou indisponible, on retombe sur le statique — jamais de lock-out
 * global (fail-open).
 *
 * Pas de cache : le sign-in est peu fréquent et le read Edge Config est
 * négligeable ; on garde l'effet « instantané » d'un blocage.
 */
import { get } from "@vercel/edge-config";

import { isBlockedSignIn as isStaticBlockedSignIn } from "@/infrastructure/auth/sign-in-blocklist";
import { isDisposableEmailDomainWith } from "@/lib/email/disposable-domains";

/** Forme de la clé `signInBlocklist` dans Edge Config. */
export type DynamicBlocklist = {
  emails: string[];
  oauthIds: string[];
  domains: string[];
};

const EDGE_KEY = "signInBlocklist";
const EMPTY: DynamicBlocklist = { emails: [], oauthIds: [], domains: [] };

/**
 * Lit la surcouche dynamique. Fail-open : `EMPTY` si pas d'`EDGE_CONFIG`
 * (local) ou en cas d'erreur de lecture.
 */
async function readDynamic(): Promise<DynamicBlocklist> {
  if (!process.env.EDGE_CONFIG) return EMPTY;
  try {
    const value = await get<Partial<DynamicBlocklist>>(EDGE_KEY);
    if (!value || typeof value !== "object") return EMPTY;
    return {
      emails: Array.isArray(value.emails) ? value.emails : [],
      oauthIds: Array.isArray(value.oauthIds) ? value.oauthIds : [],
      domains: Array.isArray(value.domains) ? value.domains : [],
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Matching pur de l'identité (email + OAuth id) contre la surcouche dynamique.
 * Le matching domaine n'est PAS traité ici : il est délégué au suffix-walk
 * partagé de `disposable-domains.ts`. Testable sans IO.
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

/** Bloqué au sign-in : baseline statique OU surcouche dynamique. */
export async function isBlockedSignIn(
  email?: string | null,
  oauthId?: string | null
): Promise<boolean> {
  if (isStaticBlockedSignIn(email, oauthId)) return true;
  const dynamic = await readDynamic();
  return matchesIdentityBlocklist(dynamic, { email, oauthId });
}

/** Domaine jetable : baseline statique (builtin + custom) OU domaines dynamiques. */
export async function isDisposableEmailDomain(email: string): Promise<boolean> {
  const dynamic = await readDynamic();
  return isDisposableEmailDomainWith(email, dynamic.domains);
}
