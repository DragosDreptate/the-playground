import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";

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
// d'être authentifié). Locale `fr` sans préfixe, `en` préfixée (localePrefix "as-needed").
initBotId({
  protect: [
    { path: "/auth/sign-in", method: "POST" },
    { path: "/en/auth/sign-in", method: "POST" },
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
