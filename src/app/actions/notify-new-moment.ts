import { prismaCircleRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { buildMomentEmailContext } from "@/lib/email/format-moment-email";
import type { EmailLocaleResolver } from "@/lib/email/email-locale";
import type { Moment } from "@/domain/models/moment";
import { sendEachLocaleGroup } from "./helpers/send-each-locale-group";

const emailService = createResendEmailService();

export async function notifyNewMoment(
  moment: Moment,
  creatorId: string,
  circleName: string,
  circleSlug: string,
  resolver: EmailLocaleResolver
): Promise<void> {
  const members = await prismaCircleRepository.findPlayersForNewMomentNotification(
    moment.circleId,
    creatorId
  );

  const allUserIds = members.map((m) => m.userId);
  // Préférences et langues lues en parallèle (le regroupement ci-dessous
  // réutilise ensuite les langues préchargées, sans nouvelle requête).
  const [prefsMap] = await Promise.all([
    prismaUserRepository.findNotificationPreferencesByIds(allUserIds),
    resolver.preload(allUserIds),
  ]);
  const optedIn = members.filter(
    (m) => prefsMap.get(m.userId)?.notifyNewMomentInCircle !== false
  );

  // Un lot par langue : chaque membre reçoit l'annonce dans la langue mémorisée
  // sur son compte.
  const groups = await resolver.groupByLocale(optedIn, (m) => m.userId);
  await sendEachLocaleGroup(groups, async ({ locale, t, items }) => {
    // Heure de l'événement avec sa mention (pas de visiteur, voir ADR-0008).
    // videoLink omis : les membres ne sont pas encore inscrits, le lien visio
    // reste sur la page événement.
    const ctx = buildMomentEmailContext({ ...moment, videoLink: null }, locale);
    await emailService.sendNewMomentToMembers({
      recipients: items.map((m) => ({ to: m.email, recipientName: m.firstName ?? m.email })),
      circleName,
      circleSlug,
      momentTitle: moment.title,
      momentSlug: moment.slug,
      momentDate: ctx.momentDate,
      momentDateMonth: ctx.momentDateMonth.toUpperCase(),
      momentDateDay: ctx.momentDateDay,
      momentLocation: ctx.locationText,
      strings: {
        subject: t("newMomentNotification.subject", { circleName }),
        preheader: t("newMomentNotification.preheader"),
        heading: t("newMomentNotification.heading", { circleName }),
        intro: t("newMomentNotification.intro"),
        dateLabel: t("common.dateLabel"),
        locationLabel: t("common.locationLabel"),
        ctaLabel: t("newMomentNotification.ctaLabel"),
        unsubscribeText: t("newMomentNotification.unsubscribeText", { circleName }),
        unsubscribeLabel: t("newMomentNotification.unsubscribeLabel"),
      },
    });
  }, "new_moment_notification");
}
