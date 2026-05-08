"use server";

import * as Sentry from "@sentry/nextjs";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";

const PLATFORM_TIMEZONE = "Europe/Paris";
import { auth } from "@/infrastructure/auth/auth.config";
import { isAdminUser, resolveCircleRepository } from "@/lib/admin-host-mode";
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
import { toActionResult } from "./helpers/to-action-result";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { getDisplayName } from "@/lib/display-name";
import { formatPrice } from "@/lib/format-price";
import { notifySlackNewRegistration } from "@/infrastructure/services/slack/slack-notification-service";
import {
  buildEmailLocaleResolver,
  type EmailLocaleResolver,
} from "@/lib/email/email-locale";
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

  const userId = session.user.id;
  return toActionResult(async () => {
    const result = await joinMoment(
      { momentId, userId },
      {
        momentRepository: prismaMomentRepository,
        registrationRepository: prismaRegistrationRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    if (!result.pendingApproval) {
      const resolver = await buildEmailLocaleResolver(userId);
      if (!isAdminUser(session)) sendRegistrationEmails(
        momentId,
        userId,
        result.registration,
        resolver
      ).catch((err) => {
        console.error(err);
        Sentry.captureException(err);
      });
    } else {
      // Pending approval flow — fire-and-forget (pas de after() — peut être coupé par Vercel serverless)
      const resolver = await buildEmailLocaleResolver(userId);
      if (!isAdminUser(session)) notifyHostsPendingApproval(
        momentId, userId, resolver
      ).catch((err) => {
        console.error("[approval-notification] Error:", err);
        Sentry.captureException(err);
      });
    }

    invalidateDashboardCache(userId);
    return result.registration;
  });
}

export async function cancelRegistrationAction(
  registrationId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const userId = session.user.id;
  return toActionResult(async () => {
    const result = await cancelRegistration(
      { registrationId, userId },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        paymentService,
      }
    );

    const resolver = await buildEmailLocaleResolver(userId);

    if (result.promotedRegistration) {
      sendPromotionEmail(result.promotedRegistration, resolver).catch((err) => {
        console.error(err);
        Sentry.captureException(err);
      });
    }

    const cancelledReg = result.registration;
    if (cancelledReg.paymentStatus === "PAID" || cancelledReg.paymentStatus === "REFUNDED") {
      sendHostPaidCancellationEmail(registrationId, userId, resolver).catch((err) =>
        Sentry.captureException(err)
      );
    }

    invalidateDashboardCache(userId);
    if (result.promotedRegistration) {
      invalidateDashboardCache(result.promotedRegistration.userId);
    }
  });
}

// --- Fire-and-forget email helpers ---

