import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Legal")]);
  return {
    title: t("terms.title"),
    description: t("terms.metaDescription"),
    alternates: buildAlternates(locale, "/legal/cgu"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("Legal");

  return (
    <>
      <h1>{t("terms.title")}</h1>
      <p className="text-muted-foreground not-prose text-sm">
        {t("lastUpdated", { date: "22/02/2026" })}
      </p>
      <p>{t("terms.intro")}</p>

      <h2>{t("terms.acceptance.title")}</h2>
      <p>{t("terms.acceptance.content")}</p>

      <h2>{t("terms.service.title")}</h2>
      <p>{t("terms.service.content")}</p>

      <h2>{t("terms.account.title")}</h2>
      <p>{t("terms.account.content")}</p>

      <h2>{t("terms.userContent.title")}</h2>
      <p>{t("terms.userContent.content")}</p>

      <h2>{t("terms.hostResponsibilities.title")}</h2>
      <p>{t("terms.hostResponsibilities.content")}</p>

      <h2>{t("terms.playerResponsibilities.title")}</h2>
      <p>{t("terms.playerResponsibilities.content")}</p>

      <h2>{t("terms.pricing.title")}</h2>
      <p>{t("terms.pricing.content")}</p>

      <h2>{t("terms.payments.title")}</h2>
      <p>{t("terms.payments.content")}</p>

      <h2>{t("terms.liability.title")}</h2>
      <p>{t("terms.liability.content")}</p>

      <h2>{t("terms.modification.title")}</h2>
      <p>{t("terms.modification.content")}</p>

      <h2>{t("terms.law.title")}</h2>
      <p>{t("terms.law.content")}</p>
    </>
  );
}
