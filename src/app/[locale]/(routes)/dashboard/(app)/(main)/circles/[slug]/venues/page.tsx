import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaCircleVenueRepository,
} from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { listCircleVenues } from "@/domain/usecases/list-circle-venues";
import { CircleNotFoundError } from "@/domain/errors";
import { CircleVenueManager } from "@/components/circles/circle-venue-manager";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export default async function CircleVenuesPage({
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

  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);
  const venues = await listCircleVenues(
    { circleId: circle.id, userId: session.user.id },
    {
      circleRepository: circleRepo,
      circleVenueRepository: prismaCircleVenueRepository,
    }
  );

  const tDashboard = await getTranslations("Dashboard");
  const tVenues = await getTranslations("Circle.venues");

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
          {tVenues("title")}
        </span>
      </div>

      <CircleVenueManager
        circleId={circle.id}
        circleSlug={circle.slug}
        venues={venues}
      />
    </div>
  );
}
