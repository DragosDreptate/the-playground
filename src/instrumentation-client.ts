import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { routing } from "@/i18n/routing";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

// Vercel BotID — CAPTCHA invisible sur les routes sensibles. Le client attache
// des en-têtes de challenge aux requêtes déclarées ci-dessous ; la vérification
// se fait côté serveur via checkBotId() (cf. infrastructure/security/bot-protection.ts).
// On protège les pages d'où partent les server actions de connexion : verrouiller
// le sign-in coupe la racine du vecteur « Contacter les organisateurs » (qui exige
// d'être authentifié).
//
// La liste est dérivée de `routing.locales` pour qu'une langue ajoutée plus tard
// soit protégée automatiquement (locale par défaut sans préfixe, autres préfixées
// — localePrefix "as-needed"). Sans ça, une nouvelle locale resterait silencieusement
// non protégée.
initBotId({
  protect: routing.locales.map((locale) => ({
    path:
      locale === routing.defaultLocale
        ? "/auth/sign-in"
        : `/${locale}/auth/sign-in`,
    method: "POST" as const,
  })),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
