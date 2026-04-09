import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/app-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  const appUrl = getAppUrl();
  return {
    title: t("legalNotice.title"),
    description: t("legalNotice.metaDescription"),
    alternates: {
      canonical: `${appUrl}/legal/mentions-legales`,
      languages: {
        fr: `${appUrl}/legal/mentions-legales`,
        en: `${appUrl}/en/legal/mentions-legales`,
      },
    },
  };
}

export default async function LegalNoticePage() {
  const t = await getTranslations("Legal");

  return (
    <>
      <h1>{t("legalNotice.title")}</h1>
      <p className="text-muted-foreground not-prose text-sm">
        {t("lastUpdated", { date: "22/02/2026" })}
      </p>

      <h2>{t("legalNotice.editor.title")}</h2>
      <p>{t("legalNotice.editor.content")}</p>
      <ul>
        <li>{t("legalNotice.editor.siret")}</li>
        <li>{t("legalNotice.editor.address")}</li>
        <li>{t("legalNotice.editor.contact")}</li>
        <li>{t("legalNotice.editor.director")}</li>
      </ul>

      <h2>{t("legalNotice.host.title")}</h2>
      <p>{t("legalNotice.host.content")}</p>

      <h2>{t("legalNotice.intellectualProperty.title")}</h2>
      <p>{t("legalNotice.intellectualProperty.content")}</p>

      <h2>{t("legalNotice.liability.title")}</h2>
      <p>{t("legalNotice.liability.content")}</p>
    </>
  );
}
