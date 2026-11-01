import { prismaCircleRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import type { EmailLocaleResolver } from "@/lib/email/email-locale";

const emailService = createResendEmailService();

export async function notifyHostNewCircleMember(
  circleId: string,
  circleSlug: string,
  circleName: string,
  newMemberUserId: string,
  newMemberName: string,
  memberCount: number,
  resolver: EmailLocaleResolver
): Promise<void> {
  const hosts = await prismaCircleRepository.findOrganizers(circleId);

  const filteredHosts = hosts.filter((host) => host.userId !== newMemberUserId);
  const hostUserIds = filteredHosts.map((h) => h.userId);
  // Préférences et langues lues en parallèle, en une requête chacune : les
  // `translationsFor` ci-dessous réutilisent les langues préchargées.
  const [prefsMap] = await Promise.all([
    prismaUserRepository.findNotificationPreferencesByIds(hostUserIds),
    resolver.preload(hostUserIds),
  ]);

  const results = await Promise.allSettled(
    filteredHosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewRegistration) return;

      // Chaque Organisateur reçoit l'email dans la langue mémorisée sur son compte.
      const t = await resolver.translationsFor(host.userId);
      const hostName =
        [host.user.firstName, host.user.lastName].filter(Boolean).join(" ") ||
        host.user.email;

      return emailService.sendHostNewCircleMember({
        to: host.user.email,
        hostName,
        playerName: newMemberName,
        circleName,
        circleSlug,
        memberCount,
        strings: {
          subject: t("hostCircleMemberNotification.subject", {
            playerName: newMemberName,
            circleName,
          }),
          heading: t("hostCircleMemberNotification.heading"),
          message: t("hostCircleMemberNotification.message", {
            playerName: newMemberName,
            circleName,
          }),
          manageMembersCta: t("hostCircleMemberNotification.manageMembersCta"),
          footer: t("common.footer"),
          memberCountInfo: t("hostCircleMemberNotification.memberCountInfo", {
            count: memberCount,
          }),
        },
      });
    })
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[notifyHostNewCircleMember] Échec envoi email host ${filteredHosts[i]?.user.email}:`,
        result.reason
      );
    }
  });
}
