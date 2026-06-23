"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { isAdminUser } from "@/lib/admin-host-mode";
import { getAppUrl } from "@/lib/app-url";
import { auditUser } from "@/infrastructure/services/audit/audit-user";
import {
  addToBlocklist,
  removeFromBlocklist,
  revokeSessionsForTargets,
  type BlocklistWriteResult,
  type BlockTargets,
} from "@/infrastructure/services/audit/blocklist-admin";
import { notifySlackAuditReport } from "@/infrastructure/services/slack/slack-notification-service";
import type {
  AuditReport,
  AuditTargets,
} from "@/infrastructure/services/audit/types";

export type AuditUserResult =
  | { ok: true; report: AuditReport; targets: AuditTargets }
  | { ok: false; error: "UNAUTHORIZED" | "FAILED" };

/**
 * Audit de compte à la demande (mode bouton admin). Admin-only, lecture seule :
 * collecte le dossier, le fait juger par Claude, renvoie le rapport + les cibles
 * de blocage, et le pousse sur #admin. Le blocage reste une action SÉPARÉE
 * (blockSignInAction).
 */
export async function auditUserAction(
  userId: string,
  email: string
): Promise<AuditUserResult> {
  const session = await auth();
  if (!isAdminUser(session)) return { ok: false, error: "UNAUTHORIZED" };

  try {
    const { report, targets } = await auditUser(userId);
    await notifySlackAuditReport({
      report,
      email,
      adminUrl: `${getAppUrl()}/admin/users/${userId}`,
    });
    return { ok: true, report, targets };
  } catch {
    return { ok: false, error: "FAILED" };
  }
}

/**
 * Résultat d'un blocage : le statut d'écriture blocklist + le sort des sessions
 * actives. `sessionsRevoked` = nombre coupé, `"failed"` si la coupure a échoué
 * (le compte est bloqué mais une session reste ouverte → l'admin DOIT le savoir),
 * `null` quand non applicable (blocage non écrit).
 */
export type BlockActionResult = {
  status: BlocklistWriteResult | "unauthorized";
  sessionsRevoked: number | "failed" | null;
};

/**
 * Ajoute des entrées à la blocklist anti-abus (action humaine explicite,
 * déclenchée depuis l'audit). Admin-only.
 */
export async function blockSignInAction(
  targets: BlockTargets
): Promise<BlockActionResult> {
  const session = await auth();
  if (!isAdminUser(session))
    return { status: "unauthorized", sessionsRevoked: null };

  const status = await addToBlocklist(targets);
  if (status !== "applied") return { status, sessionsRevoked: null };

  // Le blocage seul empêche de se reconnecter mais ne tue pas une session déjà
  // ouverte. On révoque donc les sessions actives. Un échec NE DOIT PAS être
  // avalé en silence (sinon faux « bloqué » avec session encore active) : on le
  // remonte à l'UI et on s'assure que Sentry reçoit bien l'erreur (flush, sinon
  // perdue en serverless).
  try {
    const sessionsRevoked = await revokeSessionsForTargets(targets);
    return { status, sessionsRevoked };
  } catch (error) {
    Sentry.captureException(error);
    // flush pour ne pas perdre l'event en serverless, mais il ne doit JAMAIS
    // faire échouer l'action (sinon l'UI n'afficherait pas l'avertissement
    // « bloqué mais session non coupée » — l'inverse du but recherché).
    await Sentry.flush(2000).catch(() => {});
    return { status, sessionsRevoked: "failed" };
  }
}

/**
 * Retire des entrées de la blocklist (action inverse du blocage). Admin-only.
 * Ne touche pas aux sessions : débloquer ne reconnecte personne, ça réautorise
 * juste les futurs sign-in.
 */
export async function unblockSignInAction(
  targets: BlockTargets
): Promise<{ status: BlocklistWriteResult | "unauthorized" }> {
  const session = await auth();
  if (!isAdminUser(session)) return { status: "unauthorized" };
  return { status: await removeFromBlocklist(targets) };
}
