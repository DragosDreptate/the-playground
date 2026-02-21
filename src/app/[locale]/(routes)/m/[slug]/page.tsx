import { notFound } from "next/navigation";
import {
  prismaMomentRepository,
  prismaCircleRepository,
  prismaRegistrationRepository,
  prismaCommentRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getUserRegistration } from "@/domain/usecases/get-user-registration";
import { getMomentComments } from "@/domain/usecases/get-moment-comments";
import { MomentNotFoundError } from "@/domain/errors";
import { MomentDetailView } from "@/components/moments/moment-detail-view";

export default async function PublicMomentPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  // Transition PUBLISHED → PAST for ended Moments
  await prismaMomentRepository.transitionPastMoments();

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) notFound();
    throw error;
  }

  if (moment.status === "CANCELLED") notFound();

  const [circle, hosts] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
  ]);

  if (!circle) notFound();

  const session = await auth();
  const isAuthenticated = !!session?.user?.id;
  const isHost = isAuthenticated && hosts.some((h) => h.userId === session!.user!.id);

  let existingRegistration = null;
  if (isAuthenticated) {
    existingRegistration = await getUserRegistration(
      { momentId: moment.id, userId: session!.user!.id! },
      { registrationRepository: prismaRegistrationRepository }
    );
  }

  const [registeredCount, allAttendees, comments] = await Promise.all([
    prismaRegistrationRepository.countByMomentIdAndStatus(
      moment.id,
      "REGISTERED"
    ),
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
    getMomentComments(
      { momentId: moment.id },
      { commentRepository: prismaCommentRepository }
    ),
  ]);

  const isFull =
    moment.capacity !== null && registeredCount >= moment.capacity;
  const spotsRemaining =
    moment.capacity !== null ? moment.capacity - registeredCount : null;
  const signInUrl = `/${locale}/auth/sign-in?callbackUrl=/${locale}/m/${slug}`;
  const waitlistedCount = allAttendees.filter(
    (r) => r.status === "WAITLISTED"
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <MomentDetailView
        variant="public"
        moment={moment}
        circle={circle}
        hosts={hosts}
        registrations={allAttendees}
        registeredCount={registeredCount}
        waitlistedCount={waitlistedCount}
        comments={comments}
        currentUserId={session?.user?.id ?? null}
        isAuthenticated={isAuthenticated}
        isHost={isHost}
        existingRegistration={existingRegistration}
        signInUrl={signInUrl}
        isFull={isFull}
        spotsRemaining={spotsRemaining}
      />
    </main>
  );
}
