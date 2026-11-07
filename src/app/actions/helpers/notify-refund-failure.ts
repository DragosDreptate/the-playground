import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { getDisplayName } from "@/lib/display-name";
import type { EmailLocaleResolver } from "@/lib/email/email-locale";

const emailService = createResendEmailService();

/**
 * Prévient le propriétaire de la Communauté, seul à accéder au compte Stripe, que
 * des remboursements n'ont pas abouti. Un seul email par événement, même pour une
 * annulation groupée. Alerte de service : elle ne dépend pas des préférences de
 * notification.
 */
export async function notifyRefundFailure(
  momentId: string,
  participantUserIds: string[],
  resolver: EmailLocaleResolver
): Promise<void> {
  const [moment, participants] = await Promise.all([
    prismaMomentRepository.findById(momentId),
    Promise.all(participantUserIds.map((id) => prismaUserRepository.findById(id))),
  ]);
  if (!moment) return;

  const [circle, owners] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
  ]);
  if (!circle) return;

  const names = participants
    .filter((user) => user !== null)
    .map((user) => getDisplayName(user.firstName, user.lastName, user.email))
    .join(", ");
  const count = participantUserIds.length;

  await resolver.preload(owners.map((owner) => owner.userId));
  await Promise.all(
    owners.map(async (owner) => {
      const t = await resolver.translationsFor(owner.userId);
      return emailService.sendHostRefundFailed({
        to: owner.user.email,
        circleSlug: circle.slug,
        strings: {
          subject: t("hostRefundFailed.subject", { momentTitle: moment.title }),
          heading: t("hostRefundFailed.heading"),
          message: t("hostRefundFailed.message", { count, momentTitle: moment.title }),
          participants: t("hostRefundFailed.participants", { names }),
          action: t("hostRefundFailed.action"),
          ctaLabel: t("hostRefundFailed.ctaLabel"),
          footer: t("common.footer"),
        },
      });
    })
  );
}
