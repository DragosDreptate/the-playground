import { cache } from "react";
import { notFound } from "next/navigation";
import { measureTime } from "@/lib/perf-logger";
import { isValidSlug } from "@/lib/slug";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// Revalide toutes les 30 secondes — équilibre entre fraîcheur et performance.
// Les inscriptions en temps réel passent par les Server Actions (revalidatePath),
// donc l'ISR ici sert principalement le LCP pour les visiteurs non-connectés.
export const revalidate = 30;
import {
  prismaMomentRepository,
  prismaCircleRepository,
  prismaRegistrationRepository,
  prismaCommentRepository,
  prismaMomentAttachmentRepository,
} from "@/infrastructure/repositories";
import { getCachedSession } from "@/lib/auth-cache";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getUserRegistration } from "@/domain/usecases/get-user-registration";
import { getMomentComments } from "@/domain/usecases/get-moment-comments";
import { MomentNotFoundError } from "@/domain/errors";
import { MomentViewTracker } from "@/components/moments/moment-view-tracker";
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
  if (!moment || moment.status === "CANCELLED" || moment.status === "DRAFT") return {};

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    title: moment.title,
    description,
    alternates: {
      canonical: `${appUrl}/m/${slug}`,
      languages: {
        fr: `${appUrl}/m/${slug}`,
        en: `${appUrl}/en/m/${slug}`,
      },
    },
    openGraph: {
      title: moment.title,
      description,
      type: "website",
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
  if (!isValidSlug(slug)) notFound();

  // La transition PUBLISHED → PAST est gérée par le cron /api/cron/transition-past-moments
  // (toutes les 5 min) — plus fiable que `after()` sur Vercel serverless ("best effort").

  const moment = await measureTime("moment-page:moment", () => getMoment(slug));
  if (!moment) notFound();

  if (moment.status === "CANCELLED") notFound();

  // Auth chargée AVANT le Promise.all pour pouvoir conditionner getUserRegistration.
  // getCachedSession est cache() donc déjà résolu (appelé par le layout) — coût proche de 0.
  const session = await measureTime("moment-page:auth", () => getCachedSession());
  const isAuthenticated = !!session?.user?.id;

  // Une seule vague de queries en parallèle : aucune query ne dépend des résultats
  // des autres (toutes consomment moment.id / moment.circleId / session.user.id).
  // registeredCount est dérivé de allAttendees en JS (évite un round-trip supplémentaire).
  const [circle, hosts, existingRegistration, allAttendees, comments, upcomingCircleMoments, attachments] =
    await measureTime("moment-page:data", () =>
      Promise.all([
        getCircle(moment.circleId),
        prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
        isAuthenticated
          ? getUserRegistration(
              { momentId: moment.id, userId: session!.user!.id! },
              { registrationRepository: prismaRegistrationRepository }
            )
          : Promise.resolve(null),
        prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
        getMomentComments(
          { momentId: moment.id },
          { commentRepository: prismaCommentRepository }
        ),
        prismaMomentRepository.findUpcomingByCircleId(moment.circleId, moment.id, 3),
        prismaMomentAttachmentRepository.findByMoment(moment.id),
      ])
    );

  if (!circle) notFound();

  const isHost = isAuthenticated && hosts.some((h) => h.userId === session!.user!.id);

  const registeredCount = allAttendees.filter((r) => r.status === "REGISTERED").length;

  // Position liste d'attente : dépend de existingRegistration → séquentiel volontaire
  const waitlistPosition =
    existingRegistration?.status === "WAITLISTED" && session?.user?.id
      ? await measureTime("moment-page:waitlist", () =>
          prismaRegistrationRepository.countWaitlistPosition(moment.id, session!.user!.id!)
        )
      : 0;

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
    videoLink: moment.videoLink,
    circleName: circle.name,
    slug: moment.slug,
  };

  const eventAttendanceMode =
    moment.locationType === "ONLINE"
      ? "https://schema.org/OnlineEventAttendanceMode"
      : moment.locationType === "HYBRID"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode";

  const eventLocation = (() => {
    if (moment.locationType === "ONLINE") {
      return {
        "@type": "VirtualLocation" as const,
        ...(moment.videoLink && { url: moment.videoLink }),
      };
    }
    if (moment.locationType === "HYBRID") {
      return [
        {
          "@type": "Place" as const,
          name: moment.locationName ?? moment.locationAddress ?? undefined,
          address: moment.locationAddress ?? undefined,
        },
        {
          "@type": "VirtualLocation" as const,
          ...(moment.videoLink && { url: moment.videoLink }),
        },
      ];
    }
    return {
      "@type": "Place" as const,
      name: moment.locationName ?? moment.locationAddress ?? undefined,
      address: moment.locationAddress ?? undefined,
    };
  })();

  const offerAvailability =
    moment.capacity !== null && registeredCount >= moment.capacity
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock";

  const jsonLd =
    moment.status === "PUBLISHED" || moment.status === "PAST"
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: moment.title,
          description: moment.description,
          image: `${appUrl}/m/${moment.slug}/opengraph-image`,
          startDate: moment.startsAt.toISOString(),
          ...(moment.endsAt && { endDate: moment.endsAt.toISOString() }),
          location: eventLocation,
          organizer: {
            "@type": "Organization",
            name: circle.name,
            url: `${appUrl}/circles/${circle.slug}`,
          },
          url: `${appUrl}/m/${moment.slug}`,
          eventStatus:
            moment.status === "PAST"
              ? "https://schema.org/EventCompleted"
              : "https://schema.org/EventScheduled",
          eventAttendanceMode,
          ...(moment.capacity !== null && {
            maximumAttendeeCapacity: moment.capacity,
            remainingAttendeeCapacity: Math.max(0, moment.capacity - registeredCount),
          }),
          offers: {
            "@type": "Offer",
            price: (moment.price / 100).toFixed(2),
            priceCurrency: moment.currency.toUpperCase(),
            availability: offerAvailability,
            url: `${appUrl}/m/${moment.slug}`,
          },
        }
      : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <MomentViewTracker
        momentId={moment.id}
        momentSlug={moment.slug}
        circleId={moment.circleId}
        circleName={circle.name}
        status={moment.status}
      />
      <MomentDetailView
        variant="public"
        moment={moment}
        circle={circle}
        hosts={hosts}
        registrations={allAttendees}
        registeredCount={registeredCount}
        waitlistedCount={waitlistedCount}
        comments={comments}
        attachments={attachments}
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
        upcomingCircleMoments={upcomingCircleMoments}
      />
    </main>
  );
}
