import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
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
    notFound();
  }

  const boundAction = updateMomentAction.bind(null, moment.id);

  // Check if price is locked (paid event with registrations)
  let priceLocked = false;
  if (moment.price > 0) {
    const registeredCount = await prismaRegistrationRepository.countByMomentIdAndStatus(moment.id, "REGISTERED");
    const checkedInCount = await prismaRegistrationRepository.countByMomentIdAndStatus(moment.id, "CHECKED_IN");
    priceLocked = registeredCount + checkedInCount > 0;
  }

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
      <MomentForm moment={moment} circleSlug={slug} circleName={circle.name} circleDescription={circle.description ?? undefined} circleCoverImage={circle.coverImage} stripeConnectActive={!!circle.stripeConnectAccountId} priceLocked={priceLocked} action={boundAction} />
    </div>
  );
}
