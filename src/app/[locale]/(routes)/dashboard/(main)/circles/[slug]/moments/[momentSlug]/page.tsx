import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeleteMomentDialog } from "@/components/moments/delete-moment-dialog";

const statusVariant = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  CANCELLED: "destructive",
  PAST: "outline",
} as const;

export default async function MomentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;
  const t = await getTranslations("Moment");
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {moment.title}
            </h1>
            <Badge variant={statusVariant[moment.status]}>
              {t(`status.${moment.status.toLowerCase()}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{moment.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline">
            <Link
              href={`/dashboard/circles/${slug}/moments/${momentSlug}/edit`}
            >
              {tCommon("edit")}
            </Link>
          </Button>
          <DeleteMomentDialog momentId={moment.id} circleSlug={slug} />
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">{t("detail.when")}</h3>
          <p className="text-muted-foreground text-sm">
            {moment.startsAt.toLocaleString()}
            {moment.endsAt && ` — ${moment.endsAt.toLocaleString()}`}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium">{t("detail.where")}</h3>
          <p className="text-muted-foreground text-sm">
            {t(
              `form.location${moment.locationType === "IN_PERSON" ? "InPerson" : moment.locationType === "ONLINE" ? "Online" : "Hybrid"}`
            )}
            {moment.locationName && ` — ${moment.locationName}`}
          </p>
          {moment.locationAddress && (
            <p className="text-muted-foreground text-xs">
              {moment.locationAddress}
            </p>
          )}
          {moment.videoLink && (
            <a
              href={moment.videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs hover:underline"
            >
              {moment.videoLink}
            </a>
          )}
        </div>
        {moment.capacity && (
          <div>
            <h3 className="text-sm font-medium">{t("detail.capacity")}</h3>
            <p className="text-muted-foreground text-sm">{moment.capacity}</p>
          </div>
        )}
        {moment.price > 0 && (
          <div>
            <h3 className="text-sm font-medium">{t("detail.price")}</h3>
            <p className="text-muted-foreground text-sm">
              {(moment.price / 100).toFixed(2)} {moment.currency}
            </p>
          </div>
        )}
      </div>

      <Separator />

      <p className="text-muted-foreground text-xs">
        {t("detail.created")} {moment.createdAt.toLocaleDateString()}
      </p>

      <div className="rounded-md border p-3">
        <h3 className="text-sm font-medium">{t("detail.shareableLink")}</h3>
        <p className="text-muted-foreground font-mono text-sm">
          /m/{moment.slug}
        </p>
      </div>
    </div>
  );
}
