import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaMomentRepository,
  prismaCircleRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { auth } from "@/infrastructure/auth/auth.config";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getUserRegistration } from "@/domain/usecases/get-user-registration";
import { MomentNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { RegistrationButton } from "@/components/moments/registration-button";
import { RegistrationsList } from "@/components/moments/registrations-list";
import { getMomentGradient } from "@/lib/gradient";
import {
  CalendarIcon,
  MapPin,
  Globe,
  ImageIcon,
  ExternalLink,
} from "lucide-react";

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

function formatHostNames(hosts: CircleMemberWithUser[]): string {
  return hosts
    .map((h) => {
      if (h.user.firstName && h.user.lastName)
        return `${h.user.firstName} ${h.user.lastName}`;
      if (h.user.firstName) return h.user.firstName;
      return h.user.email;
    })
    .join(", ");
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

  const [circle, hosts] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
  ]);

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

  const mapsUrl =
    moment.locationAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(moment.locationAddress)}`
      : null;

  const waitlistedCount = allAttendees.filter(
    (r) => r.status === "WAITLISTED"
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/*
        Layout : colonne gauche sticky (cover carré + host card) /
                 colonne droite large (tout le contenu)
        Mobile  : droite en premier (order-1), gauche en second (order-2)
      */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + circle info ──────────────────── */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">

          {/* Cover — carré, glow blur en dessous comme Luma */}
          <div className="relative">
            <div
              className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
              style={{ background: gradient }}
            />
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ background: gradient, aspectRatio: "1 / 1" }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <ImageIcon className="size-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Circle — cliquable vers la page Circle */}
          {circle && (
            <Link
              href={`/dashboard/circles/${circle.slug}`}
              className="group flex items-start gap-3 px-1"
            >
              <div
                className="mt-0.5 size-9 shrink-0 rounded-lg"
                style={{ background: circleGradient }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug group-hover:underline">
                  {circle.name}
                </p>
                {circle.description && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-3 text-xs leading-relaxed">
                    {circle.description}
                  </p>
                )}
              </div>
            </Link>
          )}
        </div>

        {/* ─── RIGHT column : tout le contenu ─────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* Hosted by — noms des Hosts */}
          {hosts.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {t("public.hostedBy")}{" "}
              <span className="text-foreground font-medium">
                {formatHostNames(hosts)}
              </span>
            </p>
          )}

          {/* Titre — typographie inspirée du formulaire de création */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {moment.title}
          </h1>

          {/* À propos — texte direct, pas de card lourde */}
          {moment.description && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t("public.about")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {moment.description}
              </p>
            </div>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Quand & Où — lignes simples icon + texte, sans card border (style Luma) */}
          <div className="flex flex-col gap-3">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <CalendarIcon className="text-primary size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.when")}</p>
                <p className="text-sm font-medium">
                  {formatDateRange(moment.startsAt, moment.endsAt)}
                </p>
              </div>
            </div>

            {/* Lieu */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <LocationIcon className="text-primary size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("detail.where")}</p>
                <p className="text-sm font-medium">{locationLabel}</p>
                {moment.videoLink && (
                  <a
                    href={moment.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary mt-1 block truncate text-xs hover:underline"
                  >
                    {moment.videoLink}
                  </a>
                )}
              </div>
            </div>

            {/* Carte — seulement si adresse physique */}
            {moment.locationAddress && (
              <div className="border-border overflow-hidden rounded-xl border">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(moment.locationAddress)}&output=embed&z=15`}
                  className="h-44 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={moment.locationAddress}
                />
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    {moment.locationName && (
                      <p className="truncate text-sm font-medium">
                        {moment.locationName}
                      </p>
                    )}
                    <p className="text-muted-foreground truncate text-xs">
                      {moment.locationAddress}
                    </p>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary ml-3 inline-flex shrink-0 items-center gap-1 text-xs hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {t("public.viewOnMap")}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Inscription */}
          <div className="border-border bg-card rounded-xl border p-4">
            <RegistrationButton
              momentId={moment.id}
              price={moment.price}
              isAuthenticated={isAuthenticated}
              existingRegistration={existingRegistration}
              signInUrl={signInUrl}
              isFull={isFull}
              spotsRemaining={spotsRemaining}
              isHost={isHost}
            />
          </div>

          {/* Liste des participants */}
          {allAttendees.length > 0 && (
            <div className="border-border rounded-2xl border p-6">
              <RegistrationsList
                registrations={allAttendees}
                registeredCount={registeredCount}
                waitlistedCount={waitlistedCount}
                capacity={moment.capacity}
                variant="public"
              />
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
