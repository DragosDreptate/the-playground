import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

// Deduplicate DB calls between generateMetadata and the page
const getMoment = cache(async (slug: string) => {
  try {
    return await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) return null;
    throw error;
  }
});

const getCircle = cache(async (circleId: string) => {
  return prismaCircleRepository.findById(circleId);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const moment = await getMoment(slug);
  if (!moment || moment.status === "CANCELLED") return {};

  const circle = await getCircle(moment.circleId);
  const t = await getTranslations({ locale, namespace: "Moment" });
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const date = moment.startsAt.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = moment.startsAt.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const location =
    moment.locationType === "ONLINE"
      ? t("form.locationOnline")
      : moment.locationName ?? moment.locationAddress ?? "";
  const connector = locale === "fr" ? " à " : " at ";
  const description = `${date}${connector}${time} · ${location}${circle ? ` — ${circle.name}` : ""}`;

  return {
    title: moment.title,
    description,
    openGraph: {
      title: moment.title,
      description,
      type: "article",
    },
    twitter: {
      title: moment.title,
      description,
    },
  };
}

export default async function PublicMomentPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  // Transition PUBLISHED → PAST for ended Moments
  await prismaMomentRepository.transitionPastMoments();

  const moment = await getMoment(slug);
  if (!moment) notFound();

  if (moment.status === "CANCELLED") notFound();

  const [circle, hosts] = await Promise.all([
    getCircle(moment.circleId),
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

  const [registeredCount, allAttendees, comments, waitlistPosition] = await Promise.all([
    prismaRegistrationRepository.countByMomentIdAndStatus(
      moment.id,
      "REGISTERED"
    ),
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
    getMomentComments(
      { momentId: moment.id },
      { commentRepository: prismaCommentRepository }
    ),
    existingRegistration?.status === "WAITLISTED" && session?.user?.id
      ? prismaRegistrationRepository.countWaitlistPosition(moment.id, session.user.id)
      : Promise.resolve(0),
  ]);

  const isFull =
    moment.capacity !== null && registeredCount >= moment.capacity;
  const spotsRemaining =
    moment.capacity !== null ? moment.capacity - registeredCount : null;
  const signInUrl = `/${locale}/auth/sign-in?callbackUrl=/${locale}/m/${slug}`;
  const waitlistedCount = allAttendees.filter(
    (r) => r.status === "WAITLISTED"
  ).length;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const calendarData = {
    title: moment.title,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    locationType: moment.locationType,
    locationName: moment.locationName,
    locationAddress: moment.locationAddress,
    circleName: circle.name,
    slug: moment.slug,
  };

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
        calendarData={calendarData}
        appUrl={appUrl}
        waitlistPosition={waitlistPosition}
      />
    </main>
  );
}
