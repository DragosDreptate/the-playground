import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeleteCircleDialog } from "@/components/circles/delete-circle-dialog";
import { MomentCard } from "@/components/moments/moment-card";

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("Circle");
  const tCommon = await getTranslations("Common");
  const tMoment = await getTranslations("Moment");

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

  const moments = await getCircleMoments(circle.id, {
    momentRepository: prismaMomentRepository,
    circleRepository: prismaCircleRepository,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {circle.name}
            </h1>
            <Badge
              variant={
                circle.visibility === "PUBLIC" ? "default" : "secondary"
              }
            >
              {circle.visibility === "PUBLIC"
                ? tCommon("public")
                : tCommon("private")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{circle.description}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            {t("detail.created")}{" "}
            {circle.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/circles/${circle.slug}/edit`}>
              {t("detail.editCircle")}
            </Link>
          </Button>
          <DeleteCircleDialog circleId={circle.id} />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("detail.moments")}</h2>
          <Button asChild size="sm">
            <Link href={`/dashboard/circles/${circle.slug}/moments/new`}>
              {tMoment("create.title")}
            </Link>
          </Button>
        </div>

        {moments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">
              {tMoment("empty.description")}
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href={`/dashboard/circles/${circle.slug}/moments/new`}>
                {tMoment("create.title")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {moments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                circleSlug={circle.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
