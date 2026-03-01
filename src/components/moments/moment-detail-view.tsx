import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteMomentDialog } from "@/components/moments/delete-moment-dialog";
import { BroadcastMomentDialog } from "@/components/moments/broadcast-moment-dialog";
import { RegistrationButton } from "@/components/moments/registration-button";
import { RegistrationsList } from "@/components/moments/registrations-list";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import { CommentThread } from "@/components/moments/comment-thread";
import { getMomentGradient } from "@/lib/gradient";
import type { Moment } from "@/domain/models/moment";
import type { Circle, CircleMemberWithUser } from "@/domain/models/circle";
import type { Registration, RegistrationWithUser } from "@/domain/models/registration";
import type { CommentWithUser } from "@/domain/models/comment";
import { buildGoogleCalendarUrl, type CalendarEventData } from "@/lib/calendar";
import type { UpcomingCircleMoment } from "@/domain/ports/repositories/moment-repository";
import { formatDateRange } from "@/lib/format-date";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import Image from "next/image";
import {
  CalendarIcon,
  Download,
  Mail,
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
  calendarData?: CalendarEventData;
  appUrl?: string;
};

type PublicViewProps = CommonProps & {
  variant: "public";
  isAuthenticated: boolean;
  isHost: boolean;
  existingRegistration: Registration | null;
  signInUrl: string;
  isFull: boolean;
  spotsRemaining: number | null;
  calendarData: CalendarEventData;
  appUrl: string;
  waitlistPosition: number;
  upcomingCircleMoments: UpcomingCircleMoment[];
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
  const tCircle = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");
  const locale = await getLocale();

  const gradient = getMomentGradient(moment.title);

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
          <div className="flex flex-col gap-2">
            <div className="relative">
              <div
                className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
                style={{ background: gradient }}
              />
              <div
                className={`relative w-full overflow-hidden rounded-2xl transition-all ${moment.status === "PAST" ? "opacity-70 grayscale" : ""}`}
                style={{ aspectRatio: "1 / 1" }}
              >
                {moment.coverImage ? (
                  <Image
                    src={moment.coverImage}
                    alt={moment.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 340px"
                    priority
                  />
                ) : (
                  <>
                    <div className="size-full" style={{ background: gradient }} />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <ImageIcon className="size-6 text-white" />
                      </div>
                    </div>
                  </>
                )}
                {moment.status === "PAST" && (
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {t(`status.past`)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {moment.coverImageAttribution && (
              <p className="text-muted-foreground px-1 text-xs">
                Photo par{" "}
                <a
                  href={moment.coverImageAttribution.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline"
                >
                  {moment.coverImageAttribution.name}
                </a>{" "}
                sur Unsplash
              </p>
            )}
          </div>

          {/* Circle — cliquable */}
          <Link
            href={circleHref}
            className="group flex items-start gap-3 px-1"
          >
            <div
              className="mt-0.5 size-9 shrink-0 rounded-lg bg-cover bg-center"
              style={
                circle.coverImage
                  ? { backgroundImage: `url(${circle.coverImage})` }
                  : { background: getMomentGradient(circle.name) }
              }
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
            {!isHostView && props.isHost && (
              <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
                <Link href={`/dashboard/circles/${circle.slug}/moments/${moment.slug}`}>
                  <ExternalLink className="size-3.5" />
                  {tCircle("detail.manageMoment")}
                </Link>
              </Button>
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
                  {formatDateRange(moment.startsAt, moment.endsAt, locale)}
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
                  {formatDateRange(moment.startsAt, moment.endsAt, locale)}
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

            {/* Carte — seulement si adresse physique et clé API configurée */}
            {moment.locationAddress && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <div className="border-border overflow-hidden rounded-xl border">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(moment.locationAddress)}&zoom=15`}
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

          {/* Host : Partager mon événement */}
          {isHostView && (
            <div className="border-border rounded-2xl border p-6">
              <h2 className="mb-4 text-lg font-semibold">{t("detail.shareTitle")}</h2>

              {/* Ligne 1 — Lien partageable */}
              <div className="flex items-start gap-3 py-3">
                <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <LinkIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-sm font-medium">{t("detail.shareableLink")}</p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/m/${moment.slug}`}
                      target="_blank"
                      className="border-border bg-muted/50 hover:border-primary hover:bg-primary/5 min-w-0 flex-1 rounded-lg border px-3 py-2 transition-colors"
                    >
                      <span className="text-muted-foreground block truncate font-mono text-sm">
                        {props.publicUrl.replace(/^https?:\/\//, "")}
                      </span>
                    </Link>
                    <CopyLinkButton value={props.publicUrl} />
                  </div>
                </div>
              </div>

              {/* Ligne 2 — Calendrier */}
              {props.calendarData && props.appUrl && moment.status !== "PAST" && (
                <>
                  <div className="border-border ml-11 border-t" />
                  <div className="flex items-center gap-3 py-3">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <CalendarIcon className="size-4" />
                    </div>
                    <p className="min-w-0 flex-1 text-sm font-medium">{t("public.addToCalendar.label")}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={buildGoogleCalendarUrl(props.calendarData, props.appUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {/* Google Calendar — official icon (Simple Icons) */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#4285F4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z"/>
                          </svg>
                          Google
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/api/moments/${moment.slug}/calendar`}
                          download={`${moment.slug}.ics`}
                        >
                          <Download className="size-3.5" />
                          .ics
                        </a>
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Ligne 3 — Inviter ma Communauté */}
              {moment.status !== "PAST" && moment.status !== "CANCELLED" && (
                <>
                  <div className="border-border ml-11 border-t" />
                  <div className="flex items-center gap-3 py-3">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <Mail className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t("broadcast.triggerButton")}</p>
                      <p className="text-muted-foreground text-xs">{t("broadcast.hint")}</p>
                    </div>
                    <BroadcastMomentDialog
                      momentId={moment.id}
                      circleId={circle.id}
                      circleName={circle.name}
                      broadcastSentAtLabel={
                        moment.broadcastSentAt
                          ? moment.broadcastSentAt.toLocaleDateString(
                              locale === "fr" ? "fr-FR" : "en-US",
                              { day: "numeric", month: "long", year: "numeric" }
                            )
                          : null
                      }
                    />
                  </div>
                </>
              )}
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
                  registrationCount={registeredCount}
                  isHost={props.isHost}
                  calendarData={props.calendarData}
                  appUrl={props.appUrl}
                  waitlistPosition={props.waitlistPosition}
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
                hostUserIds={new Set(hosts.map((h) => h.user.id))}
                momentSlug={isHostView ? moment.slug : undefined}
              />
            </div>
          )}

          {/* Prochains événements du Circle — public view uniquement */}
          {!isHostView && (props as PublicViewProps).upcomingCircleMoments.length > 0 && (
            <div className="border-border rounded-2xl border p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {t("public.upcomingInCircle")}
                </h2>
                <p className="text-muted-foreground text-sm">{circle.name}</p>
              </div>
              <div className="divide-border divide-y">
                {(props as PublicViewProps).upcomingCircleMoments.map((upcoming) => {
                  const upcomingGradient = getMomentGradient(upcoming.title);
                  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
                  const dateLabel = upcoming.startsAt.toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                  });
                  const locationLabel =
                    upcoming.locationType === "ONLINE"
                      ? t("form.locationOnline")
                      : upcoming.locationName ?? t("form.locationInPerson");
                  return (
                    <Link
                      key={upcoming.id}
                      href={`/m/${upcoming.slug}`}
                      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors"
                    >
                      <div
                        className="size-12 shrink-0 rounded-lg"
                        style={
                          upcoming.coverImage
                            ? undefined
                            : { background: upcomingGradient }
                        }
                      >
                        {upcoming.coverImage && (
                          <Image
                            src={upcoming.coverImage}
                            alt={upcoming.title}
                            width={48}
                            height={48}
                            className="size-12 rounded-lg object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{upcoming.title}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {dateLabel}
                          {" · "}
                          {locationLabel}
                        </p>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  );
                })}
              </div>
              <div className="border-border mt-4 border-t pt-4 text-center">
                <Link
                  href={`/circles/${circle.slug}`}
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  {t("public.seeAllCircleEvents")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
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
