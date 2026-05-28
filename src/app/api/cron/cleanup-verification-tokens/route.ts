import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * GET /api/cron/cleanup-verification-tokens
 *
 * Supprime les magic link tokens expirés de la table `verification_tokens`.
 *
 * Contexte : depuis le pivot magic link réutilisable (cf.
 * spec/magic-link-reusable-token.md), le custom adapter `useVerificationToken`
 * ne supprime PLUS le token à la première utilisation (sinon le token serait
 * one-time et la page intermédiaire /auth/confirm resterait nécessaire). Le
 * delete-on-expired interne à l'adapter ne fire que si quelqu'un re-tape un
 * token expiré, ce qui est rare → la table grossit sans borne.
 *
 * Ce cron compense en supprimant les rows dont `expires < NOW()`. Idempotent.
 * Le magic link a une fenêtre de 15 minutes (MAGIC_LINK_MAX_AGE_SECONDS), donc
 * une exécution quotidienne suffit largement : un token expiré peut traîner
 * au pire jusqu'à 24h avant cleanup, sans aucun impact fonctionnel.
 *
 * Protection : header Authorization: Bearer CRON_SECRET.
 */

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] cleanup-verification-tokens: unauthorized request",
      "warning",
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const { count } = await prisma.verificationToken.deleteMany({
      where: { expires: { lt: new Date() } },
    });
    const durationMs = Date.now() - startedAt;

    if (count > 0) {
      console.log(
        `[cleanup-verification-tokens] ${count} token(s) expiré(s) supprimé(s) en ${durationMs}ms`,
      );
    }

    return NextResponse.json({ success: true, deleted: count, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(
      `[cleanup-verification-tokens] Erreur après ${durationMs}ms :`,
      error,
    );
    Sentry.captureException(error, {
      tags: { cron: "cleanup-verification-tokens" },
      extra: { durationMs },
    });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