async function sendHostPaidCancellationEmail(
  registrationId: string,
  cancellingUserId: string,
  resolver: EmailLocaleResolver
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

  const hosts = await prismaCircleRepository.findOrganizers(circle.id);
  if (hosts.length === 0) return;

  const playerName = getDisplayName(player.firstName, player.lastName, player.email);
  const isRefundable = moment.refundable;

  await Promise.all(
    hosts.map(async (host) => {
      const hostName = getDisplayName(host.user.firstName, host.user.lastName, host.user.email);
      const t = await resolver.translationsFor(host.userId);
      const hostLocale = resolver.resolveFor(host.userId);
      const amountFormatted = formatPrice(moment.price, moment.currency, hostLocale);

      return emailService.sendHostPaidCancellation({
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
    })
  );
}

export async function sendRegistrationEmails(
  momentId: string,
  userId: string,
  registration: Registration,
  resolver: EmailLocaleResolver
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(userId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!user || !moment) return;

  // Note : circle dépend de moment.circleId → séquentiel volontaire
  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const playerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  const isWaitlisted = registration.status === "WAITLISTED";
  const stringPrefix = isWaitlisted ? "waitlist" : "registration";

  // Bloc Player — locale dépend de la position du Player vs déclencheur
  const playerT = await resolver.translationsFor(userId);
  const playerLocale = resolver.resolveFor(userId);
  const playerDateFns = getDateFnsLocale(playerLocale);
  const playerMomentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", { locale: playerDateFns });
  const playerMomentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", { locale: playerDateFns });
  const playerMomentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
  const playerLocationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    moment.videoLink,
    playerLocale
  );

  // Generate .ics calendar attachment (REGISTERED only — not for waitlist)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const icsContent = !isWaitlisted
    ? generateIcs({
        uid: moment.id,
        title: moment.title,
        description: moment.description,
        startsAt: moment.startsAt,
        endsAt: moment.endsAt,
        location: playerLocationText,
        videoLink: moment.videoLink,
        url: `${baseUrl}/m/${moment.slug}`,
        organizerName: circle.name,
        method: "REQUEST",
        attendeeEmail: user.email,
      })
    : undefined;

  await emailService.sendRegistrationConfirmation({
    to: user.email,
    playerName,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate: playerMomentDate,
    momentDateMonth: playerMomentDateMonth,
    momentDateDay: playerMomentDateDay,
    locationText: playerLocationText,
    circleName: circle.name,
    circleSlug: circle.slug,
    status: registration.status,
    icsContent,
    ...(registration.paymentStatus === "PAID" && moment.price > 0 && {
      amountPaid: formatPrice(moment.price, moment.currency, playerLocale),
    }),
    ...(registration.stripeReceiptUrl && { receiptUrl: registration.stripeReceiptUrl }),
    strings: {
      subject: playerT(`${stringPrefix}.subject`, { momentTitle: moment.title }),
      heading: playerT(`${stringPrefix}.heading`),
      statusMessage: playerT(`${stringPrefix}.statusMessage`, {
        momentTitle: moment.title,
      }),
      dateLabel: playerT("common.dateLabel"),
      locationLabel: playerT("common.locationLabel"),
      viewMomentCta: playerT("common.viewMomentCta"),
      cancelLink: playerT("common.cancelLink"),
      dashboardLink: playerT("common.dashboardLink"),
      paymentConfirmed: playerT("common.paymentConfirmed"),
      viewReceipt: playerT("common.viewReceipt"),
      footer: playerT("common.footer"),
    },
  });

  // Bloc Hosts — chaque destinataire reçoit dans sa locale (déclencheur garde sa locale, autres → FR)
  const [hosts, registeredCount] = await Promise.all([
    prismaCircleRepository.findOrganizers(moment.circleId),
    prismaRegistrationRepository.countByMomentIdAndStatus(momentId, "REGISTERED"),
  ]);

  const filteredHosts = hosts.filter((host) => host.userId !== userId);
  const hostUserIds = filteredHosts.map((h) => h.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

  await Promise.all(
    filteredHosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewRegistration) return;

      const hostT = await resolver.translationsFor(host.userId);
      const hostName =
        [host.user.firstName, host.user.lastName].filter(Boolean).join(" ") ||
        host.user.email;

      const registrationInfo = moment.capacity
        ? hostT("hostNotification.registrationInfo", {
            count: registeredCount,
            capacity: moment.capacity,
          })
        : hostT("hostNotification.registrationInfoUnlimited", {
            count: registeredCount,
          });

      return emailService.sendHostNewRegistration({
        to: host.user.email,
        hostName,
        playerName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        circleSlug: circle.slug,
        registrationInfo,
        strings: {
          subject: hostT("hostNotification.subject", {
            playerName,
            momentTitle: moment.title,
          }),
          heading: hostT("hostNotification.heading"),
          message: hostT("hostNotification.message", {
            playerName,
            momentTitle: moment.title,
          }),
          manageRegistrationsCta: hostT("hostNotification.manageRegistrationsCta"),
          footer: hostT("common.footer"),
        },
      });
    })
  );

  // Slack — toujours dans la locale par défaut (canal interne)
  const slackT = await resolver.defaultTranslations();
  const slackRegistrationInfo = moment.capacity
    ? slackT("hostNotification.registrationInfo", {
        count: registeredCount,
        capacity: moment.capacity,
      })
    : slackT("hostNotification.registrationInfoUnlimited", {
        count: registeredCount,
      });

  await notifySlackNewRegistration({
    playerName,
    momentTitle: moment.title,
    circleName: circle.name,
    registrationInfo: slackRegistrationInfo,
    momentUrl: `${baseUrl}/m/${moment.slug}`,
  });
}

