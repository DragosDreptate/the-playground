import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SessionProvider } from "@/components/providers/session-provider";
import "../globals.css";

export const metadata: Metadata = {
  title: "The Playground",
  description: "La plateforme ouverte pour vos communautés",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <SessionProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
