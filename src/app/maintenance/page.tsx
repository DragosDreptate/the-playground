import { headers } from "next/headers";

// Page de maintenance : composant statique pur, bilingue FR/EN, AUCUN appel
// DB / auth / service externe. La langue est déduite de l'en-tête Accept-Language
// (pas de next-intl ici, pour rester fonctionnelle même si l'i18n est en cause).

const COPY = {
  fr: {
    heading: "Site en maintenance",
    body: "The Playground est momentanément indisponible, le temps d'une intervention technique. Le service revient très vite, merci de ta patience.",
    retry: "Réessaie dans quelques minutes.",
  },
  en: {
    heading: "Under maintenance",
    body: "The Playground is temporarily unavailable while we carry out some technical work. We'll be back very soon, thanks for your patience.",
    retry: "Please check back in a few minutes.",
  },
} as const;

function pickLocale(acceptLanguage: string | null): "fr" | "en" {
  return acceptLanguage?.toLowerCase().trim().startsWith("en") ? "en" : "fr";
}

export default async function MaintenancePage() {
  const acceptLanguage = (await headers()).get("accept-language");
  const t = COPY[pickLocale(acceptLanguage)];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-6">
        {/* Marque The Playground (gradient rose → violet), inline pour ne
            dépendre d'aucune requête réseau pendant l'incident. */}
        <svg
          width="56"
          height="56"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="url(#grad)" />
          <polygon points="12,9 12,23 23,16" fill="white" />
        </svg>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t.heading}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md text-base leading-relaxed">
            {t.body}
          </p>
        </div>
      </div>

      <p className="text-muted-foreground/70 text-sm">{t.retry}</p>

      <p className="text-muted-foreground/60 absolute bottom-6 text-xs">
        The Playground
      </p>
    </main>
  );
}
