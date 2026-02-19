import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { MomentNotFoundError } from "@/domain/errors";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default async function PublicMomentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("Moment");

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (moment.status !== "PUBLISHED") {
    notFound();
  }

  const circle = await prismaCircleRepository.findById(moment.circleId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{moment.title}</h1>
          {circle && (
            <p className="text-muted-foreground mt-1 text-sm">
              {t("public.hostedBy")} {circle.name}
            </p>
          )}
        </div>

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
              {moment.locationName ??
                t(
                  `form.location${moment.locationType === "IN_PERSON" ? "InPerson" : moment.locationType === "ONLINE" ? "Online" : "Hybrid"}`
                )}
            </p>
            {moment.locationAddress && (
              <p className="text-muted-foreground text-xs">
                {moment.locationAddress}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <p className="whitespace-pre-wrap">{moment.description}</p>
        </div>

        <Separator />

        <div className="flex gap-4">
          {moment.price > 0 ? (
            <Badge variant="default">
              {(moment.price / 100).toFixed(2)} {moment.currency}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("public.free")}</Badge>
          )}
          {moment.capacity && (
            <Badge variant="outline">
              {t("public.spotsAvailable", { count: moment.capacity })}
            </Badge>
          )}
        </div>

        <Button size="lg" className="w-full">
          {moment.price > 0
            ? t("public.registerPaid", {
                price: (moment.price / 100).toFixed(2),
                currency: moment.currency,
              })
            : t("public.registerFree")}
        </Button>
      </div>
    </main>
  );
}
