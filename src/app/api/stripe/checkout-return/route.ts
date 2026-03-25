import { NextResponse } from "next/server";
import { prismaRegistrationRepository } from "@/infrastructure/repositories";

const MAX_WAIT_MS = 10_000;
const POLL_INTERVAL_MS = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const momentSlug = searchParams.get("slug");
  const userId = searchParams.get("userId");
  const momentId = searchParams.get("momentId");

  if (!momentSlug) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const momentUrl = `${baseUrl}/m/${momentSlug}`;

  // If we don't have userId/momentId, just redirect immediately
  if (!userId || !momentId) {
    return NextResponse.redirect(momentUrl);
  }

  // Poll until the registration exists or timeout
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const registration = await prismaRegistrationRepository.findByMomentAndUser(
      momentId,
      userId
    );
    if (registration && registration.status === "REGISTERED" && registration.paymentStatus === "PAID") {
      return NextResponse.redirect(momentUrl);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Timeout — redirect anyway, the webhook will catch up
  return NextResponse.redirect(momentUrl);
}
