import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const securityHeaders = [
  // Empêche le navigateur de détecter (sniffer) le Content-Type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Empêche l'intégration dans des iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
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
  // Content Security Policy — restreint les sources de scripts, styles et images
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requiert 'unsafe-inline' pour les styles injectés et 'unsafe-eval' pour le HMR dev
      // Stripe.js doit être chargé depuis js.stripe.com (exigence PCI-DSS)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      // Images : domaine propre + blobs + avatars OAuth + Unsplash + Stripe
      "img-src 'self' data: blob: *.unsplash.com *.public.blob.vercel-storage.com avatars.githubusercontent.com lh3.googleusercontent.com q.stripe.com",
      // Connexions : domaine propre + Sentry (tunnel via /monitoring) + Stripe API
      "connect-src 'self' *.sentry.io api.stripe.com",
      // Service Worker PWA
      "worker-src 'self'",
      "font-src 'self'",
      // Stripe Elements + Google Maps Embed API (www.google.com/maps/embed/v1/...)
      "frame-src js.stripe.com www.google.com",
      // Interdire l'intégration de NOTRE page dans des iframes tierces (anti-clickjacking)
      "frame-ancestors 'none'",
      // Formulaires : uniquement vers le domaine propre
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
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
        // Applique les headers de sécurité sur toutes les routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withPWA(withNextIntl(nextConfig)), {
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
