import type { QuotaAlertState } from "@/lib/resend-quota";
import {
  getEdgeConfigItem,
  upsertEdgeConfigItem,
  type EdgeConfigWriteResult,
} from "./edge-config-client";

/**
 * État du dernier palier de quota Resend notifié, persisté dans Edge Config pour
 * dédupliquer les alertes : on ne notifie qu'au franchissement d'un nouveau
 * palier (cf. `shouldNotifyQuota`). Reset implicite par comparaison de date UTC.
 */
const RESEND_QUOTA_ALERT_KEY = "resendQuotaAlert";

export function readQuotaAlertState(): Promise<QuotaAlertState | undefined> {
  return getEdgeConfigItem<QuotaAlertState>(RESEND_QUOTA_ALERT_KEY);
}

export function writeQuotaAlertState(
  state: QuotaAlertState
): Promise<EdgeConfigWriteResult> {
  return upsertEdgeConfigItem(RESEND_QUOTA_ALERT_KEY, state);
}
