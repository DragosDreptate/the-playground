import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { MomentForm } from "@/components/moments/moment-form";
import { createMomentAction } from "@/app/actions/moment";

export default async function NewMomentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  const boundAction = createMomentAction.bind(null, circle.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("create.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("create.description")}
        </p>
      </div>
      <MomentForm circleSlug={slug} action={boundAction} />
    </div>
  );
}
