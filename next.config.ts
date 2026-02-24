import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
];

const nextConfig: NextConfig = {
  experimental: {
    // Inclure CHANGELOG.md dans le bundle serverless Vercel
    // (utilisé par la page /changelog via readFileSync)
    outputFileTracingIncludes: {
      "/:locale/changelog": ["./CHANGELOG.md"],
    },
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

export default withSentryConfig(withNextIntl(nextConfig), {
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
