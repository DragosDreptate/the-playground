import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "es", "ro", "nl"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});
