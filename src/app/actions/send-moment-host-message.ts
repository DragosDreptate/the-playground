"use server";

import * as Sentry from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import {
  sendMomentHostMessage,
  type HostMessageSegment,
} from "@/domain/usecases/send-moment-host-message";
import { isAdminInHostMode } from "@/lib/admin-host-mode";
import { DEFAULT_RECIPIENT_LOCALE } from "@/lib/email/email-locale";
import {
  buildMomentEmailContext,
  formatLocationText,
} from "@/lib/email/format-moment-email";
import {
  extractHostMessageTextLength,
  sanitizeHostMessageHtml,
  HOST_MESSAGE_BODY_MAX_TEXT_LENGTH,
} from "@/lib/email/sanitize-host-message";
import { getAppUrl } from "@/lib/app-url";
import { captureServerEvent } from "@/lib/posthog-server";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";

const emailService = createResendEmailService();

const SEGMENTS: HostMessageSegment[] = ["REGISTERED", "WAITLISTED", "ALL"];

export async function sendMomentHostMessageAction(input: {
  momentId: string;
  segment: HostMessageSegment;
  subject: string;
  bodyHtml: string;
}): Promise<ActionResult<{ recipientCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }
  const senderId = session.user.id;

  if (!SEGMENTS.includes(input.segment)) {
    return { success: false, error: "Segment invalide", code: "INVALID_SEGMENT" };
  }

  const bodyHtml = sanitizeHostMessageHtml(input.bodyHtml);
  const bodyTextLength = extractHostMessageTextLength(bodyHtml);
  if (bodyTextLength === 0) {
    return { success: false, error: "Message vide", code: "HOST_MESSAGE_BODY_EMPTY" };
  }
  if (bodyTextLength > HOST_MESSAGE_BODY_MAX_TEXT_LENGTH) {
    return {
      success: false,
      error: "Message trop long",
      code: "HOST_MESSAGE_BODY_TOO_LONG",
    };
  }

  const skipAuthorization = await isAdminInHostMode(session);

  // Destinataires ≠ déclencheur → strings dans la locale plateforme par défaut
  // (le corps du message est de toute façon rédigé par l'Organisateur).
  const locale = DEFAULT_RECIPIENT_LOCALE;
  const t = await getTranslations({ locale, namespace: "Email.momentHostMessage" });

  return toActionResult(async () => {
    const moment = await prismaMomentRepository.findById(input.momentId);
    const emailContext = moment
      ? buildMomentEmailContext(moment, locale)
      : { momentDate: "", momentDateMonth: "", momentDateDay: "", locationText: "" };
    const momentLocation = moment
      ? formatLocationText(
          moment.locationType,
          moment.locationName,
          moment.locationAddress,
          null, // pas de lien visio dans l'email — la page événement le porte
          locale
        )
      : null;

    const hostName =
      session.user.name ?? session.user.email ?? "";

    const result = await sendMomentHostMessage(
      {
        momentId: input.momentId,
        senderId,
        segment: input.segment,
        subject: input.subject,
        bodyHtml,
        skipAuthorization,
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
        userRepository: prismaUserRepository,
        emailService,
        emailStrings: {
          greeting: t("greeting"),
          greetingFallback: t("greetingFallback"),
          preheader: t("preheader", {
            hostName,
            momentTitle: moment?.title ?? "",
          }),
          dateLabel: t("dateLabel"),
          locationLabel: t("locationLabel"),
          ctaLabel: t("ctaLabel"),
          footer: t("footer", { momentTitle: moment?.title ?? "" }),
        },
        momentDate: emailContext.momentDate,
        momentDateMonth: emailContext.momentDateMonth.toUpperCase(),
        momentDateDay: emailContext.momentDateDay,
        momentLocation,
        appUrl: getAppUrl(),
        onEmailError: (err) => Sentry.captureException(err),
      }
    );

    void captureServerEvent(senderId, "moment_host_message_sent", {
      momentId: input.momentId,
      segment: input.segment,
      recipientCount: result.recipientCount,
    });

    if (moment) {
      const circle = await prismaCircleRepository.findById(moment.circleId);
      if (circle) {
        revalidatePath(`/dashboard/circles/${circle.slug}/moments/${moment.slug}`);
      }
    }

    return result;
  });
}