async function sendPromotionEmail(
  promotedRegistration: Registration,
  resolver: EmailLocaleResolver
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(promotedRegistration.userId),
    prismaMomentRepository.findById(promotedRegistration.momentId),
  ]);
  if (!user || !moment) return;

  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const t = await resolver.translationsFor(promotedRegistration.userId);
  const locale = resolver.resolveFor(promotedRegistration.userId);
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

  const hostUserId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const result = await removeRegistrationByHost(
      { registrationId, hostUserId },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: circleRepo,
        paymentService,
      }
    );

    const resolver = await buildEmailLocaleResolver(hostUserId);
    const { momentId, userId } = result.cancelledRegistration;

    sendRemovedByHostEmail(momentId, userId, resolver).catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });

    if (result.promotedRegistration) {
      sendPromotionEmail(result.promotedRegistration, resolver).catch((err) => {
        console.error(err);
        Sentry.captureException(err);
      });
    }

    invalidateDashboardCache(userId);
    if (result.promotedRegistration) {
      invalidateDashboardCache(result.promotedRegistration.userId);
    }
  });
}

async function sendRemovedByHostEmail(
  momentId: string,
  userId: string,
  resolver: EmailLocaleResolver
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(userId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!user || !moment) return;

  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const t = await resolver.translationsFor(userId);
  const locale = resolver.resolveFor(userId);
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

  const hostUserId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const result = await approveMomentRegistration(
      { registrationId, hostUserId },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: circleRepo,
      }
    );

    const reg = result.registration;
    const resolver = await buildEmailLocaleResolver(hostUserId);
    sendRegistrationEmails(reg.momentId, reg.userId, reg, resolver).catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });

    invalidateDashboardCache(reg.userId);
    return result.registration;
  });
}

export async function rejectMomentRegistrationAction(
  registrationId: string
): Promise<ActionResult<Registration>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const hostUserId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
    const result = await rejectMomentRegistration(
      { registrationId, hostUserId },
      {
        registrationRepository: prismaRegistrationRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: circleRepo,
      }
    );

    const resolver = await buildEmailLocaleResolver(hostUserId);
    notifyPlayerRejection(result.userId, result.momentId, resolver).catch((err) => {
      console.error("[rejection-notification] Error:", err);
      Sentry.captureException(err);
    });

    invalidateDashboardCache(result.userId);
    return result;
  });
}

// ── Notification helpers (fire-and-forget, pas de after()) ────

async function notifyHostsPendingApproval(
  momentId: string,
  userId: string,
  resolver: EmailLocaleResolver
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(userId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!user || !moment) return;

  const [circle, hosts] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaCircleRepository.findOrganizers(moment.circleId),
  ]);
  if (!circle) return;

  const playerName = getDisplayName(user.firstName, user.lastName, user.email);
  const hostUserIds = hosts.map((h) => h.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

  await Promise.all(
    hosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewRegistration) return;
      const t = await resolver.translationsFor(host.userId);
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
}

async function notifyPlayerRejection(
  userId: string,
  momentId: string,
  resolver: EmailLocaleResolver
): Promise<void> {
  const [user, moment] = await Promise.all([
    prismaUserRepository.findById(userId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!user || !moment) return;
  const t = await resolver.translationsFor(userId);
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
}
