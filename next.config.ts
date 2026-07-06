import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";
import { withBotId } from "botid/next/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  // Désactivé : cachait le HTML personnalisé du dashboard côté service worker,
  // provoquant des données obsolètes après mutations (inscriptions, création,
  // suppression). Le precaching des assets statiques + offline fallback restent actifs.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const baseSecurityHeaders = [
  // Empêche le navigateur de détecter (sniffer) le Content-Type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Politique de référent : transmet l'origine uniquement en cross-origin HTTPS
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive les fonctionnalités navigateur non utilisées (privacy + sécurité)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // Force HTTPS pendant 2 ans, sous-domaines inclus (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const baseCspDirectives = [
  "default-src 'self'",
  // Next.js requiert 'unsafe-inline' pour les styles injectés et 'unsafe-eval' pour le HMR dev
  // Stripe.js doit être chargé depuis js.stripe.com (exigence PCI-DSS)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  // Images : domaine propre + blobs + avatars OAuth + Unsplash + Stripe
  "img-src 'self' data: blob: *.unsplash.com *.public.blob.vercel-storage.com avatars.githubusercontent.com lh3.googleusercontent.com media.licdn.com q.stripe.com",
  // Vidéos : pièces jointes lues directement depuis le store Vercel Blob
  // (sans media-src, la lecture retomberait sur default-src 'self' et serait bloquée)
  "media-src 'self' *.public.blob.vercel-storage.com",
  // Connexions : domaine propre + Sentry (tunnel via /monitoring) + Stripe API + PostHog (tunnel via /ingest)
  // + Vercel Blob (upload client-direct des pièces jointes : initiation via vercel.com/api/blob, PUT vers le store)
  "connect-src 'self' *.sentry.io api.stripe.com api-adresse.data.gouv.fr vercel.com blob.vercel-storage.com *.public.blob.vercel-storage.com",
  // Service Worker PWA
  "worker-src 'self'",
  "font-src 'self'",
  // Stripe Elements + Google Maps Embed API (www.google.com/maps/embed/v1/...)
  // + Vercel Blob (PDF preview dans la modale des pièces jointes Moment)
  // + 'self' pour l'aperçu live du widget /embed/m/* dans la modale dashboard
  "frame-src 'self' js.stripe.com www.google.com *.public.blob.vercel-storage.com",
  // Formulaires : uniquement vers le domaine propre
  "form-action 'self'",
];

const securityHeaders = [
  ...baseSecurityHeaders,
  // Empêche l'intégration dans des iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: [
      ...baseCspDirectives,
      // Interdire l'intégration de NOTRE page dans des iframes tierces (anti-clickjacking)
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Headers pour la route /embed/* : on autorise volontairement l'embedding
// par des sites externes (c'est l'objectif du widget). X-Frame-Options retiré
// et CSP frame-ancestors * pour permettre l'intégration n'importe où.
const embedHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value: [...baseCspDirectives, "frame-ancestors *"].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 12 MB : couvre les pièces jointes Moment (10 MB max par fichier,
      // uploadées une par une) avec une marge pour l'overhead multipart/form-data.
      bodySizeLimit: "12mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "msl.the-playground.fr" }],
        destination:
          "https://the-playground.fr/circles/le-club-de-mont-saint-leger",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        // Widget embeddable : autorise l'intégration sur tout domaine externe.
        source: "/embed/:path*",
        headers: embedHeaders,
      },
      {
        // Applique les headers de sécurité stricts sur toutes les autres routes.
        source: "/((?!embed).*)",
        headers: securityHeaders,
      },
      {
        // Routes techniques jamais destinées à apparaître dans un index moteur.
        // Doublé du `disallow` dans robots.ts car robots.txt n'empêche pas
        // l'indexation d'URLs découvertes via lien externe — seul X-Robots-Tag
        // bloque l'indexation côté Google/Bing.
        source: "/:path(api|ingest|monitoring)/:rest*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

// withBotId enveloppe la config la plus brute pour fusionner ses rewrites de
// proxy (challenge BotID servi en first-party) avec nos rewrites PostHog.
export default withSentryConfig(withPWA(withNextIntl(withBotId(nextConfig))), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  silent: !process.env.CI,
});
