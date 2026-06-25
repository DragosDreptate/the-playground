import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaMomentAttachmentRepository,
} from "@/infrastructure/repositories";
import { getCachedSession } from "@/lib/auth-cache";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { isActiveOrganizer } from "@/domain/models/circle";
import { redirectToPublicMoment } from "@/lib/dashboard-event-public-redirect";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { MomentForm } from "@/components/moments/moment-form";
import { updateMomentAction } from "@/app/actions/moment";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export default async function EditMomentPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;

  let circle;
  try {
    circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
  } catch (error) {
    if (error instanceof CircleNotFoundError) {
      notFound();
    }
    throw error;
  }

  let moment;
  try {
    moment = await getMomentBySlug(momentSlug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (moment.circleId !== circle.id) redirectToPublicMoment(moment.slug);

  const session = await getCachedSession();
  if (!session?.user?.id) redirectToPublicMoment(moment.slug);

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

  // Price lock excludes the host auto-registration (which doesn't count as paid).
  const [membership, paymentSummary, initialAttachments] = await Promise.all([
    circleRepo.findMembership(circle.id, session.user.id),
    moment.price > 0
      ? prismaRegistrationRepository.getPaymentSummary(moment.id)
      : Promise.resolve(null),
    prismaMomentAttachmentRepository.findByMoment(moment.id),
  ]);

  if (!isActiveOrganizer(membership)) redirectToPublicMoment(moment.slug);

  // Un événement annulé n'est pas modifiable (l'UI ne propose que Supprimer) :
  // on ferme l'accès direct à l'URL d'édition.
  if (moment.status === "CANCELLED") redirectToPublicMoment(moment.slug);

  const boundAction = updateMomentAction.bind(null, moment.id);
  const priceLocked = (paymentSummary?.paidCount ?? 0) > 0;

  const tDashboard = await getTranslations("Dashboard");
  const tCommon = await getTranslations("Common");

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          {tDashboard("title")}
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/dashboard/circles/${slug}`}
          className="hover:text-foreground transition-colors"
        >
          {circle.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/dashboard/circles/${slug}/moments/${momentSlug}`}
          className="hover:text-foreground transition-colors"
        >
          {moment.title}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate font-medium">
          {tCommon("edit")}
        </span>
      </div>
      <MomentForm moment={moment} circleSlug={slug} circleName={circle.name} circleDescription={circle.description ?? undefined} circleCoverImage={circle.coverImage} stripeConnectActive={!!circle.stripeConnectAccountId} priceLocked={priceLocked} initialAttachments={initialAttachments} action={boundAction} />
    </div>
  );
}
