import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";
import { cookies } from "next/headers";

/**
 * Dev-only: impersonate a user by creating a session and setting the Auth.js cookie.
 *
 * GET /api/dev/impersonate?email=host@test.playground
 *   → Creates DB session → Sets cookie → 302 /dashboard
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
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

  // Create a session in DB (same table Auth.js uses)
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken,
      expires,
    },
  });

  // Set the Auth.js session cookie (HTTP local = "authjs.session-token", not "__Secure-" prefix)
  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
