import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteMomentDialog } from "@/components/moments/delete-moment-dialog";
import { BroadcastMomentDialog } from "@/components/moments/broadcast-moment-dialog";
import { PublishMomentButton } from "@/components/moments/publish-moment-button";
import { RegistrationButton } from "@/components/moments/registration-button";
import { PendingRegistrationsList } from "@/components/circles/pending-requests-list";
import { MomentRegistrationsDialog } from "@/components/moments/moment-registrations-dialog";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import { CommentThread } from "@/components/moments/comment-thread";
import { getMomentGradient } from "@/lib/gradient";
import { getDisplayName, getCircleUserInitials } from "@/lib/display-name";
import type { Moment } from "@/domain/models/moment";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import type { Circle, CircleMemberWithUser } from "@/domain/models/circle";
import type { Registration, RegistrationWithUser } from "@/domain/models/registration";
import type { CommentWithUser } from "@/domain/models/comment";
import { MomentAttachmentsList } from "@/components/moments/moment-attachments-list";
import { AddToCalendarMenu } from "@/components/moments/add-to-calendar-menu";
import type { CalendarEventData } from "@/lib/calendar";
import type { UpcomingCircleMoment } from "@/domain/ports/repositories/moment-repository";
import { formatDateRange, formatMomentDateTime } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { UserAvatar } from "@/components/user-avatar";
import Image from "next/image";
import {
  CalendarIcon,
  Mail,
  MapPin,
  Globe,
  ImageIcon,
  ExternalLink,
  Link as LinkIcon,
  ChevronRight,
  Users,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
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
  attachments: MomentAttachment[];
  currentUserId: string | null;
  /** Première page des participants REGISTERED pour la modale (server-fetched, avec total). */
  participantsFirstPage: {
    participants: RegistrationWithUser[];
    total: number;
    hasMore: boolean;
  };
};

type HostViewProps = CommonProps & {
  variant: "host";
  circleSlug: string;
  momentSlug: string;
  publicUrl: string;
  calendarData?: CalendarEventData;
  appUrl?: string;
  pendingRegistrations?: RegistrationWithUser[];
  paymentSummary?: { paidCount: number; totalAmount: number; refundedCount: number };
};

