import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  return {
    title: t("privacy.title"),
    description: t("privacy.metaDescription"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Legal");

  return (
    <>
      <p className="text-muted-foreground not-prose text-sm">
        {t("lastUpdated", { date: "22/02/2026" })}
      </p>
      <h1>{t("privacy.title")}</h1>
      <p>{t("privacy.intro")}</p>

      <h2>{t("privacy.dataCollected.title")}</h2>
      <ul>
        <li>{t("privacy.dataCollected.items.email")}</li>
        <li>{t("privacy.dataCollected.items.name")}</li>
        <li>{t("privacy.dataCollected.items.oauth")}</li>
        <li>{t("privacy.dataCollected.items.usage")}</li>
      </ul>

      <h2>{t("privacy.purpose.title")}</h2>
      <ul>
        <li>{t("privacy.purpose.items.auth")}</li>
        <li>{t("privacy.purpose.items.service")}</li>
        <li>{t("privacy.purpose.items.email")}</li>
        <li>{t("privacy.purpose.items.analytics")}</li>
      </ul>

      <h2>{t("privacy.sharing.title")}</h2>
      <p>{t("privacy.sharing.content")}</p>

      <h2>{t("privacy.cookies.title")}</h2>
      <p>{t("privacy.cookies.content")}</p>

      <h2>{t("privacy.rights.title")}</h2>
      <p>{t("privacy.rights.content")}</p>
      <ul>
        <li>{t("privacy.rights.items.access")}</li>
        <li>{t("privacy.rights.items.rectification")}</li>
        <li>{t("privacy.rights.items.deletion")}</li>
        <li>{t("privacy.rights.items.portability")}</li>
        <li>{t("privacy.rights.items.opposition")}</li>
      </ul>
      <p>{t("privacy.rights.contact")}</p>

      <h2>{t("privacy.retention.title")}</h2>
      <p>{t("privacy.retention.content")}</p>
    </>
  );
}
