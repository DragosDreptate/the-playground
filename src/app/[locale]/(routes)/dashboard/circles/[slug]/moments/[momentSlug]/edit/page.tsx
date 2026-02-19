import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { MomentForm } from "@/components/moments/moment-form";
import { updateMomentAction } from "@/app/actions/moment";

export default async function EditMomentPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;
  const t = await getTranslations("Moment");

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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("edit.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("edit.description")}
        </p>
      </div>
      <MomentForm moment={moment} circleSlug={slug} action={boundAction} />
    </div>
  );
}
