"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { prismaRateLimiter } from "@/infrastructure/services/rate-limiter/prisma-rate-limiter";
import { contactCircleHosts } from "@/domain/usecases/contact-circle-hosts";
import { captureServerEvent } from "@/lib/posthog-server";
import { getAppUrl } from "@/lib/app-url";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";
import { buildEmailLocaleResolver } from "./helpers/email-locale-resolver";

const emailService = createResendEmailService();

export async function contactCircleHostsAction(input: {
  circleId: string;
  momentId?: string;
  message: string;
}): Promise<ActionResult<{ recipientsCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const senderId = session.user.id;

  // Chaque Organisateur reçoit le message dans sa langue (pas celle du membre).
  const resolver = await buildEmailLocaleResolver(senderId);

  return toActionResult(async () => {
    const result = await contactCircleHosts(
      { senderId, ...input },
      {
        userRepository: prismaUserRepository,
        circleRepository: prismaCircleRepository,
        momentRepository: prismaMomentRepository,
        emailService,
        rateLimiter: prismaRateLimiter,
        appUrl: getAppUrl(),
        now: new Date(),
        localizeRecipients: async (recipientUserIds) => {
          const groups = await resolver.groupByLocale(recipientUserIds, (id) => id);
          return groups.map(({ t, items }) => ({
            userIds: items,
            emailStrings: {
              subject: t("hostContactMessage.subject"),
              heading: t("hostContactMessage.heading"),
              intro: t("hostContactMessage.intro"),
              messageLabel: t("hostContactMessage.messageLabel"),
              replyHint: t("hostContactMessage.replyHint"),
              aboutEvent: t("hostContactMessage.aboutEvent"),
              aboutCircle: t("hostContactMessage.aboutCircle"),
              footer: t("hostContactMessage.footer"),
            },
          }));
        },
      }
    );

    void captureServerEvent(senderId, "contact_hosts_sent", {
      circleId: input.circleId,
      momentId: input.momentId ?? null,
      recipientsCount: result.recipientsCount,
    });

    return result;
  });
}
