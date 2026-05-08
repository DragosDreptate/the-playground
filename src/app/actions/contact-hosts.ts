"use server";

import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("Email.hostContactMessage");

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
        emailStrings: {
          subject: t("subject"),
          heading: t("heading"),
          intro: t("intro"),
          messageLabel: t("messageLabel"),
          replyHint: t("replyHint"),
          viewContextCta: t("viewContextCta"),
          footer: t("footer"),
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
