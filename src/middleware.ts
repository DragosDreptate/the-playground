import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth.config";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Check if the path is an admin route (after any locale prefix)
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/admin`) || pathname === `/${locale}/admin`
  ) || pathname.startsWith("/admin");

  if (isAdminRoute) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|monitoring|.*\\..*).*)"],
};
