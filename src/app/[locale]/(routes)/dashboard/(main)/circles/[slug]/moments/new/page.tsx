import { notFound } from "next/navigation";
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

  return <MomentForm circleSlug={slug} action={boundAction} />;
}
