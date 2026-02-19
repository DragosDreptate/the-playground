import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteCircleDialog } from "@/components/circles/delete-circle-dialog";

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("Circle");
  const tCommon = await getTranslations("Common");

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
          <Button asChild variant="outline">
            <Link href={`/dashboard/circles/${circle.slug}/edit`}>
              {t("detail.editCircle")}
            </Link>
          </Button>
          <DeleteCircleDialog circleId={circle.id} />
        </div>
      </div>
    </div>
  );
}
