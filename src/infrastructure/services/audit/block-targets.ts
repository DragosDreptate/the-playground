import { prisma } from "@/infrastructure/db/prisma";
import { extractDomain } from "@/lib/email/disposable-domains";
import {
  checkBlockedSignIn,
  type BlockMatch,
} from "@/infrastructure/auth/dynamic-blocklist";
import type { AuditTargets } from "./types";

/** Aucune cible (compte introuvable). */
export const NO_TARGETS: AuditTargets = {
  email: null,
  domain: null,
  oauthIds: [],
  blockReason: null,
};

/**
 * Mapping pur vers les cibles de blocage. Source UNIQUE partagée par l'audit LLM
 * (`targetsFromDossier`) et la fiche admin (`buildBlockTargets`), pour que les
 * deux proposent exactement les mêmes cibles.
 */
export function toAuditTargets(input: {
  email: string;
  oauthIds: string[];
  emailDomain: string; // brut, peut valoir "unknown"
  blockReason: BlockMatch | null;
}): AuditTargets {
  return {
    email: input.email,
    // null si pas de vrai domaine ("unknown" ne doit pas devenir une cible).
    domain:
      input.emailDomain && input.emailDomain !== "unknown"
        ? input.emailDomain
        : null,
    oauthIds: input.oauthIds,
    blockReason: input.blockReason,
  };
}

/**
 * Cibles de blocage d'un compte, calculées SANS audit LLM : permet d'afficher
 * les boutons de blocage en permanence sur la fiche admin (et pas seulement
 * après un audit). DB (email + oauthIds) + lecture blocklist, aucune dépendance
 * PostHog. Renvoie {@link NO_TARGETS} si le compte est introuvable.
 */
export async function buildBlockTargets(userId: string): Promise<AuditTargets> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, accounts: { select: { providerAccountId: true } } },
  });
  if (!user) return NO_TARGETS;

  const oauthIds = user.accounts.map((a) => a.providerAccountId);
  // checkBlockedSignIn vérifie statique + email + oauthId + domaine ; on passe le
  // 1er oauthId (cohérent avec le dossier d'audit). Le blocage cible tous les oauthIds.
  const blockReason = await checkBlockedSignIn(user.email, oauthIds[0]);

  return toAuditTargets({
    email: user.email,
    oauthIds,
    emailDomain: extractDomain(user.email) ?? "unknown",
    blockReason,
  });
}
