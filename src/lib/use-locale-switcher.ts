"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function useLocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: string) {
    if (nextLocale === locale) return;
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
