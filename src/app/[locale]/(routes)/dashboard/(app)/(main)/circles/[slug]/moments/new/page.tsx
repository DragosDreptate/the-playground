import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { MomentForm } from "@/components/moments/moment-form";
import { createMomentAction } from "@/app/actions/moment";
import { getCachedSession } from "@/lib/auth-cache";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { isActiveOrganizer } from "@/domain/models/circle";
import { redirectToPublicCircle } from "@/lib/dashboard-circle-public-redirect";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export default async function NewMomentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  // Garde d'autorisation : seul un organisateur actif de la Communauté peut
  // créer un événement. Un non-membre (ou un membre Participant) est renvoyé
  // vers la page publique, comme sur les pages de gestion sœurs.
  const session = await getCachedSession();
  if (!session?.user?.id) redirectToPublicCircle(slug);

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const membership = await circleRepo.findMembership(circle.id, session.user.id);

  if (!isActiveOrganizer(membership)) redirectToPublicCircle(slug);

  const boundAction = createMomentAction.bind(null, circle.id);

  const tDashboard = await getTranslations("Dashboard");
  const tMoment = await getTranslations("Moment");

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
        <span className="text-foreground truncate font-medium">
          {tMoment("create.title")}
        </span>
      </div>
      <MomentForm circleSlug={slug} circleName={circle.name} circleDescription={circle.description ?? undefined} circleCoverImage={circle.coverImage} stripeConnectActive={!!circle.stripeConnectAccountId} action={boundAction} />
    </div>
  );
}
