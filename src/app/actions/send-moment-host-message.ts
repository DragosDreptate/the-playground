"use server";

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
import { buildMomentEmailContext } from "@/lib/email/format-moment-email";
import {
  extractHostMessageTextLength,
  sanitizeHostMessageHtml,
} from "@/lib/email/sanitize-host-message";
import { getAppUrl } from "@/lib/app-url";
import { captureServerEvent } from "@/lib/posthog-server";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";
import { buildEmailLocaleResolver } from "./helpers/email-locale-resolver";
import { handleLocaleGroupFailures } from "./helpers/send-each-locale-group";

const emailService = createResendEmailService();

const SEGMENTS: HostMessageSegment[] = ["REGISTERED", "WAITLISTED", "ALL"];

export async function sendMomentHostMessageAction(input: {
  momentId: string;
  segment: HostMessageSegment;
  subject: string;
  bodyHtml: string;
  /** Slugs connus du composant appelant — servent uniquement à revalidatePath. */
  circleSlug: string;
  momentSlug: string;
}): Promise<ActionResult<{ recipientCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }
  const senderId = session.user.id;

  if (!SEGMENTS.includes(input.segment)) {
    return { success: false, error: "Segment invalide", code: "INVALID_SEGMENT" };
  }

  // Vide / trop long : vérifiés par le usecase via bodyTextLength.
  const bodyHtml = sanitizeHostMessageHtml(input.bodyHtml);
  const bodyTextLength = extractHostMessageTextLength(bodyHtml);

  const skipAuthorization = await isAdminInHostMode(session);

  // Habillage de l'email (titres, boutons, dates) dans la langue de chaque
  // destinataire ; le corps reste celui rédigé par l'Organisateur.
  const resolver = await buildEmailLocaleResolver(senderId);

  return toActionResult(async () => {
    const result = await sendMomentHostMessage(
      {
        momentId: input.momentId,
        senderId,
        segment: input.segment,
        subject: input.subject,
        bodyHtml,
        bodyTextLength,
        skipAuthorization,
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
        userRepository: prismaUserRepository,
        emailService,
        localizeRecipients: async (recipientUserIds) => {
          const groups = await resolver.groupByLocale(recipientUserIds, (id) => id);
          return groups.map(({ locale, t, items }) => ({
            userIds: items,
            // Templates bruts : {hostName} et {momentTitle} sont résolus par le
            // usecase, qui détient le sender et le moment (pattern contact-circle-hosts).
            emailStrings: {
              preheader: t("momentHostMessage.preheader"),
              dateLabel: t("momentHostMessage.dateLabel"),
              locationLabel: t("momentHostMessage.locationLabel"),
              ctaLabel: t("momentHostMessage.ctaLabel"),
              footer: t("momentHostMessage.footer"),
            },
            buildEmailContext: (moment) => {
              // videoLink omis : le lien visio n'apparaît pas dans l'email, la page
              // événement le porte.
              const ctx = buildMomentEmailContext({ ...moment, videoLink: null }, locale);
              return {
                momentDate: ctx.momentDate,
                momentDateMonth: ctx.momentDateMonth.toUpperCase(),
                momentDateDay: ctx.momentDateDay,
                momentLocation: ctx.locationText,
              };
            },
          }));
        },
        appUrl: getAppUrl(),
      }
    );

    // Lots de langue en échec : signalés à Sentry. Si rien n'est parti,
    // l'Organisateur voit une erreur ; sinon il voit le nombre réellement atteint.
    handleLocaleGroupFailures(
      result.failures,
      result.recipientCount === 0,
      "moment_host_message"
    );

    void captureServerEvent(senderId, "moment_host_message_sent", {
      momentId: input.momentId,
      segment: input.segment,
      recipientCount: result.recipientCount,
    });

    revalidatePath(
      `/dashboard/circles/${input.circleSlug}/moments/${input.momentSlug}`
    );

    // Uniquement le compteur : les erreurs internes ne partent jamais au navigateur.
    return { recipientCount: result.recipientCount };
  });
}
