import { notFound, redirect } from "next/navigation";
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

  if (moment.circleId !== circle.id) {
    redirect(`/m/${moment.slug}`);
  }

  // Only an active Organizer of the Circle may edit. Anyone else (member,
  // attendee, or unrelated user) is bounced to the public event page —
  // same UX as the detail view, no dead-end 404 on a shared dashboard link.
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect(`/m/${moment.slug}`);
  }
  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const membership = await circleRepo.findMembership(circle.id, session.user.id);
  if (!isActiveOrganizer(membership)) {
    redirect(`/m/${moment.slug}`);
  }

  const boundAction = updateMomentAction.bind(null, moment.id);

  // Check if price is locked (paid event with paid registrations — excludes host auto-registration)
  let priceLocked = false;
  if (moment.price > 0) {
    const { paidCount } = await prismaRegistrationRepository.getPaymentSummary(moment.id);
    priceLocked = paidCount > 0;
  }

  const initialAttachments = await prismaMomentAttachmentRepository.findByMoment(moment.id);

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
