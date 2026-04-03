import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/app-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  const appUrl = getAppUrl();
  return {
    title: t("privacy.title"),
    description: t("privacy.metaDescription"),
    alternates: {
      canonical: `${appUrl}/legal/confidentialite`,
      languages: {
        fr: `${appUrl}/legal/confidentialite`,
        en: `${appUrl}/en/legal/confidentialite`,
      },
    },
  };
}

const SUBPROCESSORS = [
  "vercel",
  "neon",
  "posthog",
  "sentry",
  "resend",
  "stripe",
  "anthropic",
  "slack",
] as const;

const PURPOSE_ROWS = [
  "auth",
  "service",
  "email",
  "notifications",
  "payment",
  "analytics",
  "bugs",
] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("Legal");

  return (
    <>
      <p className="text-muted-foreground not-prose text-sm">
        {t("lastUpdated", { date: "01/04/2026" })}
      </p>
      <h1>{t("privacy.title")}</h1>
      <p>{t("privacy.intro")}</p>

      {/* 2. Responsable du traitement */}
      <h2>{t("privacy.controller.title")}</h2>
      <p>{t("privacy.controller.content")}</p>
      <p>{t("privacy.controller.contact")}</p>
      <ul>
        <li>{t("privacy.controller.contactEmail")}</li>
        <li>{t("privacy.controller.contactMail")}</li>
      </ul>
      <p>{t("privacy.controller.dpo")}</p>

      {/* 3. Données collectées */}
      <h2>{t("privacy.dataCollected.title")}</h2>

      <h3>{t("privacy.dataCollected.identity.title")}</h3>
      <ul>
        <li>{t("privacy.dataCollected.identity.email")}</li>
        <li>{t("privacy.dataCollected.identity.name")}</li>
        <li>{t("privacy.dataCollected.identity.photo")}</li>
        <li>{t("privacy.dataCollected.identity.publicId")}</li>
      </ul>

      <h3>{t("privacy.dataCollected.auth.title")}</h3>
      <ul>
        <li>{t("privacy.dataCollected.auth.oauth")}</li>
        <li>{t("privacy.dataCollected.auth.session")}</li>
      </ul>

      <h3>{t("privacy.dataCollected.usage.title")}</h3>
      <ul>
        <li>{t("privacy.dataCollected.usage.circles")}</li>
        <li>{t("privacy.dataCollected.usage.moments")}</li>
        <li>{t("privacy.dataCollected.usage.comments")}</li>
        <li>{t("privacy.dataCollected.usage.prefs")}</li>
      </ul>

      <h3>{t("privacy.dataCollected.payment.title")}</h3>
      <ul>
        <li>{t("privacy.dataCollected.payment.stripe")}</li>
        <li>{t("privacy.dataCollected.payment.ref")}</li>
      </ul>

      <h3>{t("privacy.dataCollected.analytics.title")}</h3>
      <ul>
        <li>{t("privacy.dataCollected.analytics.pages")}</li>
        <li>{t("privacy.dataCollected.analytics.identifier")}</li>
        <li>{t("privacy.dataCollected.analytics.technical")}</li>
      </ul>

      <h3>{t("privacy.dataCollected.errors.title")}</h3>
      <ul>
        <li>{t("privacy.dataCollected.errors.traces")}</li>
      </ul>

      {/* 4. Finalités et bases légales */}
      <h2>{t("privacy.purpose.title")}</h2>
      <table>
        <thead>
          <tr>
            <th>{t("privacy.purpose.headers.purpose")}</th>
            <th>{t("privacy.purpose.headers.data")}</th>
            <th>{t("privacy.purpose.headers.legal")}</th>
          </tr>
        </thead>
        <tbody>
          {PURPOSE_ROWS.map((row) => (
            <tr key={row}>
              <td>{t(`privacy.purpose.items.${row}`)}</td>
              <td>{t(`privacy.purpose.items.${row}Data`)}</td>
              <td>{t(`privacy.purpose.items.${row}Legal`)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. Cookies */}
      <h2>{t("privacy.cookies.title")}</h2>

      <h3>{t("privacy.cookies.necessary.title")}</h3>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>{t("privacy.purpose.headers.purpose")}</th>
            <th>{t("privacy.retention.title")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>authjs.session-token</code></td>
            <td>{t("privacy.cookies.necessary.session")}</td>
            <td>{t("privacy.cookies.necessary.sessionDuration")}</td>
          </tr>
          <tr>
            <td><code>auth-callback-url</code></td>
            <td>{t("privacy.cookies.necessary.callback")}</td>
            <td>{t("privacy.cookies.necessary.callbackDuration")}</td>
          </tr>
        </tbody>
      </table>
      <p>{t("privacy.cookies.necessary.note")}</p>

      <h3>{t("privacy.cookies.analytics.title")}</h3>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>{t("privacy.purpose.headers.purpose")}</th>
            <th>{t("privacy.subprocessors.headers.name")}</th>
            <th>{t("privacy.retention.title")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ph_*</code></td>
            <td>{t("privacy.cookies.analytics.posthog")}</td>
            <td>{t("privacy.cookies.analytics.posthogProvider")}</td>
            <td>{t("privacy.cookies.analytics.posthogDuration")}</td>
          </tr>
        </tbody>
      </table>
      <p>{t("privacy.cookies.analytics.note")}</p>
      <p>
        <strong>{t("privacy.cookies.noAds")}</strong>
      </p>

      {/* 6. Sous-traitants */}
      <h2>{t("privacy.subprocessors.title")}</h2>
      <p>{t("privacy.subprocessors.intro")}</p>
      <table>
        <thead>
          <tr>
            <th>{t("privacy.subprocessors.headers.name")}</th>
            <th>{t("privacy.subprocessors.headers.purpose")}</th>
            <th>{t("privacy.subprocessors.headers.hq")}</th>
            <th>{t("privacy.subprocessors.headers.hosting")}</th>
            <th>{t("privacy.subprocessors.headers.safeguards")}</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((sp) => (
            <tr key={sp}>
              <td>
                <strong>
                  {sp === "vercel"
                    ? "Vercel Inc."
                    : sp === "neon"
                      ? "Neon Inc."
                      : sp === "posthog"
                        ? "PostHog Inc."
                        : sp === "sentry"
                          ? "Sentry"
                          : sp === "resend"
                            ? "Resend Inc."
                            : sp === "stripe"
                              ? "Stripe Inc."
                              : sp === "anthropic"
                                ? "Anthropic PBC"
                                : "Slack (Salesforce)"}
                </strong>
              </td>
              <td>{t(`privacy.subprocessors.${sp}.purpose`)}</td>
              <td>{t(`privacy.subprocessors.${sp}.hq`)}</td>
              <td>{t(`privacy.subprocessors.${sp}.hosting`)}</td>
              <td>{t(`privacy.subprocessors.${sp}.safeguards`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{t("privacy.subprocessors.noSale")}</p>

      {/* 7. Transferts hors UE */}
      <h2>{t("privacy.transfers.title")}</h2>
      <p>{t("privacy.transfers.intro")}</p>
      <ul>
        <li>
          <strong>{t("privacy.transfers.eu")}</strong>
        </li>
        <li>
          <strong>{t("privacy.transfers.us")}</strong>
        </li>
      </ul>
      <p>{t("privacy.transfers.safeguards")}</p>
      <ul>
        <li>{t("privacy.transfers.scc")}</li>
        <li>{t("privacy.transfers.dpa")}</li>
      </ul>
      <p>{t("privacy.transfers.conclusion")}</p>

      {/* 8. Vos droits */}
      <h2>{t("privacy.rights.title")}</h2>
      <p>{t("privacy.rights.content")}</p>
      <ul>
        <li>{t("privacy.rights.items.access")}</li>
        <li>{t("privacy.rights.items.rectification")}</li>
        <li>{t("privacy.rights.items.deletion")}</li>
        <li>{t("privacy.rights.items.portability")}</li>
        <li>{t("privacy.rights.items.opposition")}</li>
        <li>{t("privacy.rights.items.consent")}</li>
      </ul>
      <p>
        <strong>{t("privacy.rights.exerciseTitle")}</strong>
      </p>
      <ul>
        <li>{t("privacy.rights.contactEmail")}</li>
        <li>{t("privacy.rights.contactMail")}</li>
      </ul>
      <p>{t("privacy.rights.delay")}</p>
      <p>
        <strong>{t("privacy.rights.complaint")}</strong>
      </p>

      {/* 9. Conservation */}
      <h2>{t("privacy.retention.title")}</h2>
      <ul>
        <li>{t("privacy.retention.account")}</li>
        <li>{t("privacy.retention.usage")}</li>
        <li>{t("privacy.retention.payment")}</li>
        <li>{t("privacy.retention.analytics")}</li>
        <li>{t("privacy.retention.errors")}</li>
      </ul>
      <p>{t("privacy.retention.deletion")}</p>

      {/* 10. Modification */}
      <h2>{t("privacy.changes.title")}</h2>
      <p>{t("privacy.changes.content")}</p>
    </>
  );
}
