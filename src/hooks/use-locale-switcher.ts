"use client";

import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Connecté : mémorise la langue choisie comme langue de ses emails.
 * Appel à une route API (hors middleware next-intl et hors file du routeur),
 * jamais attendu : le changement de langue ne dépend pas de la base.
 * `keepalive` laisse la requête aboutir même si la page se recharge.
 */
function rememberLocaleForEmails(locale: string): void {
  fetch("/api/preferred-locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
    keepalive: true,
  }).catch(() => {});
}

export function useLocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: string) {
    if (nextLocale === locale) return;
    if (status === "authenticated") rememberLocaleForEmails(nextLocale);
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return {
    locale,
    locales: routing.locales,
    switchLocale,
    isPending,
  };
}
