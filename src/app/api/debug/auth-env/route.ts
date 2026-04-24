import { NextResponse } from "next/server";

// Route de debug temporaire — à supprimer après diagnostic OAuth staging.
// Retourne uniquement les variables non-sensibles liées à la construction des URLs Auth.js.
export async function GET() {
  return NextResponse.json({
    AUTH_URL: process.env.AUTH_URL ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL ?? null,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    IS_STAGING: process.env.IS_STAGING ?? null,
    AUTH_GOOGLE_ID_PREFIX: process.env.AUTH_GOOGLE_ID?.slice(0, 12) ?? null,
  });
}
