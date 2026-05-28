import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export function isSupportedLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}
