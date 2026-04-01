import { prisma } from "@/infrastructure/db/prisma";
import type {
  RateLimiter,
  RateLimitResult,
} from "@/domain/ports/services/rate-limiter";

export const prismaRateLimiter: RateLimiter = {
  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    // Pas d'entrée ou fenêtre expirée → reset et autoriser
    if (!existing || existing.windowStart < windowStart) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Limite atteinte
    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Incrémenter
    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  },

  async purgeExpired(maxAgeMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: cutoff } },
    });
    return result.count;
  },
};
