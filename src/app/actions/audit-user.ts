"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import { isAdminUser } from "@/lib/admin-host-mode";
import { getAppUrl } from "@/lib/app-url";
import { auditUser } from "@/infrastructure/services/audit/audit-user";
import { notifySlackAuditReport } from "@/infrastructure/services/slack/slack-notification-service";
import type { AuditReport } from "@/infrastructure/services/audit/types";

export type AuditUserResult =
  | { ok: true; report: AuditReport }
  | { ok: false; error: "UNAUTHORIZED" | "FAILED" };

/**
 * Audit de compte à la demande (mode bouton admin). Admin-only, lecture seule :
 * collecte le dossier, le fait juger par Claude, renvoie le rapport et le pousse
 * sur #admin (lecture mobile). Le blocage reste une action séparée et explicite.
 */
export async function auditUserAction(
  userId: string,
  email: string
): Promise<AuditUserResult> {
  const session = await auth();
  if (!isAdminUser(session)) return { ok: false, error: "UNAUTHORIZED" };

  try {
    const report = await auditUser(userId);
    // Push #admin best-effort (sendSlack catch en interne + guard non-prod).
    await notifySlackAuditReport({
      report,
      email,
      adminUrl: `${getAppUrl()}/admin/users/${userId}`,
    });
    return { ok: true, report };
  } catch {
    return { ok: false, error: "FAILED" };
  }
}
