import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/infrastructure/db/prisma";
import { cookies } from "next/headers";

/**
 * Dev/E2E-only: impersonate a user by creating a JWT session cookie.
 *
 * GET /api/dev/impersonate?email=host@test.playground
 *   → Encode JWT (strategy "jwt") → Sets cookie → 302 /dashboard
 *
 * Note : l'ancien endpoint créait une session en DB (strategy "database").
 * Avec strategy "jwt", Auth.js attend un JWT signé dans le cookie — plus de DB session.
 */
export async function GET(request: NextRequest) {
  const isDevMode = process.env.NODE_ENV !== "production";
  const e2eSecret = process.env.E2E_SECRET;
  const providedSecret = request.nextUrl.searchParams.get("secret");
  const hasValidSecret = !!e2eSecret && providedSecret === e2eSecret;

  if (!isDevMode && !hasValidSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const maxAge = 30 * 24 * 60 * 60; // 30 jours
  const expires = new Date(Date.now() + maxAge * 1000);

  // Encode un JWT compatible Auth.js (strategy "jwt") avec les champs custom de session
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      onboardingCompleted: user.onboardingCompleted,
      role: user.role,
      dashboardMode: user.dashboardMode,
    },
    secret: process.env.AUTH_SECRET!,
    maxAge,
    salt: "authjs.session-token",
  });

  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
