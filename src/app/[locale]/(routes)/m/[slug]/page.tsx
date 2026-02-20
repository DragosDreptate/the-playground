import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaMomentRepository,
  prismaCircleRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getUserRegistration } from "@/domain/usecases/get-user-registration";
import { MomentNotFoundError } from "@/domain/errors";
import { RegistrationButton } from "@/components/moments/registration-button";
import { getMomentGradient } from "@/lib/gradient";
import { CalendarIcon, MapPin, Globe, Users, ImageIcon } from "lucide-react";

function formatDateRange(startsAt: Date, endsAt: Date | null): string {
  const dateStr = startsAt.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startTime = startsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endsAt) return `${dateStr} · ${startTime}`;
  const endTime = endsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} · ${startTime} – ${endTime}`;
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName)
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return email[0].toUpperCase();
}

export default async function PublicMomentPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const t = await getTranslations("Moment");

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) notFound();
    throw error;
  }

  if (moment.status !== "PUBLISHED") notFound();

  const circle = await prismaCircleRepository.findById(moment.circleId);

  const session = await auth();
  const isAuthenticated = !!session?.user?.id;

  let existingRegistration = null;
  if (isAuthenticated) {
    existingRegistration = await getUserRegistration(
      { momentId: moment.id, userId: session!.user!.id! },
      { registrationRepository: prismaRegistrationRepository }
    );
  }

  const [registeredCount, allAttendees] = await Promise.all([
    prismaRegistrationRepository.countByMomentIdAndStatus(
      moment.id,
      "REGISTERED"
    ),
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
  ]);

  const isFull =
    moment.capacity !== null && registeredCount >= moment.capacity;
  const spotsRemaining =
    moment.capacity !== null ? moment.capacity - registeredCount : null;
  const signInUrl = `/${locale}/auth/sign-in?callbackUrl=/${locale}/m/${slug}`;

  const gradient = getMomentGradient(moment.title);
  const circleGradient = circle ? getMomentGradient(circle.name) : gradient;

  const locationLabel =
    moment.locationType === "ONLINE"
      ? t("form.locationOnline")
      : moment.locationType === "HYBRID"
        ? t("form.locationHybrid")
        : moment.locationName ?? t("form.locationInPerson");

  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

  const displayedAttendees = allAttendees
    .filter((r) => r.status === "REGISTERED")
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Cover with glow blur */}
      <div className="relative mb-8">
        <div
          className="absolute inset-x-8 bottom-0 h-20 opacity-40"
          style={{ background: gradient, filter: "blur(32px)" }}
        />
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ background: gradient, aspectRatio: "2 / 1" }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <ImageIcon className="size-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left column: hosted by + title + description */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {circle && (
            <div className="flex items-center gap-2">
              <div
                className="size-5 shrink-0 rounded-full"
                style={{ background: circleGradient }}
              />
              <span className="text-muted-foreground text-sm">
                {t("public.hostedBy")}{" "}
                <span className="text-foreground font-medium">
                  {circle.name}
                </span>
              </span>
            </div>
          )}

          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {moment.title}
          </h1>

          {moment.description && (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {moment.description}
            </p>
          )}
        </div>

        {/* Right column: sticky CTA + info cards */}
        <div className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0 lg:sticky lg:top-6">
          {/* CTA + social proof */}
          <div className="border-border bg-card rounded-xl border p-4">
            <RegistrationButton
              momentId={moment.id}
              price={moment.price}
              isAuthenticated={isAuthenticated}
              existingRegistration={existingRegistration}
              signInUrl={signInUrl}
              isFull={isFull}
              spotsRemaining={spotsRemaining}
            />
            {registeredCount > 0 && (
              <div className="border-border mt-4 flex items-center gap-2.5 border-t pt-4">
                <div className="flex -space-x-1.5">
                  {displayedAttendees.map((r) => (
                    <div
                      key={r.id}
                      className="border-card flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold text-white"
                      style={{
                        background: getMomentGradient(r.user.email),
                      }}
                      title={r.user.firstName ?? r.user.email}
                    >
                      {getInitials(
                        r.user.firstName,
                        r.user.lastName,
                        r.user.email
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-muted-foreground text-sm">
                  {t("public.attendeesCount", { count: registeredCount })}
                </span>
              </div>
            )}
          </div>

          {/* When */}
          <div className="border-border bg-card flex items-start gap-3 rounded-xl border p-4">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <CalendarIcon className="text-primary size-4" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-50">
                {t("detail.when")}
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {formatDateRange(moment.startsAt, moment.endsAt)}
              </p>
            </div>
          </div>

          {/* Where */}
          <div className="border-border bg-card flex items-start gap-3 rounded-xl border p-4">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <LocationIcon className="text-primary size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide opacity-50">
                {t("detail.where")}
              </p>
              <p className="mt-0.5 text-sm font-medium">{locationLabel}</p>
              {moment.locationAddress && (
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {moment.locationAddress}
                </p>
              )}
              {moment.videoLink && (
                <a
                  href={moment.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-0.5 block truncate text-xs hover:underline"
                >
                  {moment.videoLink}
                </a>
              )}
            </div>
          </div>

          {/* Capacity + price */}
          {(moment.capacity || moment.price > 0) && (
            <div className="border-border bg-card flex items-start gap-3 rounded-xl border p-4">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Users className="text-primary size-4" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-50">
                  {t("detail.capacity")} / {t("detail.price")}
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  {moment.capacity
                    ? `${moment.capacity} places`
                    : "Illimitée"}
                  {" · "}
                  {moment.price > 0
                    ? `${(moment.price / 100).toFixed(2)} ${moment.currency}`
                    : t("public.free")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Circle section */}
      {circle && (
        <div className="border-border bg-card mt-12 rounded-2xl border p-6">
          <div className="flex items-start gap-4">
            <div
              className="size-12 shrink-0 rounded-xl"
              style={{ background: circleGradient }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{circle.name}</p>
              {circle.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {circle.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
