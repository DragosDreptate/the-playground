import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
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
  Users,
  ExternalLink,
  ImageIcon,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";

const statusVariant = {
  PUBLISHED: "default",
  CANCELLED: "destructive",
  PAST: "outline",
} as const;

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
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/m/${moment.slug}`;

  const locationLabel =
    moment.locationType === "ONLINE"
      ? t("form.locationOnline")
      : moment.locationType === "HYBRID"
        ? t("form.locationHybrid")
        : moment.locationName ?? t("form.locationInPerson");

  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + actions */}
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm">
            <Link href={`/dashboard/circles/${slug}/moments/${momentSlug}/edit`}>
              {tCommon("edit")}
            </Link>
          </Button>
          <DeleteMomentDialog momentId={moment.id} circleSlug={slug} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Cover */}
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

          {/* Title + description */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{moment.title}</h1>
            {moment.description && (
              <p className="text-muted-foreground leading-relaxed">
                {moment.description}
              </p>
            )}
          </div>

          {/* Shareable link */}
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

        {/* Right column */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
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

      {/* Registrations */}
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
