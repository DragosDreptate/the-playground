import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { notifySlackQuotaWarning } from "@/infrastructure/services/slack/slack-notification-service";
import {
  readQuotaAlertState,
  writeQuotaAlertState,
} from "@/infrastructure/services/edge-config/resend-quota-state";
import { countSentToday, quotaTier, shouldNotifyQuota } from "@/lib/resend-quota";

/**
 * GET /api/cron/check-resend-quota
 *
 * Surveille le quota d'envoi quotidien Resend (plan gratuit : 100 emails/jour)
 * et alerte sur Slack dès qu'un palier (70, 90 puis 100) est franchi.
 *
 * Lecture du compteur : on COMPTE les emails du jour via `GET /emails`, pas via
 * le header `x-resend-daily-quota` (qui n'est renvoyé que sur l'envoi, jamais en
 * lecture). Le plafond gratuit étant de 100/jour et la liste triée du plus récent
 * au plus ancien, une seule page de 100 contient toujours tous les envois du jour.
 * Avantage : couvre TOUS les chemins d'envoi (magic links, transactionnel, batch).
 *
 * Dédup via Edge Config : on persiste le dernier palier notifié du jour
 * (`resendQuotaAlert`) et on ne re-notifie qu'au FRANCHISSEMENT d'un palier
 * supérieur (cf. `shouldNotifyQuota`). Reset implicite à minuit UTC par
 * comparaison de date. Le nombre envoyé dans l'alerte est le compteur réel.
 *
 * Vercel Cron invoque en GET ; on expose aussi POST pour un déclenchement manuel.
 * Protection : header Authorization: Bearer CRON_SECRET (ajouté par Vercel).
 */

const RESEND_EMAILS_URL = "https://api.resend.com/emails?limit=100";

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] check-resend-quota: unauthorized request",
      "warning"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    // Pas de clé (local / CI) — rien à surveiller, on sort proprement.
    return NextResponse.json({ ok: true, skipped: "no_api_key" });
  }

  let res: Response;
  try {
    res = await fetch(RESEND_EMAILS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ ok: false, error: "fetch_failed" });
  }

  if (!res.ok) {
    Sentry.captureMessage(
      `[cron] check-resend-quota: Resend API ${res.status}`,
      "warning"
    );
    return NextResponse.json({ ok: false, status: res.status });
  }

  let body: { data?: { created_at: string }[]; has_more?: boolean };
  try {
    body = (await res.json()) as {
      data?: { created_at: string }[];
      has_more?: boolean;
    };
  } catch (error) {
    // Réponse 2xx mais corps non-JSON (proxy/erreur amont) — on ne casse pas le cron.
    Sentry.captureException(error);
    return NextResponse.json({ ok: false, error: "invalid_json" });
  }
  const emails = body.data ?? [];
  const todayUtc = new Date().toISOString().slice(0, 10);
  const used = countSentToday(emails, todayUtc);

  // Garde-fou : page pleine ET tous ses éléments datés d'aujourd'hui => plus de
  // 100 envois/jour (impossible en plan gratuit, Resend bloque à 100). On le
  // signale sans bloquer — le comptage pourrait être tronqué.
  if (body.has_more && emails.length > 0 && used === emails.length) {
    Sentry.captureMessage(
      `[cron] check-resend-quota: page pleine, comptage possiblement tronqué (used=${used})`,
      "warning"
    );
  }

  const tier = quotaTier(used);
  let notified = false;
  if (tier) {
    const state = await readQuotaAlertState();
    if (shouldNotifyQuota(tier, todayUtc, state)) {
      // On ne persiste le palier que si l'alerte a été RÉELLEMENT délivrée :
      // sinon (timeout / non-2xx / webhook absent) on laisse l'état intact pour
      // re-tenter au prochain passage, plutôt que de figer un palier comme
      // notifié et perdre définitivement l'alerte du jour (surtout le 100 =
      // envois bloqués).
      notified = await notifySlackQuotaWarning(used, tier);
      if (notified) {
        // Échec d'écriture => fail-open : on re-notifiera l'heure suivante (mieux
        // qu'une alerte perdue), mais on le signale pour ne pas spammer en silence.
        if ((await writeQuotaAlertState({ date: todayUtc, tier })) === "failed") {
          Sentry.captureMessage(
            `[cron] check-resend-quota: échec persistance état dédup (tier=${tier})`,
            "warning"
          );
        }
      }
    }
  }

  console.log(
    `[check-resend-quota] used=${used}, tier=${tier ?? "none"}, notified=${notified}`
  );
  return NextResponse.json({ ok: true, used, tier, notified });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
