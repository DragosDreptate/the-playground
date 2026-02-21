import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteMomentDialog } from "@/components/moments/delete-moment-dialog";
import { RegistrationButton } from "@/components/moments/registration-button";
import { RegistrationsList } from "@/components/moments/registrations-list";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import { CommentThread } from "@/components/moments/comment-thread";
import { getMomentGradient } from "@/lib/gradient";
import type { Moment } from "@/domain/models/moment";
import type { Circle, CircleMemberWithUser } from "@/domain/models/circle";
import type { Registration, RegistrationWithUser } from "@/domain/models/registration";
import type { CommentWithUser } from "@/domain/models/comment";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import {
  CalendarIcon,
  MapPin,
  Globe,
  ImageIcon,
  ExternalLink,
  Link as LinkIcon,
  ChevronRight,
  Users,
  ArrowRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

type CommonProps = {
  moment: Moment;
  circle: Circle;
  hosts: CircleMemberWithUser[];
  registrations: RegistrationWithUser[];
  registeredCount: number;
  waitlistedCount: number;
  comments: CommentWithUser[];
  currentUserId: string | null;
};

type HostViewProps = CommonProps & {
  variant: "host";
  circleSlug: string;
  momentSlug: string;
  publicUrl: string;
};

type PublicViewProps = CommonProps & {
  variant: "public";
  isAuthenticated: boolean;
  isHost: boolean;
  existingRegistration: Registration | null;
  signInUrl: string;
  isFull: boolean;
  spotsRemaining: number | null;
};

export type MomentDetailViewProps = HostViewProps | PublicViewProps;

// ── Helpers ──────────────────────────────────────────────────

const statusVariant = {
  PUBLISHED: "default",
  CANCELLED: "outline",
  PAST: "outline",
} as const;

const statusClassName = {
  PUBLISHED: "",
  CANCELLED: "border-destructive/40 text-destructive",
  PAST: "",
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

// ── Component ────────────────────────────────────────────────

export async function MomentDetailView(props: MomentDetailViewProps) {
  const { moment, circle, hosts, registrations, registeredCount, waitlistedCount } =
    props;
  const isHostView = props.variant === "host";

  const t = await getTranslations("Moment");
  const tCommon = await getTranslations("Common");
  const tDashboard = await getTranslations("Dashboard");

  const gradient = getMomentGradient(moment.title);
  const circleGradient = getMomentGradient(circle.name);

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

  const circleHref = isHostView
    ? `/dashboard/circles/${props.circleSlug}`
    : `/dashboard/circles/${circle.slug}`;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + status badge — Host only */}
      {isHostView && (
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              {tDashboard("title")}
            </Link>
            <ChevronRight className="size-3.5" />
            <Link
              href={`/dashboard/circles/${props.circleSlug}`}
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
            <Badge variant={statusVariant[moment.status]} className={statusClassName[moment.status]}>
              {t(`status.${moment.status.toLowerCase()}`)}
            </Badge>
          </div>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + circle info ────────────── */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">

          {/* Cover — carré, glow blur */}
          <div className="relative">
            <div
              className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
              style={{ background: gradient }}
            />
            <div
              className={`relative w-full overflow-hidden rounded-2xl transition-all ${moment.status === "PAST" ? "opacity-70 grayscale" : ""}`}
              style={{ background: gradient, aspectRatio: "1 / 1" }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <ImageIcon className="size-6 text-white" />
                </div>
              </div>
              {moment.status === "PAST" && (
                <div className="absolute bottom-3 left-3">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {t(`status.past`)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Circle — cliquable */}
          <Link
            href={circleHref}
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

        {/* ─── RIGHT column ─────────────────────────────────── */}
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
            {isHostView && (
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm">
                  <Link href={`/dashboard/circles/${props.circleSlug}/moments/${props.momentSlug}/edit`}>
                    {tCommon("edit")}
                  </Link>
                </Button>
                <DeleteMomentDialog momentId={moment.id} circleSlug={props.circleSlug} />
              </div>
            )}
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {moment.title}
          </h1>

          {/* Banner Moment passé */}
          {moment.status === "PAST" && (
            <div className="border-border bg-muted/50 flex items-center gap-3 rounded-xl border px-4 py-3">
              <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
              <p className="text-sm">
                {t("public.eventTookPlace")}{" "}
                <span className="font-medium">
                  {formatDateRange(moment.startsAt, moment.endsAt)}
                </span>
                {registeredCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium">
                      {t("public.attendedCount", { count: registeredCount })}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Séparateur avant À propos */}
          {moment.description && <div className="border-border border-t" />}

          {/* Description */}
          {moment.description && (
            <CollapsibleDescription text={moment.description} />
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

          {/* Host : lien partageable */}
          {isHostView && (
            <div className="border-border bg-card flex items-center gap-2 rounded-xl border px-4 py-3">
              <LinkIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-sm">
                /m/{moment.slug}
              </span>
              <CopyLinkButton value={props.publicUrl} />
              <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs">
                <Link href={`/m/${moment.slug}`} target="_blank">
                  <ExternalLink className="size-3.5" />
                  Voir
                </Link>
              </Button>
            </div>
          )}

          {/* Public : inscription ou carte "événement terminé" */}
          {!isHostView && (
            moment.status === "PAST" ? (
              <div className="border-border bg-muted/30 space-y-3 rounded-xl border p-4">
                <p className="font-semibold">{t("public.eventEnded")}</p>
                {registeredCount > 0 && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Users className="size-4 shrink-0" />
                    <span>{t("public.attendedCount", { count: registeredCount })}</span>
                  </div>
                )}
                <Link
                  href={circleHref}
                  className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                >
                  {t("public.viewCircleMoments")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <div className="border-border bg-card rounded-xl border p-4">
                <RegistrationButton
                  momentId={moment.id}
                  price={moment.price}
                  isAuthenticated={props.isAuthenticated}
                  existingRegistration={props.existingRegistration}
                  signInUrl={props.signInUrl}
                  isFull={props.isFull}
                  spotsRemaining={props.spotsRemaining}
                  isHost={props.isHost}
                />
              </div>
            )
          )}

          {/* Liste des participants */}
          {registrations.length > 0 && (
            <div className="border-border rounded-2xl border p-6">
              <RegistrationsList
                registrations={registrations}
                registeredCount={registeredCount}
                waitlistedCount={waitlistedCount}
                capacity={moment.capacity}
                variant={isHostView ? "host" : "public"}
              />
            </div>
          )}

          {/* Fil de commentaires */}
          <CommentThread
            momentId={moment.id}
            comments={props.comments}
            currentUserId={props.currentUserId}
            isHost={isHostView || (!isHostView && (props as PublicViewProps).isHost)}
            isPastMoment={moment.status === "PAST"}
            signInUrl={!isHostView ? (props as PublicViewProps).signInUrl : ""}
          />

        </div>
      </div>
    </div>
  );
}
