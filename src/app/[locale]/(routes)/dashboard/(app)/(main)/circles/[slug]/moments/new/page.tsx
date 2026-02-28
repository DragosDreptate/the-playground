import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { MomentForm } from "@/components/moments/moment-form";
import { createMomentAction } from "@/app/actions/moment";
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
      <MomentForm circleSlug={slug} circleName={circle.name} circleDescription={circle.description ?? undefined} circleCoverImage={circle.coverImage} action={boundAction} />
    </div>
  );
}
