"use server";

import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
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
import { buildMomentEmailContext } from "@/lib/email/format-moment-email";
import type { Registration, RegistrationStatus } from "@/domain/models/registration";
import type { ActionResult } from "./types";

const emailService = createResendEmailService();
const paymentService = createStripePaymentService();

export async function joinMomentAction(
  momentId: string
): Promise<ActionResult<Registration>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  if (!session.user.onboardingCompleted) {
    return { success: false, error: "Onboarding required", code: "ONBOARDING_REQUIRED" };
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

    // `buildEmailLocaleResolver` lit `getLocale()` (dépend de `headers()`) :
    // doit s'exécuter dans le request context, avant `after()`.
    const resolver = await buildEmailLocaleResolver(userId);
    // `after()` garantit la complétion sur Vercel Fluid Compute après le retour
    // de la Server Action. Une promesse fire-and-forget nue serait larguée au
    // gel de l'instance (emails + Slack perdus par intermittence).
    after(async () => {
      try {
        await (result.pendingApproval
          ? notifyHostsPendingApproval(momentId, userId, resolver)
          : sendRegistrationEmails(momentId, userId, result.registration, resolver));
      } catch (err) {
        console.error(err);
        Sentry.captureException(err);
      }
    });

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

    // Resolver construit en request context (getLocale), avant les `after()`.
    const resolver = await buildEmailLocaleResolver(userId);

    if (result.promotedRegistration) {
      const promoted = result.promotedRegistration;
      after(async () => {
        try {
          await sendPromotionEmail(promoted, resolver);
        } catch (err) {
          console.error(err);
          Sentry.captureException(err);
        }
      });
    }

    const previousStatus = result.previousStatus;
    after(async () => {
      try {
        await sendCancellationEmails(registrationId, userId, previousStatus, resolver);
      } catch (err) {
        console.error(err);
        Sentry.captureException(err);
      }
    });

    invalidateDashboardCache(userId);
    if (result.promotedRegistration) {
      invalidateDashboardCache(result.promotedRegistration.userId);
    }
  });
}

// --- Email helpers (dispatchés via after() par les actions) ---

