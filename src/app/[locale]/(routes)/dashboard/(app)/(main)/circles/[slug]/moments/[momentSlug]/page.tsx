import { notFound } from "next/navigation";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaCommentRepository,
} from "@/infrastructure/repositories";
import { getCachedSession } from "@/lib/auth-cache";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getMomentComments } from "@/domain/usecases/get-moment-comments";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { MomentDetailView } from "@/components/moments/moment-detail-view";
import { resolveCircleRepository } from "@/lib/admin-host-mode";

export default async function MomentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;

  const session = await getCachedSession();
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

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

  // Parallélise membership + hosts + registration (indépendants)
  const [membership, hosts, userRegistration] = await Promise.all([
    circleRepo.findMembership(circle.id, session.user.id),
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
    prismaRegistrationRepository.findByMomentAndUser(moment.id, session.user.id),
  ]);

  // Accès autorisé si : membre ACTIVE du Circle OU inscrit à l'événement
  const hasActiveMembership = membership?.status === "ACTIVE";
  const hasActiveRegistration = userRegistration && userRegistration.status !== "CANCELLED" && userRegistration.status !== "REJECTED";
  if (!hasActiveMembership && !hasActiveRegistration) notFound();

  const isHost = hasActiveMembership && membership!.role === "HOST";

  const [allAttendees, comments, pendingRegistrations] = await Promise.all([
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
    getMomentComments(
      { momentId: moment.id },
      { commentRepository: prismaCommentRepository }
    ),
    isHost ? prismaRegistrationRepository.findPendingApprovals(moment.id) : Promise.resolve([]),
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
          videoLink: moment.videoLink,
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
        videoLink: moment.videoLink,
        circleName: circle.name,
        slug: moment.slug,
      }}
      appUrl={appUrl}
      pendingRegistrations={pendingRegistrations}
    />
  );
}
