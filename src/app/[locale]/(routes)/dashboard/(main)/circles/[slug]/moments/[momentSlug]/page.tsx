import { notFound } from "next/navigation";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { MomentDetailView } from "@/components/moments/moment-detail-view";

export default async function MomentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;

  let circle;
  try {
    circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
  } catch (error) {
    if (error instanceof CircleNotFoundError) notFound();
    throw error;
  }

  let moment;
  try {
    moment = await getMomentBySlug(momentSlug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) notFound();
    throw error;
  }

  if (moment.circleId !== circle.id) notFound();

  const hosts = await prismaCircleRepository.findMembersByRole(circle.id, "HOST");

  const session = await auth();

  const allAttendees =
    await prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id);
  const registeredCount = allAttendees.filter(
    (r) => r.status === "REGISTERED"
  ).length;
  const waitlistedCount = allAttendees.filter(
    (r) => r.status === "WAITLISTED"
  ).length;

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/m/${moment.slug}`;

  return (
    <MomentDetailView
      variant="host"
      moment={moment}
      circle={circle}
      hosts={hosts}
      registrations={allAttendees}
      registeredCount={registeredCount}
      waitlistedCount={waitlistedCount}
      circleSlug={slug}
      momentSlug={momentSlug}
      publicUrl={publicUrl}
    />
  );
}
