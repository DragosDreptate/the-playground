"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { isAdminUser } from "@/lib/admin-host-mode";
import { getAppUrl } from "@/lib/app-url";
import { auditUser } from "@/infrastructure/services/audit/audit-user";
import {
  addToBlocklist,
  revokeSessionsForTargets,
  type BlockResult,
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
 * Ajoute des entrées à la blocklist anti-abus (action humaine explicite,
 * déclenchée depuis l'audit). Admin-only.
 */
export async function blockSignInAction(
  targets: BlockTargets
): Promise<{ status: BlockResult | "unauthorized" }> {
  const session = await auth();
  if (!isAdminUser(session)) return { status: "unauthorized" };

  const status = await addToBlocklist(targets);

  // Le blocage seul empêche de se reconnecter mais ne tue pas une session déjà
  // ouverte. On révoque donc les sessions actives quand le blocage a bien eu
  // lieu (prod uniquement). Best-effort : un échec de révocation ne doit pas
  // faire échouer le blocage déjà appliqué.
  if (status === "blocked") {
    try {
      await revokeSessionsForTargets(targets);
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  return { status };
}
