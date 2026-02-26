import { notFound } from "next/navigation";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaCommentRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getMomentComments } from "@/domain/usecases/get-moment-comments";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { MomentDetailView } from "@/components/moments/moment-detail-view";

export default async function MomentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;

  const session = await auth();
  if (!session?.user?.id) notFound();

  // Parallélise Circle + Moment (les deux dépendent uniquement du slug)
  let circle;
  let moment;
  try {
    [circle, moment] = await Promise.all([
      getCircleBySlug(slug, { circleRepository: prismaCircleRepository }),
      getMomentBySlug(momentSlug, { momentRepository: prismaMomentRepository }),
    ]);
  } catch (error) {
    if (error instanceof CircleNotFoundError || error instanceof MomentNotFoundError) notFound();
    throw error;
  }

  if (moment.circleId !== circle.id) notFound();

  // Parallélise membership + hosts (dépendent tous deux de circle.id)
  const [membership, hosts] = await Promise.all([
    prismaCircleRepository.findMembership(circle.id, session.user.id),
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
  ]);

  if (!membership) notFound();

  const isHost = membership.role === "HOST";

  const [allAttendees, comments] = await Promise.all([
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
    getMomentComments(
      { momentId: moment.id },
      { commentRepository: prismaCommentRepository }
    ),
  ]);
  const registeredCount = allAttendees.filter(
    (r) => r.status === "REGISTERED"
  ).length;
  const waitlistedCount = allAttendees.filter(
    (r) => r.status === "WAITLISTED"
  ).length;

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/m/${moment.slug}`;

  if (!isHost) {
    const [existingRegistration, upcomingCircleMoments] = await Promise.all([
      prismaRegistrationRepository.findByMomentAndUser(moment.id, session.user.id),
      prismaMomentRepository.findUpcomingByCircleId(moment.circleId, moment.id, 3),
    ]);
    const waitlistPosition =
      existingRegistration?.status === "WAITLISTED"
        ? await prismaRegistrationRepository.countWaitlistPosition(
            moment.id,
            session.user.id
          )
        : 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return (
      <MomentDetailView
        variant="public"
        moment={moment}
        circle={circle}
        hosts={hosts}
        registrations={allAttendees}
        registeredCount={registeredCount}
        waitlistedCount={waitlistedCount}
        comments={comments}
        currentUserId={session.user.id}
        isAuthenticated={true}
        isHost={false}
        existingRegistration={existingRegistration}
        signInUrl=""
        isFull={moment.capacity !== null && registeredCount >= moment.capacity}
        spotsRemaining={
          moment.capacity !== null ? moment.capacity - registeredCount : null
        }
        calendarData={{
          title: moment.title,
          startsAt: moment.startsAt,
          endsAt: moment.endsAt,
          locationType: moment.locationType,
          locationName: moment.locationName,
          locationAddress: moment.locationAddress,
          circleName: circle.name,
          slug: moment.slug,
        }}
        appUrl={appUrl}
        waitlistPosition={waitlistPosition}
        upcomingCircleMoments={upcomingCircleMoments}
      />
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <MomentDetailView
      variant="host"
      moment={moment}
      circle={circle}
      hosts={hosts}
      registrations={allAttendees}
      registeredCount={registeredCount}
      waitlistedCount={waitlistedCount}
      comments={comments}
      currentUserId={session.user.id}
      circleSlug={slug}
      momentSlug={momentSlug}
      publicUrl={publicUrl}
      calendarData={{
        title: moment.title,
        startsAt: moment.startsAt,
        endsAt: moment.endsAt,
        locationType: moment.locationType,
        locationName: moment.locationName,
        locationAddress: moment.locationAddress,
        circleName: circle.name,
        slug: moment.slug,
      }}
      appUrl={appUrl}
    />
  );
}
