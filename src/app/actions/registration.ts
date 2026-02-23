"use server";

import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import { joinMoment } from "@/domain/usecases/join-moment";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import { DomainError } from "@/domain/errors";
import type { Registration } from "@/domain/models/registration";
import type { ActionResult } from "./types";

const emailService = createResendEmailService();

function getDateFnsLocale(locale: string) {
  return locale === "fr" ? fr : enUS;
}

function formatLocationText(
  locationType: string,
  locationName: string | null,
  locationAddress: string | null,
  locale: string
): string {
  if (locationType === "ONLINE") {
    return locale === "fr" ? "En ligne" : "Online";
  }
  return (
    [locationName, locationAddress].filter(Boolean).join(", ") ||
    (locale === "fr" ? "À définir" : "TBD")
  );
}

export async function joinMomentAction(
  momentId: string
): Promise<ActionResult<Registration>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await joinMoment(
      { momentId, userId: session.user.id },
      {
        momentRepository: prismaMomentRepository,
        registrationRepository: prismaRegistrationRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    // Resolve i18n in the request context (before fire-and-forget)
    const locale = await getLocale();
    const t = await getTranslations("Email");

    // Fire-and-forget: send emails without blocking the response
    sendRegistrationEmails(
      momentId,
      session.user.id,
      result.registration,
      t,
      locale
    ).catch(console.error);

    return { success: true, data: result.registration };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

export async function cancelRegistrationAction(
  registrationId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await cancelRegistration(
      { registrationId, userId: session.user.id },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    // Send promotion email if someone was promoted from waitlist
    if (result.promotedRegistration) {
      const locale = await getLocale();
      const t = await getTranslations("Email");

      sendPromotionEmail(result.promotedRegistration, t, locale).catch(
        console.error
      );
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

// --- Fire-and-forget email helpers ---

type TranslationFunction = Awaited<ReturnType<typeof getTranslations<"Email">>>;

async function sendRegistrationEmails(
  momentId: string,
  userId: string,
  registration: Registration,
  t: TranslationFunction,
  locale: string
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(userId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!user || !moment) return;

  // Note : circle dépend de moment.circleId → séquentiel volontaire
  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const dateFnsLocale = getDateFnsLocale(locale);
  const momentDate = format(moment.startsAt, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = format(moment.startsAt, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = format(moment.startsAt, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    locale
  );
  const playerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  const isWaitlisted = registration.status === "WAITLISTED";
  const stringPrefix = isWaitlisted ? "waitlist" : "registration";

  // Generate .ics calendar attachment (REGISTERED only — not for waitlist)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const icsContent = !isWaitlisted
    ? generateIcs({
        uid: moment.id,
        title: moment.title,
        description: moment.description,
        startsAt: moment.startsAt,
        endsAt: moment.endsAt,
        location: locationText,
        url: `${baseUrl}/m/${moment.slug}`,
        organizerName: circle.name,
      })
    : undefined;

  // Send confirmation to player
  await emailService.sendRegistrationConfirmation({
    to: user.email,
    playerName,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate,
    momentDateMonth,
    momentDateDay,
    locationText,
    circleName: circle.name,
    circleSlug: circle.slug,
    status: registration.status,
    icsContent,
    strings: {
      subject: t(`${stringPrefix}.subject`, { momentTitle: moment.title }),
      heading: t(`${stringPrefix}.heading`),
      statusMessage: t(`${stringPrefix}.statusMessage`, {
        momentTitle: moment.title,
      }),
      dateLabel: t("common.dateLabel"),
      locationLabel: t("common.locationLabel"),
      viewMomentCta: t("common.viewMomentCta"),
      cancelLink: t("common.cancelLink"),
      footer: t("common.footer"),
    },
  });

  // Send notification to each Host of the Circle (skip if host = player)
  const hosts = await prismaCircleRepository.findMembersByRole(
    moment.circleId,
    "HOST"
  );

  const registeredCount =
    await prismaRegistrationRepository.countByMomentIdAndStatus(
      momentId,
      "REGISTERED"
    );

  const registrationInfo = moment.capacity
    ? t("hostNotification.registrationInfo", {
        count: registeredCount,
        capacity: moment.capacity,
      })
    : t("hostNotification.registrationInfoUnlimited", {
        count: registeredCount,
      });

  await Promise.all(
    hosts
      .filter((host) => host.userId !== userId)
      .map((host) => {
        const hostName =
          [host.user.firstName, host.user.lastName].filter(Boolean).join(" ") ||
          host.user.email;

        return emailService.sendHostNewRegistration({
          to: host.user.email,
          hostName,
          playerName,
          momentTitle: moment.title,
          momentSlug: moment.slug,
          circleSlug: circle.slug,
          registrationInfo,
          strings: {
            subject: t("hostNotification.subject", {
              playerName,
              momentTitle: moment.title,
            }),
            heading: t("hostNotification.heading"),
            message: t("hostNotification.message", {
              playerName,
              momentTitle: moment.title,
            }),
            manageRegistrationsCta: t("hostNotification.manageRegistrationsCta"),
            footer: t("common.footer"),
          },
        });
      })
  );
}

async function sendPromotionEmail(
  promotedRegistration: Registration,
  t: TranslationFunction,
  locale: string
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(promotedRegistration.userId),
    prismaMomentRepository.findById(promotedRegistration.momentId),
  ]);
  if (!user || !moment) return;

  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const dateFnsLocale = getDateFnsLocale(locale);
  const momentDate = format(moment.startsAt, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = format(moment.startsAt, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = format(moment.startsAt, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    locale
  );
  const playerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  // Promoted = confirmed → attach .ics calendar event
  const promotionBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const icsContent = generateIcs({
    uid: moment.id,
    title: moment.title,
    description: moment.description,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    location: locationText,
    url: `${promotionBaseUrl}/m/${moment.slug}`,
    organizerName: circle.name,
  });

  await emailService.sendWaitlistPromotion({
    to: user.email,
    playerName,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate,
    momentDateMonth,
    momentDateDay,
    locationText,
    circleName: circle.name,
    circleSlug: circle.slug,
    icsContent,
    strings: {
      subject: t("promotion.subject", { momentTitle: moment.title }),
      heading: t("promotion.heading"),
      statusMessage: t("promotion.statusMessage", {
        momentTitle: moment.title,
      }),
      dateLabel: t("common.dateLabel"),
      locationLabel: t("common.locationLabel"),
      viewMomentCta: t("common.viewMomentCta"),
      footer: t("common.footer"),
    },
  });
}
