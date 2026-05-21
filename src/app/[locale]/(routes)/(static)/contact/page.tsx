import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContactForm } from "@/components/contact/contact-form";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Contact")]);
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/contact"),
    openGraph: {
      title: t("pageTitle"),
      description: t("pageDescription"),
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("Contact");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
      {/* Hero */}
      <div className="mb-10 space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("heroTitle")}</h1>
        <p className="mx-auto max-w-md text-base text-muted-foreground">
          {t("heroDescription")}
        </p>
      </div>

      {/* Formulaire */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <ContactForm />
      </div>

      {/* Note */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("notePrefix")}{" "}
        <Link href="/help" className="text-primary hover:text-foreground transition-colors">
          {t("noteHelpLink")}
        </Link>
        {t("noteSuffix")}
      </p>
    </div>
  );
}
