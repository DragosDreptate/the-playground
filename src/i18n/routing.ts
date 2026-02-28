import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "es", "ro"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});
