"use server";

import { prismaCircleRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";

const emailService = createResendEmailService();

export async function notifyHostNewCircleMember(
  circleId: string,
  circleSlug: string,
  circleName: string,
  newMemberUserId: string,
  newMemberName: string,
  formatMemberCount: (count: number) => string,
  strings: {
    subject: string;
    heading: string;
    message: string;
    manageMembersCta: string;
    footer: string;
  }
): Promise<void> {
  const [hosts, memberCount] = await Promise.all([
    prismaCircleRepository.findOrganizers(circleId),
    prismaCircleRepository.countMembers(circleId),
  ]);

  const filteredHosts = hosts.filter((host) => host.userId !== newMemberUserId);
  const hostUserIds = filteredHosts.map((h) => h.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(hostUserIds);

  const results = await Promise.allSettled(
    filteredHosts.map(async (host) => {
      const prefs = prefsMap.get(host.userId);
      if (!prefs?.notifyNewRegistration) return;

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
          ...strings,
          memberCountInfo: formatMemberCount(memberCount),
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
