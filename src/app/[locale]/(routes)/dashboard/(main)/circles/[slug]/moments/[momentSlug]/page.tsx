import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { getMomentRegistrations } from "@/domain/usecases/get-moment-registrations";
import { CircleNotFoundError, MomentNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteMomentDialog } from "@/components/moments/delete-moment-dialog";
import { RegistrationsList } from "@/components/moments/registrations-list";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import { getMomentGradient } from "@/lib/gradient";
import {
  CalendarIcon,
  MapPin,
  Globe,
  ImageIcon,
  ExternalLink,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";

const statusVariant = {
  PUBLISHED: "default",
  CANCELLED: "destructive",
  PAST: "outline",
} as const;

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

export default async function MomentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; momentSlug: string }>;
}) {
  const { slug, momentSlug } = await params;
  const t = await getTranslations("Moment");
  const tCommon = await getTranslations("Common");

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
  let registrationsData = null;
  if (session?.user?.id) {
    try {
      registrationsData = await getMomentRegistrations(
        { momentId: moment.id, userId: session.user.id },
        {
          momentRepository: prismaMomentRepository,
          circleRepository: prismaCircleRepository,
          registrationRepository: prismaRegistrationRepository,
        }
      );
    } catch {
      // User may not be HOST — silently skip
    }
  }

  const gradient = getMomentGradient(moment.title);
  const circleGradient = getMomentGradient(circle.name);
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/m/${moment.slug}`;

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

  return (
    <div className="space-y-8">
      {/* Breadcrumb + status badge */}
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <Link
            href={`/dashboard/circles/${slug}`}
            className="hover:text-foreground transition-colors"
          >
            {circle.name}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground truncate font-medium">
            {moment.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[moment.status]}>
            {t(`status.${moment.status.toLowerCase()}`)}
          </Badge>
        </div>
      </div>

      {/* Two-column layout — identique à la page publique */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + circle info ──────────────────── */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">

          {/* Cover — carré, glow blur */}
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
          <Link
            href={`/dashboard/circles/${slug}`}
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
        </div>

        {/* ─── RIGHT column : contenu + actions Host ─────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* "Organisé par" + actions Host */}
          <div className="flex items-center justify-between gap-4">
            {hosts.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {t("public.hostedBy")}{" "}
                <span className="text-foreground font-medium">
                  {formatHostNames(hosts)}
                </span>
              </p>
            )}
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm">
                <Link href={`/dashboard/circles/${slug}/moments/${momentSlug}/edit`}>
                  {tCommon("edit")}
                </Link>
              </Button>
              <DeleteMomentDialog momentId={moment.id} circleSlug={slug} />
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {moment.title}
          </h1>

          {/* À propos */}
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

          {/* Quand & Où */}
          <div className="flex flex-col gap-3">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <CalendarIcon className="text-primary size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("detail.when")}</p>
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
                <p className="text-muted-foreground text-xs">{t("detail.where")}</p>
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

          {/* Lien partageable */}
          <div className="border-border bg-card flex items-center gap-2 rounded-xl border px-4 py-3">
            <LinkIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-sm">
              /m/{moment.slug}
            </span>
            <CopyLinkButton value={publicUrl} />
            <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs">
              <Link href={`/m/${moment.slug}`} target="_blank">
                <ExternalLink className="size-3.5" />
                Voir
              </Link>
            </Button>
          </div>


        </div>
      </div>

      {/* Inscriptions — pleine largeur sous les colonnes */}
      {registrationsData && (
        <div className="border-border rounded-2xl border p-6">
          <RegistrationsList
            registrations={registrationsData.registrations}
            registeredCount={registrationsData.registeredCount}
            waitlistedCount={registrationsData.waitlistedCount}
            capacity={moment.capacity}
          />
        </div>
      )}
    </div>
  );
}