type PublicViewProps = CommonProps & {
  variant: "public";
  isAuthenticated: boolean;
  isOrganizer: boolean;
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

type MomentCoverBlockProps = {
  coverImage: Moment["coverImage"];
  coverImageAttribution: Moment["coverImageAttribution"];
  title: string;
  status: Moment["status"];
  isDemo: boolean;
  gradient: string;
  sizes: string;
  demoLabel: string;
};

const breadcrumbStatusStyle: Record<string, string> = {
  DRAFT: "border-muted-foreground/40 text-muted-foreground",
  PUBLISHED: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "border-destructive/40 text-destructive",
  PAST: "border-muted-foreground/40 text-muted-foreground",
};

function MomentCoverBlock({
  coverImage, coverImageAttribution, title, status, isDemo, gradient,
  sizes, demoLabel,
}: MomentCoverBlockProps) {
  return (
    <div className="relative">
      <div className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl" style={{ background: gradient }} />
      <div
        className={`relative w-full overflow-hidden rounded-2xl transition-all ${status === "PAST" ? "opacity-70 grayscale" : ""}`}
        style={{ aspectRatio: "1 / 1" }}
      >
        {coverImage ? (
          <Image src={coverImage} alt={title} fill className="object-cover" sizes={sizes} priority />
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

        {/* Demo badge on cover */}
        {isDemo && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-md border border-primary/70 bg-black/80 px-2.5 py-1 text-sm leading-none text-primary backdrop-blur-sm">
              {demoLabel}
            </span>
          </div>
        )}

        {/* Crédit photo Unsplash — overlay bas */}
        {coverImageAttribution && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8 pb-2">
            <p className="text-[0.65rem] leading-tight text-white/80">
              Photo par{" "}
              <a href={coverImageAttribution.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                {coverImageAttribution.name}
              </a>{" "}
              sur Unsplash
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type CircleInfoBlockProps = {
  circle: Pick<Circle, "coverImage" | "name" | "description">;
  circleHref: string;
  proposedByLabel: string;
};

function CircleInfoBlock({ circle, circleHref, proposedByLabel }: CircleInfoBlockProps) {
  return (
    <>
      <p className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">
        {proposedByLabel}
      </p>
      <Link href={circleHref} className="group flex flex-col gap-2 px-1">
        {/* Ligne 1 : cover + titre */}
        <div className="flex items-center gap-3">
          <div
            className="size-9 shrink-0 rounded-lg bg-cover bg-center"
            style={
              circle.coverImage
                ? { backgroundImage: `url(${circle.coverImage})` }
                : { background: getMomentGradient(circle.name) }
            }
          />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
            {circle.name}
          </p>
        </div>
        {/* Ligne 2 : description pleine largeur */}
        {circle.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {circle.description}
          </p>
        )}
      </Link>
    </>
  );
}


// ── Component ────────────────────────────────────────────────

export async function MomentDetailView(props: MomentDetailViewProps) {
  const { moment, circle, hosts, registrations, registeredCount, waitlistedCount, attachments, participantsFirstPage } =
    props;
  // "Organisé par" affiche le créateur de l'événement (HOST ou CO_HOST).
  // Si le créateur n'est plus organisateur (rétrogradé / parti), on retombe sur le HOST principal.
  // On garde `hosts` complet pour les autres usages (exclusions notifications, hostUserIds...).
  const creator = moment.createdById
    ? hosts.find((h) => h.user.id === moment.createdById)
    : null;
  const primaryHosts = creator ? [creator] : hosts.filter((h) => h.role === "HOST");
  const isHostView = props.variant === "host";
  // Le host est toujours connecté — l'accès au dashboard nécessite une session
  const isAuthenticated = isHostView || (props as PublicViewProps).isAuthenticated;

  const t = await getTranslations("Moment");
  const tCommon = await getTranslations("Common");
  const tCircle = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");
  const locale = await getLocale();

  const gradient = getMomentGradient(moment.title);
  const momentDateTime = formatMomentDateTime(moment.startsAt, moment.endsAt, locale);

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

  const PARTICIPANT_AVATARS_MAX = 5;
  const registeredParticipants = registrations.filter((r) => r.status === "REGISTERED");
  const visibleParticipantAvatars = registeredParticipants.slice(0, PARTICIPANT_AVATARS_MAX);
  const participantNamesToShow = registeredParticipants
    .slice(0, 2)
    .map((r) => getDisplayName(r.user.firstName, r.user.lastName, r.user.email));
  const participantOthersCount = Math.max(0, registeredCount - participantNamesToShow.length);
  const participantsMetaText =
    participantOthersCount > 0
      ? `${participantNamesToShow.join(", ")} ${tCircle("detail.andOthers", { count: participantOthersCount })}`
      : participantNamesToShow.join(", ");

  const circleHref = isHostView
    ? `/dashboard/circles/${props.circleSlug}`
    : `/circles/${circle.slug}`;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + status badge — Host only */}
      {isHostView && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <Link
            href="/dashboard"
            className="hover:text-foreground shrink-0 transition-colors"
          >
            {tDashboard("title")}
          </Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <Link
            href={`/dashboard/circles/${props.circleSlug}`}
            className="hover:text-foreground shrink-0 transition-colors"
          >
            {circle.name}
          </Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-foreground font-medium">
            {moment.title}
          </span>
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${breadcrumbStatusStyle[moment.status]}`}>
            {t(`status.${moment.status.toLowerCase()}`)}
          </span>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + circle info ────────────── */}
        <div className="order-2 hidden w-full flex-col gap-4 lg:order-1 lg:flex lg:w-[340px] lg:shrink-0 lg:sticky lg:top-20">

          {/* Cover — carré, glow blur */}
          <MomentCoverBlock
            coverImage={moment.coverImage}
            coverImageAttribution={moment.coverImageAttribution}
            title={moment.title}
            status={moment.status}
            isDemo={circle.isDemo}
            gradient={gradient}
            sizes="(max-width: 1024px) 100vw, 340px"
            demoLabel={tCommon("demo")}
          />

          {/* Circle — cliquable */}
          <CircleInfoBlock
            circle={circle}
            circleHref={circleHref}
            proposedByLabel={t("public.proposedByCommunity")}
          />

          {/* Organisé par — HOSTs de l'événement (design aligné Circle) */}
          {primaryHosts.length > 0 && (
            <>
              <div className="border-border border-t" />
              <div className="space-y-2 px-1">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t("public.hostedBy")}
                </p>
                <ul className="space-y-2">
                  {primaryHosts.map((h) => {
                    const hostDisplayName = getDisplayName(h.user.firstName, h.user.lastName, h.user.email);
                    const avatar = (
                      <UserAvatar
                        name={hostDisplayName}
                        email={h.user.email}
                        image={h.user.image}
                        size="sm"
                      />
                    );
                    const linkable = isAuthenticated && h.user.publicId;
                    return (
                      <li key={h.id}>
                        {linkable ? (
                          <Link
                            href={`/u/${h.user.publicId}`}
                            className="group/organizer flex items-center gap-3"
                          >
                            {avatar}
                            <span className="text-sm font-medium leading-snug group-hover/organizer:text-primary dark:group-hover/organizer:text-[oklch(0.76_0.27_341)] transition-colors">
                              {hostDisplayName}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3">
                            {avatar}
                            <span className="text-sm font-medium leading-snug">{hostDisplayName}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* CTAs — selon le contexte (host / public organizer / public non-organizer par statut) */}
          {isHostView ? (
            <div className="flex flex-col gap-2">
              {moment.status === "DRAFT" && (
                <PublishMomentButton
                  momentId={moment.id}
                  circleSlug={props.circleSlug}
                  momentSlug={props.momentSlug}
                />
              )}
              <div className="flex gap-2">
                <Button
                  asChild
                  size="sm"
                  variant={moment.status === "DRAFT" ? "outline" : "default"}
                  className="flex-1"
                >
                  <Link href={`/dashboard/circles/${props.circleSlug}/moments/${props.momentSlug}/edit`}>
                    {tCommon("edit")}
                  </Link>
                </Button>
                <DeleteMomentDialog
                  momentId={moment.id}
                  circleSlug={props.circleSlug}
                  triggerClassName="flex-1"
                />
              </div>
            </div>
          ) : props.isOrganizer ? (
            <Button asChild size="sm" className="w-full gap-1.5">
              <Link href={`/dashboard/circles/${circle.slug}/moments/${moment.slug}`}>
                <ExternalLink className="size-3.5" />
                {tCircle("detail.manageMoment")}
              </Link>
            </Button>
          ) : moment.status === "DRAFT" ? (
            <div className="border-border bg-muted/30 space-y-3 rounded-2xl border p-4">
              <p className="font-semibold">{t("public.draftTitle")}</p>
              <p className="text-muted-foreground text-sm">{t("public.draftBody")}</p>
            </div>
          ) : moment.status === "PAST" ? (
            <div className="border-border bg-muted/30 space-y-3 rounded-2xl border p-4">
              <p className="font-semibold">{t("public.eventEnded")}</p>
              {registeredCount > 0 && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Users className="size-4 shrink-0" />
                  <span>{t("public.attendedCount", { count: registeredCount })}</span>
                </div>
              )}
              <Link
                href={circleHref}
                className="text-primary inline-flex items-center gap-1 text-sm hover:text-foreground transition-colors"
              >
                {t("public.viewCircleMoments")}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : moment.status === "CANCELLED" ? (
            <div className="border-border bg-muted/30 space-y-3 rounded-2xl border p-4">
              <p className="font-semibold">{t("public.eventCancelled")}</p>
              <Link
                href={circleHref}
                className="text-primary inline-flex items-center gap-1 text-sm hover:text-foreground transition-colors"
              >
                {t("public.viewCircleMoments")}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <RegistrationButton
              momentId={moment.id}
              slug={moment.slug}
              circleId={circle.id}
              circleName={circle.name}
              price={moment.price}
              currency={moment.currency}
              isAuthenticated={props.isAuthenticated}
              existingRegistration={props.existingRegistration}
              signInUrl={props.signInUrl}
              isFull={props.isFull}
              spotsRemaining={props.spotsRemaining}
              registrationCount={registeredCount}
              isOrganizer={props.isOrganizer}
              calendarData={props.calendarData}
              appUrl={props.appUrl}
              waitlistPosition={props.waitlistPosition}
              requiresApproval={moment.requiresApproval}
              refundable={moment.refundable}
            />
          )}
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* Titre */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {moment.title}
          </h1>

          {/* Banner Moment brouillon — visible par tous */}
          {moment.status === "DRAFT" && (
            <div className="border-border bg-muted/50 flex items-center gap-3 rounded-xl border px-4 py-3">
              <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-sm">
                {t("public.draftNotice")}
              </p>
            </div>
          )}

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

          {/* Cover — mobile uniquement (dupliquée depuis LEFT column) */}
          <div className="lg:hidden">
            <MomentCoverBlock
              coverImage={moment.coverImage}
              coverImageAttribution={moment.coverImageAttribution}
              title={moment.title}
              status={moment.status}
              isDemo={circle.isDemo}
              gradient={gradient}
              sizes="calc(100vw - 32px)"
              demoLabel={tCommon("demo")}
            />
          </div>

          {/* Description */}
          {moment.description && (
            <div className="lg:border-primary lg:border-l-2 lg:pl-4">
              <CollapsibleDescription text={moment.description} />
            </div>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Quand & Où — style Luma : valeur principale en bold, détail en muted dessous */}
          <div className="flex flex-col gap-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                <CalendarIcon className="text-primary size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">
                  {momentDateTime.dateLine}
                </p>
                <p className="text-muted-foreground text-sm">
                  {momentDateTime.timeLine}
                </p>
              </div>
              {props.calendarData && props.appUrl && moment.status !== "PAST" && moment.status !== "CANCELLED" && (
                <AddToCalendarMenu data={props.calendarData} appUrl={props.appUrl} />
              )}
            </div>

            {/* Participants — équivalent au bloc Membres de la page Communauté (cliquable → modale) */}
            {visibleParticipantAvatars.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Users className="text-primary size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {t("registrations.title")}
                  </p>
                  {isAuthenticated ? (
                    <MomentRegistrationsDialog
                      momentId={moment.id}
                      initialParticipants={participantsFirstPage.participants}
                      initialTotal={participantsFirstPage.total}
                      initialHasMore={participantsFirstPage.hasMore}
                      capacity={moment.capacity}
                      hostUserIds={moment.createdById ? [moment.createdById] : []}
                      waitlistedRegistrations={registrations.filter((r) => r.status === "WAITLISTED")}
                      allRegistrationsForExport={registrations}
                      isHostView={isHostView}
                      momentSlug={moment.slug}
                      momentTitle={moment.title}
                      momentStartsAt={moment.startsAt}
                      triggerClassName="group flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
                    >
                      <span className="flex -space-x-1.5">
                        {visibleParticipantAvatars.map((r) => {
                          const displayName = getDisplayName(r.user.firstName, r.user.lastName, r.user.email);
                          return (
                            <span key={r.id} className="group/avatar relative">
                              <span
                                className="ring-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.55rem] font-semibold text-white ring-2"
                                style={{ background: getMomentGradient(r.user.email) }}
                              >
                                {r.user.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={r.user.image}
                                    alt={displayName}
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 size-full object-cover"
                                  />
                                ) : (
                                  getCircleUserInitials(r.user)
                                )}
                              </span>
                              <span className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover/avatar:opacity-100">
                                {displayName}
                              </span>
                            </span>
                          );
                        })}
                      </span>
                      <span className="text-sm font-medium group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
                        {participantsMetaText}
                      </span>
                    </MomentRegistrationsDialog>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="flex -space-x-1.5">
                        {visibleParticipantAvatars.map((r) => {
                          const displayName = getDisplayName(r.user.firstName, r.user.lastName, r.user.email);
                          return (
                            <span key={r.id} className="group/avatar relative">
                              <span
                                className="ring-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.55rem] font-semibold text-white ring-2"
                                style={{ background: getMomentGradient(r.user.email) }}
                              >
                                {r.user.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={r.user.image}
                                    alt={displayName}
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 size-full object-cover"
                                  />
                                ) : (
                                  getCircleUserInitials(r.user)
                                )}
                              </span>
                              <span className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover/avatar:opacity-100">
                                {displayName}
                              </span>
                            </span>
                          );
                        })}
                      </span>
                      <span className="text-sm font-medium">{participantsMetaText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lieu */}
            <div className="flex flex-col gap-1">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3"
                >
                  <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                    <LocationIcon className="text-primary size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold leading-snug">
                      <span className="truncate group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
                        {locationLabel}
                      </span>
                      <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-colors" />
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {moment.locationAddress}
                    </p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                    <LocationIcon className="text-primary size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{locationLabel}</p>
                  </div>
                </div>
              )}
              {moment.videoLink && (
                <a
                  href={moment.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary ml-14 block truncate text-sm hover:text-foreground transition-colors"
                >
                  {moment.videoLink}
                </a>
              )}
            </div>

            {/* Carte — l'iframe embed gère déjà le zoom/pan et propose son propre lien "Maps" */}
            {moment.locationAddress && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <div className="border-border overflow-hidden rounded-xl border">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(moment.locationAddress)}&zoom=15`}
                  className="h-44 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={moment.locationAddress}
                />
              </div>
            )}
          </div>

          {/* Host : Partager mon événement */}
          {isHostView && (
            <div className="border-border bg-card rounded-2xl border p-6">
              <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                {t("detail.shareTitle")}
              </p>

              {/* Ligne 1 — Lien partageable */}
              <div className="flex items-start gap-3 pt-0 pb-3">
                <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <LinkIcon className="size-[15px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[13px] font-medium">{t("detail.shareableLink")}</p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/m/${moment.slug}`}
                      target="_blank"
                      className="border-border bg-muted/50 hover:border-primary min-w-0 flex-1 truncate rounded-lg border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors"
                    >
                      {props.publicUrl.replace(/^https?:\/\//, "")}
                    </Link>
                    <CopyLinkButton value={props.publicUrl} />
                  </div>
                </div>
              </div>

              {/* Ligne 2 — Inviter ma Communauté */}
              {moment.status !== "PAST" && moment.status !== "CANCELLED" && (
                <>
                  <div className="border-border ml-11 border-t" />
                  <div className="flex items-center gap-3 py-3">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <Mail className="size-[15px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{t("broadcast.triggerButton")}</p>
                      <p className="text-muted-foreground text-xs">{t("broadcast.hint")}</p>
                    </div>
                    <BroadcastMomentDialog
                      momentId={moment.id}
                      circleId={circle.id}
                      circleName={circle.name}
                      broadcastSentAt={moment.broadcastSentAt?.toISOString() ?? null}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Demandes en attente — Host uniquement si requiresApproval */}
          {isHostView && props.variant === "host" && moment.requiresApproval && (
            <div className="border-border bg-card rounded-2xl border p-6">
              {props.pendingRegistrations && props.pendingRegistrations.length > 0 ? (
                <PendingRegistrationsList
                  pendingRegistrations={props.pendingRegistrations}
                />
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <ShieldCheck className="size-5 shrink-0" />
                  <p className="text-sm">{t("registrations.noPendingApprovals")}</p>
                </div>
              )}
            </div>
          )}

          {/* Résumé billetterie — Host uniquement, événements payants */}
          {isHostView && props.variant === "host" && props.paymentSummary && moment.price > 0 && (
            <div className="border-border bg-card rounded-2xl border p-6">
              <h3 className="mb-3 text-base font-semibold">{t("host.ticketingSummary")}</h3>
              <div className="text-sm">
                <p>
                  {t("host.paidRegistrations", { count: props.paymentSummary.paidCount })}
                  {" · "}
                  {formatPrice(props.paymentSummary.totalAmount, moment.currency)}
                  {" "}
                  <span className="text-muted-foreground text-xs">({t("host.beforeStripeFees")})</span>
                </p>
                {props.paymentSummary.refundedCount > 0 && (
                  <p className="text-muted-foreground">
                    {t("host.refundedRegistrations", { count: props.paymentSummary.refundedCount })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {attachments.length > 0 && (
            <MomentAttachmentsList
              attachments={attachments}
              momentSlug={moment.slug}
            />
          )}

          {/* Circle info — mobile uniquement (dupliquée depuis LEFT column) */}
          <div className="flex flex-col gap-4 lg:hidden">
            <CircleInfoBlock
              circle={circle}
              circleHref={circleHref}
              proposedByLabel={t("public.proposedByCommunity")}
            />
          </div>

          {/* Prochains événements du Circle — public view uniquement */}
          {!isHostView && (props as PublicViewProps).upcomingCircleMoments.length > 0 && (
            <div className="border-border bg-card rounded-2xl border p-6">
              <h2 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wider">
                {t("public.upcomingInCircle")}
              </h2>
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
                      : upcoming.locationName ?? upcoming.locationAddress ?? t("form.locationInPerson");
                  return (
                    <Link
                      key={upcoming.id}
                      href={`/m/${upcoming.slug}`}
                      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors"
                    >
                      <div
                        className="size-12 shrink-0 overflow-hidden rounded-lg"
                        style={upcoming.coverImage ? undefined : { background: upcomingGradient }}
                      >
                        {upcoming.coverImage && (
                          <Image
                            src={upcoming.coverImage}
                            alt={upcoming.title}
                            width={48}
                            height={48}
                            className="size-12 object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{upcoming.title}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {dateLabel} · {locationLabel}
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
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary/70 transition-colors"
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
            isOrganizer={isHostView || (!isHostView && (props as PublicViewProps).isOrganizer)}
            isPastMoment={moment.status === "PAST"}
            signInUrl={!isHostView ? (props as PublicViewProps).signInUrl : ""}
          />

        </div>
      </div>
    </div>
  );
}