// Désinscription self-service : confirmation au participant (inconditionnelle,
// email transactionnel) + notification aux organisateurs. Pour un événement
// payant, les organisateurs sont toujours notifiés (suivi de l'argent) ; pour un
// gratuit, la notification suit la préférence `notifyNewRegistration`
// (symétrique de la notification d'inscription). Un départ de liste d'attente
// n'envoie que la confirmation au participant (wording dédié, aucune place ne
// s'est libérée pour les organisateurs).
async function sendCancellationEmails(
  registrationId: string,
  cancellingUserId: string,
  previousStatus: RegistrationStatus,
  resolver: EmailLocaleResolver
): Promise<void> {
  // Seuls REGISTERED et WAITLISTED ont un wording de désinscription ; les autres
  // statuts (ex. PENDING_APPROVAL annulé via appel direct) n'envoient rien.
  const wasWaitlisted = previousStatus === "WAITLISTED";
  if (previousStatus !== "REGISTERED" && !wasWaitlisted) return;

  const registration = await prismaRegistrationRepository.findById(registrationId);
  if (!registration) return;

  const [moment, player] = await Promise.all([
    prismaMomentRepository.findById(registration.momentId),
    prismaUserRepository.findById(cancellingUserId),
  ]);
  if (!moment || !player) return;

  const [circle, hosts] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    wasWaitlisted ? [] : prismaCircleRepository.findOrganizers(moment.circleId),
  ]);
  if (!circle) return;

  const isPaid =
    registration.paymentStatus === "PAID" || registration.paymentStatus === "REFUNDED";
  // Ne jamais affirmer un remboursement non constaté : `refundable` dit la
  // politique de l'événement, seul paymentStatus REFUNDED prouve le remboursement.
  // PAID + remboursable = échec du refund Stripe (avalé par le usecase) → aucun
  // message plutôt qu'une fausse confirmation.
  const wasRefunded = registration.paymentStatus === "REFUNDED";
  const playerName = getDisplayName(player.firstName, player.lastName, player.email);
  const amountFor = (locale: string) =>
    formatPrice(moment.price, moment.currency, locale);
  const refundMessageFor = (
    t: Awaited<ReturnType<EmailLocaleResolver["translationsFor"]>>,
    locale: string,
    keyPrefix: "cancellationConfirmation" | "hostCancellation"
  ) =>
    !isPaid
      ? null
      : wasRefunded
        ? t(`${keyPrefix}.refunded`, { amount: amountFor(locale) })
        : !moment.refundable
          ? t(`${keyPrefix}.notRefunded`)
          : null;

  // La notification d'inscription exclut le déclencheur ; même filtre ici. En
  // pratique un organisateur actif ne peut pas annuler sa propre inscription
  // (D16), le filtre évite juste de dépendre implicitement de cette règle.
  const notifiedHosts = hosts.filter((host) => host.userId !== cancellingUserId);
  const prefsMap =
    isPaid || notifiedHosts.length === 0
      ? null
      : await prismaUserRepository.findNotificationPreferencesByIds(
          notifiedHosts.map((h) => h.userId)
        );

  // Toutes les lectures DB sont faites : les envois peuvent démarrer ensemble,
  // aucune promesse ne reste flottante pendant un await susceptible de rejeter.
  const playerT = await resolver.translationsFor(cancellingUserId);
  const playerLocale = resolver.resolveFor(cancellingUserId);
  const playerCtx = buildMomentEmailContext(moment, playerLocale);
  // Même pattern de préfixe que sendRegistrationEmails (waitlist vs registration).
  const playerPrefix = wasWaitlisted
    ? "cancellationConfirmation.waitlistLeft"
    : "cancellationConfirmation.registered";

  const sendPlayerEmail = emailService.sendCancellationConfirmation({
    to: player.email,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDateMonth: playerCtx.momentDateMonth,
    momentDateDay: playerCtx.momentDateDay,
    strings: {
      subject: playerT(`${playerPrefix}.subject`, { momentTitle: moment.title }),
      heading: playerT(`${playerPrefix}.heading`),
      message: playerT(`${playerPrefix}.message`, { momentTitle: moment.title }),
      refundMessage: refundMessageFor(playerT, playerLocale, "cancellationConfirmation"),
      ctaLabel: playerT("cancellationConfirmation.ctaLabel"),
      footer: playerT("common.footer"),
    },
  });

  const sendHostEmails = notifiedHosts.map(async (host) => {
    if (prefsMap && !prefsMap.get(host.userId)?.notifyNewRegistration) return;

    const hostName = getDisplayName(host.user.firstName, host.user.lastName, host.user.email);
    const t = await resolver.translationsFor(host.userId);
    const hostLocale = resolver.resolveFor(host.userId);

    return emailService.sendHostCancellation({
      to: host.user.email,
      hostName,
      playerName,
      momentTitle: moment.title,
      momentSlug: moment.slug,
      circleSlug: circle.slug,
      amountRefunded: wasRefunded ? amountFor(hostLocale) : null,
      strings: {
        subject: t("hostCancellation.subject", { playerName, momentTitle: moment.title }),
        heading: t("hostCancellation.heading"),
        message: t("hostCancellation.message", { playerName, momentTitle: moment.title }),
        refundMessage: refundMessageFor(t, hostLocale, "hostCancellation"),
        manageRegistrationsCta: t("hostCancellation.manageCta"),
        footer: t("common.footer"),
      },
    });
  });

  await Promise.all([sendPlayerEmail, ...sendHostEmails]);
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

  // Le Player peut être le déclencheur (self-join) ou non (Host qui approuve) — resolveFor() arbitre.
  const playerT = await resolver.translationsFor(userId);
  const playerLocale = resolver.resolveFor(userId);
  const playerCtx = buildMomentEmailContext(moment, playerLocale);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const icsContent = !isWaitlisted
    ? generateIcs({
        uid: moment.id,
        title: moment.title,
        description: moment.description,
        startsAt: moment.startsAt,
        endsAt: moment.endsAt,
        location: playerCtx.locationText,
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
    momentDate: playerCtx.momentDate,
    momentDateMonth: playerCtx.momentDateMonth,
    momentDateDay: playerCtx.momentDateDay,
    locationText: playerCtx.locationText,
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

  const [hosts, registeredCount, defaultT] = await Promise.all([
    prismaCircleRepository.findOrganizers(moment.circleId),
    prismaRegistrationRepository.countByMomentIdAndStatus(momentId, "REGISTERED"),
    resolver.defaultTranslations(),
  ]);

  const filteredHosts = hosts.filter((host) => host.userId !== userId);
  const hostUserIds = filteredHosts.map((h) => h.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

  // registrationInfo dans la locale par défaut, réutilisé pour Slack et pour les
  // destinataires non-déclencheur (cas typique : tous les Hosts).
  const formatRegistrationInfo = (t: typeof defaultT) =>
    moment.capacity
      ? t("hostNotification.registrationInfo", { count: registeredCount, capacity: moment.capacity })
      : t("hostNotification.registrationInfoUnlimited", { count: registeredCount });
  const defaultRegistrationInfo = formatRegistrationInfo(defaultT);

  await Promise.all([
    ...filteredHosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewRegistration) return;

      const hostT = await resolver.translationsFor(host.userId);
      const hostName =
        [host.user.firstName, host.user.lastName].filter(Boolean).join(" ") ||
        host.user.email;

      const registrationInfo =
        hostT === defaultT ? defaultRegistrationInfo : formatRegistrationInfo(hostT);

      return emailService.sendHostNewRegistration({
        to: host.user.email,
        hostName,
        playerName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        circleSlug: circle.slug,
        registrationInfo,
        strings: {
          subject: hostT("hostNotification.subject", { playerName, momentTitle: moment.title }),
          heading: hostT("hostNotification.heading"),
          message: hostT("hostNotification.message", { playerName, momentTitle: moment.title }),
          manageRegistrationsCta: hostT("hostNotification.manageRegistrationsCta"),
          footer: hostT("common.footer"),
        },
      });
    }),
    notifySlackNewRegistration({
      playerName,
      momentTitle: moment.title,
      circleName: circle.name,
      registrationInfo: defaultRegistrationInfo,
      momentUrl: `${baseUrl}/m/${moment.slug}`,
    }),
  ]);
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
  const ctx = buildMomentEmailContext(moment, locale);
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
    location: ctx.locationText,
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
    momentDate: ctx.momentDate,
    momentDateMonth: ctx.momentDateMonth,
    momentDateDay: ctx.momentDateDay,
    locationText: ctx.locationText,
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

    // Resolver construit en request context (getLocale), avant les `after()`.
    const resolver = await buildEmailLocaleResolver(hostUserId);
    const { momentId, userId } = result.cancelledRegistration;

    after(async () => {
      try {
        await sendRemovedByHostEmail(momentId, userId, resolver);
      } catch (err) {
        console.error(err);
        Sentry.captureException(err);
      }
    });

    if (result.promotedRegistration) {
      const promoted = result.promotedRegistration;
      after(async () => {
        try {
          await sendPromotionEmail(promoted, resolver);
        } catch (err) {
          console.error(err);
          Sentry.captureException(err);
        }
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
  const ctx = buildMomentEmailContext(moment, resolver.resolveFor(userId));
  const playerName = getDisplayName(user.firstName, user.lastName, user.email);

  await emailService.sendRegistrationRemovedByHost({
    to: user.email,
    playerName,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate: ctx.momentDate,
    momentDateMonth: ctx.momentDateMonth,
    momentDateDay: ctx.momentDateDay,
    locationText: ctx.locationText,
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
    // Resolver construit en request context (getLocale), avant `after()`.
    const resolver = await buildEmailLocaleResolver(hostUserId);
    after(async () => {
      try {
        await sendRegistrationEmails(reg.momentId, reg.userId, reg, resolver);
      } catch (err) {
        console.error(err);
        Sentry.captureException(err);
      }
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

    // Resolver construit en request context (getLocale), avant `after()`.
    const resolver = await buildEmailLocaleResolver(hostUserId);
    after(async () => {
      try {
        await notifyPlayerRejection(result.userId, result.momentId, resolver);
      } catch (err) {
        console.error("[rejection-notification] Error:", err);
        Sentry.captureException(err);
      }
    });

    invalidateDashboardCache(result.userId);
    return result;
  });
}

// ── Notification helpers (dispatchés via after() par les actions) ────

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
