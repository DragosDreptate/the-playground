import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { CircleForm } from "@/components/circles/circle-form";
import { updateCircleAction } from "@/app/actions/circle";

export default async function EditCirclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("Circle");

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

  const boundAction = updateCircleAction.bind(null, circle.id);

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
      <CircleForm circle={circle} action={boundAction} />
    </div>
  );
}
