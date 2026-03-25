"use server";

import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";

const PLATFORM_TIMEZONE = "Europe/Paris";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import { isAdminUser } from "@/lib/admin-host-mode";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService, createStripePaymentService } from "@/infrastructure/services";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import { joinMoment } from "@/domain/usecases/join-moment";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import { removeRegistrationByHost } from "@/domain/usecases/remove-registration-by-host";
import { approveMomentRegistration } from "@/domain/usecases/approve-moment-registration";
import { rejectMomentRegistration } from "@/domain/usecases/reject-moment-registration";
import { DomainError } from "@/domain/errors";
import { getDisplayName } from "@/lib/display-name";
import { formatPrice } from "@/lib/format-price";
import type { Registration } from "@/domain/models/registration";
import type { ActionResult } from "./types";

const emailService = createResendEmailService();
const paymentService = createStripePaymentService();

function getDateFnsLocale(locale: string) {
  return locale === "fr" ? fr : enUS;
}

function formatLocationText(
  locationType: string,
  locationName: string | null,
  locationAddress: string | null,
  videoLink: string | null,
  locale: string
): string {
  if (locationType === "ONLINE") {
    return videoLink ?? (locale === "fr" ? "En ligne" : "Online");
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

    if (!result.pendingApproval) {
      // Normal flow: send confirmation to participant + notification to host
      const locale = await getLocale();
      const t = await getTranslations("Email");

      if (!isAdminUser(session)) sendRegistrationEmails(
        momentId,
        session.user.id,
        result.registration,
        t,
        locale
      ).catch((err) => {
        console.error(err);
        Sentry.captureException(err);
      });
    } else {
      // Pending approval: notify host that a new request needs review
      const t = await getTranslations("Email");
      const userId = session.user.id;
      if (!isAdminUser(session)) after(async () => {
        try {
          const [user, moment] = await Promise.all([
            prismaUserRepository.findById(userId),
            prismaMomentRepository.findById(momentId),
          ]);
          if (!user || !moment) return;

          const [circle, hosts] = await Promise.all([
            prismaCircleRepository.findById(moment.circleId),
            prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
          ]);
          if (!circle) return;

          const playerName = getDisplayName(user.firstName, user.lastName, user.email);
          const hostUserIds = hosts.map((h) => h.userId);
          const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

          await Promise.all(
            hosts.map(async (host) => {
              const prefs = prefsMap.get(host.userId);
              if (!prefs?.notifyNewRegistration) return;
              const hostName = getDisplayName(host.user.firstName, host.user.lastName, host.user.email);
              return emailService.sendApprovalNotification({
                to: host.user.email,
                recipientName: hostName,
                entityName: moment.title,
                entitySlug: `dashboard/circles/${circle.slug}/moments/${moment.slug}`,
                strings: {
                  subject: t("approvalNotification.hostPendingRegistrationSubject", { playerName, momentTitle: moment.title }),
                  heading: t("approvalNotification.hostPendingRegistrationHeading"),
                  message: t("approvalNotification.hostPendingRegistrationMessage", { playerName, momentTitle: moment.title }),
                  ctaLabel: t("approvalNotification.manageCta"),
                  footer: t("common.footer"),
                },
              });
            })
          );
        } catch (err) {
          console.error(err);
          Sentry.captureException(err);
        }
      });
    }

    return { success: true, data: result.registration };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
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
        paymentService,
      }
    );

    // Send promotion email if someone was promoted from waitlist
    if (result.promotedRegistration) {
      const locale = await getLocale();
      const t = await getTranslations("Email");

      sendPromotionEmail(result.promotedRegistration, t, locale).catch(
        (err) => {
          console.error(err);
          Sentry.captureException(err);
        }
      );
    }

    // Notify Host when a paid event registration is cancelled
    const cancelledReg = result.registration;
    if (cancelledReg.paymentStatus === "PAID" || cancelledReg.paymentStatus === "REFUNDED") {
      sendHostPaidCancellationEmail(registrationId, session.user.id).catch(
        (err) => Sentry.captureException(err)
      );
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

// --- Fire-and-forget email helpers ---

async function sendHostPaidCancellationEmail(
  registrationId: string,
  cancellingUserId: string
): Promise<void> {
  const registration = await prismaRegistrationRepository.findById(registrationId);
  if (!registration) return;

  const [moment, player] = await Promise.all([
    prismaMomentRepository.findById(registration.momentId),
    prismaUserRepository.findById(cancellingUserId),
  ]);
  if (!moment || !player) return;

  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const hosts = await prismaCircleRepository.findMembersByRole(circle.id, "HOST");
  if (hosts.length === 0) return;

  const locale = await getLocale();
  const t = await getTranslations("Email");
  const playerName = getDisplayName(player.firstName, player.lastName, player.email);

  const isRefundable = moment.refundable;
  const amountFormatted = formatPrice(moment.price, moment.currency, locale);

  for (const host of hosts) {
    const hostName = getDisplayName(host.user.firstName, host.user.lastName, host.user.email);
    await emailService.sendHostPaidCancellation({
      to: host.user.email,
      hostName,
      playerName,
      momentTitle: moment.title,
      momentSlug: moment.slug,
      circleSlug: circle.slug,
      amountRefunded: isRefundable ? amountFormatted : null,
      strings: {
        subject: t("paidCancellation.subject", { playerName, momentTitle: moment.title }),
        heading: t("paidCancellation.heading"),
        message: t("paidCancellation.message", { playerName, momentTitle: moment.title }),
        refundMessage: isRefundable
          ? t("paidCancellation.refunded", { amount: amountFormatted })
          : t("paidCancellation.notRefunded"),
        manageRegistrationsCta: t("paidCancellation.manageCta"),
        footer: t("common.footer"),
      },
    });
  }
}

type TranslationFunction = Awaited<ReturnType<typeof getTranslations<"Email">>>;

export async function sendRegistrationEmails(
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
  const momentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    moment.videoLink,
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
        videoLink: moment.videoLink,
        url: `${baseUrl}/m/${moment.slug}`,
        organizerName: circle.name,
        method: "REQUEST",
        attendeeEmail: user.email,
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
    ...(registration.paymentStatus === "PAID" && moment.price > 0 && {
      amountPaid: formatPrice(moment.price, moment.currency, locale),
    }),
    ...(registration.stripeReceiptUrl && { receiptUrl: registration.stripeReceiptUrl }),
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
      dashboardLink: t("common.dashboardLink"),
      footer: t("common.footer"),
    },
  });

  // Send notification to each Host of the Circle (skip if host = player)
  const [hosts, registeredCount] = await Promise.all([
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
    prismaRegistrationRepository.countByMomentIdAndStatus(momentId, "REGISTERED"),
  ]);

  const registrationInfo = moment.capacity
    ? t("hostNotification.registrationInfo", {
        count: registeredCount,
        capacity: moment.capacity,
      })
    : t("hostNotification.registrationInfoUnlimited", {
        count: registeredCount,
      });

  // Récupère les préférences de tous les Hosts en une seule requête pour éviter le N+1
  const filteredHosts = hosts.filter((host) => host.userId !== userId);
  const hostUserIds = filteredHosts.map((h) => h.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

  await Promise.all(
    filteredHosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewRegistration) return;

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
  const momentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    moment.videoLink,
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
    videoLink: moment.videoLink,
    url: `${promotionBaseUrl}/m/${moment.slug}`,
    organizerName: circle.name,
    method: "REQUEST",
    attendeeEmail: user.email,
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

export async function removeRegistrationByHostAction(
  registrationId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await removeRegistrationByHost(
      { registrationId, hostUserId: session.user.id },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        paymentService,
      }
    );

    const locale = await getLocale();
    const t = await getTranslations("Email");
    const { momentId, userId } = result.cancelledRegistration;

    sendRemovedByHostEmail(momentId, userId, t, locale).catch(
      (err) => {
        console.error(err);
        Sentry.captureException(err);
      }
    );

    if (result.promotedRegistration) {
      sendPromotionEmail(result.promotedRegistration, t, locale).catch(
        (err) => {
          console.error(err);
          Sentry.captureException(err);
        }
      );
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

async function sendRemovedByHostEmail(
  momentId: string,
  userId: string,
  t: TranslationFunction,
  locale: string
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(userId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!user || !moment) return;

  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const dateFnsLocale = getDateFnsLocale(locale);
  const momentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    moment.videoLink,
    locale
  );
  const playerName = getDisplayName(user.firstName, user.lastName, user.email);

  await emailService.sendRegistrationRemovedByHost({
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
    strings: {
      subject: t("registrationRemovedByHost.subject", { momentTitle: moment.title }),
      heading: t("registrationRemovedByHost.heading"),
      message: t("registrationRemovedByHost.message", { circleName: circle.name, momentTitle: moment.title }),
      ctaLabel: t("registrationRemovedByHost.ctaLabel"),
      footer: t("common.footer"),
    },
  });
}

export async function approveMomentRegistrationAction(
  registrationId: string
): Promise<ActionResult<Registration>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await approveMomentRegistration(
      { registrationId, hostUserId: session.user.id },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    // Fire-and-forget: send confirmation email to approved participant
    const reg = result.registration;
    const locale = await getLocale();
    const t = await getTranslations("Email");
    sendRegistrationEmails(reg.momentId, reg.userId, reg, t, locale).catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });

    return { success: true, data: result.registration };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function rejectMomentRegistrationAction(
  registrationId: string
): Promise<ActionResult<Registration>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await rejectMomentRegistration(
      { registrationId, hostUserId: session.user.id },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    const t = await getTranslations("Email");
    after(async () => {
      try {
        const [user, moment] = await Promise.all([
          prismaUserRepository.findById(result.userId),
          prismaMomentRepository.findById(result.momentId),
        ]);
        if (!user || !moment) return;
        const playerName = getDisplayName(user.firstName, user.lastName, user.email);
        await emailService.sendApprovalNotification({
          to: user.email,
          recipientName: playerName,
          entityName: moment.title,
          entitySlug: `m/${moment.slug}`,
          strings: {
            subject: t("approvalNotification.registrationRejectedSubject", { momentTitle: moment.title }),
            heading: t("approvalNotification.rejectedHeading"),
            message: t("approvalNotification.registrationRejectedMessage", { momentTitle: moment.title }),
            ctaLabel: t("approvalNotification.viewMomentCta"),
            footer: t("common.footer"),
          },
        });
      } catch (err) {
        Sentry.captureException(err);
      }
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}
