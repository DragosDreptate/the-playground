import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { stripProtocol } from "@/lib/url";
import { formatLongDate } from "@/lib/format-date";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaCircleNetworkRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteCircleDialog } from "@/components/circles/delete-circle-dialog";
import { LeaveCircleDialog } from "@/components/circles/leave-circle-dialog";
import { CircleMomentTabs } from "@/components/circles/circle-moment-tabs";
import { MomentTimelineItem } from "@/components/circles/moment-timeline-item";
import { PaginatedMomentList } from "@/components/circles/paginated-moment-list";
import { CircleMembersDialog } from "@/components/circles/circle-members-dialog";
import { CircleShareInviteCard } from "@/components/circles/circle-share-invite-card";
import { PendingMembershipsList } from "@/components/circles/pending-requests-list";
import { CoverBlock } from "@/components/circles/cover-block";
import { getMomentGradient } from "@/lib/gradient";
import { getDisplayName, getCircleUserInitials } from "@/lib/display-name";
import { UserAvatar } from "@/components/user-avatar";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { HostLink } from "@/components/circles/host-link";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { isActiveOrganizer } from "@/domain/models/circle";
import {
  Globe,
  Lock,
  Users,
  CalendarIcon,
  ChevronRight,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Network,
  Tag,
} from "lucide-react";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";
import { MEMBER_AVATARS_MAX } from "@/lib/circle-constants";

// ── Helpers ───────────────────────────────────────────────────


// ── Page ──────────────────────────────────────────────────────

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, locale, t, tCommon, tDashboard, tCategory, tMoment, tNetwork, session] = await Promise.all([
    params,
    getLocale(),
    getTranslations("Circle"),
    getTranslations("Common"),
    getTranslations("Dashboard"),
    getTranslations("CircleCategory"),
    getTranslations("Moment"),
    getTranslations("Network"),
    auth(),
  ]);

  if (!session?.user?.id) notFound();

  let circle;
  try {
    circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
  } catch (error) {
    if (error instanceof CircleNotFoundError) notFound();
    throw error;
  }

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

  const membership = await circleRepo.findMembership(circle.id, session.user.id);
  if (!membership) notFound();

  const isOrganizer = isActiveOrganizer(membership);
  const callerRole = membership.role;

  const [hosts, players, allMoments, pendingMemberships, circleNetworks, membersFirstPage] = await Promise.all([
    prismaCircleRepository.findOrganizers(circle.id),
    prismaCircleRepository.findMembersByRole(circle.id, "PLAYER"),
    // Le Circle est déjà chargé — skipCircleCheck évite un findById redondant
    getCircleMoments(
      circle.id,
      { momentRepository: prismaMomentRepository, circleRepository: prismaCircleRepository },
      { skipCircleCheck: true }
    ),
    isOrganizer ? prismaCircleRepository.findPendingMemberships(circle.id) : Promise.resolve([]),
    prismaCircleNetworkRepository.findNetworksByCircleId(circle.id),
    prismaCircleRepository.findMembersPaginated(circle.id, {
      offset: 0,
      limit: 20,
      priorityUserId: session.user.id,
    }),
  ]);

  const totalMembers = hosts.length + players.length;
  const sortOrganizersByName = (a: CircleMemberWithUser, b: CircleMemberWithUser) => {
    const nameA = getDisplayName(a.user.firstName, a.user.lastName, a.user.email);
    const nameB = getDisplayName(b.user.firstName, b.user.lastName, b.user.email);
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  };
  const circleOrganizers = [
    ...hosts.filter((h) => h.role === "HOST").sort(sortOrganizersByName),
    ...hosts.filter((h) => h.role === "CO_HOST").sort(sortOrganizersByName),
  ];
  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);
  const allMembersForMeta = [...hosts, ...players].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  const visibleMemberAvatars = allMembersForMeta.slice(0, MEMBER_AVATARS_MAX);
  const memberNamesToShow = allMembersForMeta
    .slice(0, 2)
    .map((m) => getDisplayName(m.user.firstName, m.user.lastName, m.user.email));
  const memberOthersCount = Math.max(0, totalMembers - memberNamesToShow.length);
  const memberOthersText = memberOthersCount > 0 ? t("detail.andOthers", { count: memberOthersCount }) : "";
  const membersMetaText = memberOthersText
    ? `${memberNamesToShow.join(", ")} ${memberOthersText}`
    : memberNamesToShow.join(", ");
  const membersMetaMobileText = memberOthersText || memberNamesToShow.join(", ");
  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED" || (m.status === "DRAFT" && isOrganizer));
  const pastMoments = allMoments.filter((m) => m.status === "PAST" || m.status === "CANCELLED");

  // Récupère compteurs + inscriptions utilisateur pour TOUS les moments (upcoming + past)
  const allMomentIds = allMoments.map((m) => m.id);
  const [countByMomentId, userRegistrationsByMomentId] = await Promise.all([
    prismaRegistrationRepository.findRegisteredCountsByMomentIds(allMomentIds),
    prismaRegistrationRepository.findByMomentIdsAndUser(allMomentIds, session.user.id!),
  ]);
  const userStatusByMomentId = new Map(
    [...userRegistrationsByMomentId.entries()].map(([id, reg]) => [id, reg?.status ?? null])
  );

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/circles/${circle.slug}`;

  const gradient = getMomentGradient(circle.name);

  return (
    <div className="space-y-8">

      {/* Breadcrumb */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <Link
          href="/dashboard"
          className="hover:text-foreground shrink-0 transition-colors"
        >
          {tDashboard("title")}
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="text-foreground font-medium">
          {circle.name}
        </span>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + hosts + stats ────────────── */}
        {/* Sur mobile, le wrapper s'aplatit (max-lg:contents) pour permettre d'intercaler les blocs left/right via order-X */}
        <div className="max-lg:contents lg:flex lg:w-[340px] lg:shrink-0 lg:flex-col lg:gap-4 lg:sticky lg:top-20">

          {/* Groupe 1 — Cover (mobile: order-2, juste après le breadcrumb) */}
          <div className="max-lg:order-2">
            <CoverBlock
              coverImage={circle.coverImage}
              coverImageAttribution={circle.coverImageAttribution}
              gradient={gradient}
              altText={circle.name}
            />
          </div>

          {/* Groupe 2 — Organisateurs + Stats + CTA (mobile: order-4) */}
          <div className="flex flex-col gap-4 max-lg:order-4">

          {/* Organisateurs — HOST en premier, puis CO_HOSTs triés alphabétiquement */}
          {circleOrganizers.length > 0 && (
            <>
              <div className="space-y-2 px-1">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t("detail.hostedBy")}
                </p>
                <ul className="space-y-2">
                  {circleOrganizers.map((host) => {
                    const hostDisplayName = getDisplayName(host.user.firstName, host.user.lastName, host.user.email);
                    const avatar = (
                      <UserAvatar
                        name={hostDisplayName}
                        email={host.user.email}
                        image={host.user.image}
                        size="sm"
                      />
                    );
                    const nameText = (
                      <span className="text-sm font-medium leading-snug group-hover/organizer:text-primary dark:group-hover/organizer:text-[oklch(0.76_0.27_341)] transition-colors">
                        {hostDisplayName}
                      </span>
                    );
                    return (
                      <li key={host.id}>
                        {host.user.publicId ? (
                          <Link
                            href={`/u/${host.user.publicId}`}
                            className="group/organizer flex items-center gap-3"
                          >
                            {avatar}
                            {nameText}
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
              <div className="border-border border-t" />
            </>
          )}

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <CircleMembersDialog
              circleId={circle.id}
              initialMembers={membersFirstPage.members}
              initialTotal={membersFirstPage.total}
              initialHasMore={membersFirstPage.hasMore}
              callerRole={callerRole}
              showEmails={isOrganizer}
              circleName={circle.name}
              circleSlug={circle.slug}
              triggerClassName="group/stat flex cursor-pointer items-baseline gap-2"
            >
              <span className="text-2xl font-bold group-hover/stat:text-primary dark:group-hover/stat:text-[oklch(0.76_0.27_341)] transition-colors">{totalMembers}</span>
              <span className="text-muted-foreground text-sm">{t("detail.members")}</span>
            </CircleMembersDialog>
            <a
              href="#moments"
              className="group/stat flex items-baseline gap-2 border-l pl-6"
            >
              <span className="text-2xl font-bold group-hover/stat:text-primary dark:group-hover/stat:text-[oklch(0.76_0.27_341)] transition-colors">{allMoments.length}</span>
              <span className="text-muted-foreground text-sm">{t("detail.moments")}</span>
            </a>
          </div>

          {/* Séparateur — desktop uniquement */}
          <div className="border-border border-t max-lg:hidden" />

          {/* Actions Organisateur — Modifier + Supprimer (Supprimer réservé au HOST) */}
          {isOrganizer && (
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href={`/dashboard/circles/${circle.slug}/edit`}>
                  {tCommon("edit")}
                </Link>
              </Button>
              {membership.role === "HOST" && (
                <DeleteCircleDialog circleId={circle.id} triggerClassName="flex-1" />
              )}
            </div>
          )}

          {/* Badge Membre + Quitter — Participant uniquement */}
          {!isOrganizer && (
            <>
              <div className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("detail.isMember")}
              </div>
              <div className="px-1">
                <LeaveCircleDialog circleId={circle.id} circleName={circle.name} />
              </div>
            </>
          )}
          </div>
          {/* /Groupe 2 */}
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-5">

          {/* Groupe 3 — Pill + Titre + À propos (mobile: order-3) */}
          <div className="flex flex-col gap-5 max-lg:order-3">

          {/* Catégorie (pill) */}
          {categoryLabel && (
            <Badge variant="secondary" className="w-fit gap-1.5 border-border px-3 py-1 text-sm">
              <Tag className="size-4" />
              {categoryLabel}
            </Badge>
          )}

          {/* Titre */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {circle.name}
          </h1>

          {/* À propos */}
          {circle.description && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t("detail.about")}
              </p>
              <div className="lg:border-primary lg:border-l-2 lg:pl-4">
                <CollapsibleDescription text={circle.description} />
              </div>
            </div>
          )}

          </div>
          {/* /Groupe 3 */}

          {/* Groupe 4 — Meta + Demandes + Partage + Événements (mobile: order-5) */}
          <div className="flex flex-col gap-5 max-lg:order-5">

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Meta */}
          <div className="flex flex-col gap-3">

            {/* Membres — avatars + texte clicables (ouvre la modale) */}
            {visibleMemberAvatars.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Users className="text-primary size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {t("detail.members")}
                  </p>
                  <CircleMembersDialog
                    circleId={circle.id}
                    initialMembers={membersFirstPage.members}
                    initialTotal={membersFirstPage.total}
                    initialHasMore={membersFirstPage.hasMore}
                    callerRole={callerRole}
                    showEmails={isOrganizer}
                    circleName={circle.name}
                    circleSlug={circle.slug}
                    triggerClassName="group flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
                  >
                    <span className="flex -space-x-1.5">
                      {visibleMemberAvatars.map((m) => {
                        const displayName = getDisplayName(m.user.firstName, m.user.lastName, m.user.email);
                        return (
                          <span key={m.id} className="group/avatar relative">
                            <span
                              className="ring-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.55rem] font-semibold text-white ring-2"
                              style={{ background: getMomentGradient(m.user.email) }}
                            >
                              {m.user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={m.user.image}
                                  alt={displayName}
                                  referrerPolicy="no-referrer"
                                  className="absolute inset-0 size-full object-cover"
                                />
                              ) : (
                                getCircleUserInitials(m.user)
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
                      <span className="lg:hidden">{membersMetaMobileText}</span>
                      <span className="hidden lg:inline">{membersMetaText}</span>
                    </span>
                  </CircleMembersDialog>
                </div>
              </div>
            )}

            {/* Ville */}
            {circle.city && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <MapPin className="text-primary size-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {t("form.city")}
                  </p>
                  <p className="text-sm font-medium">{circle.city}</p>
                </div>
              </div>
            )}

            {/* Site web */}
            {circle.website && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Globe className="text-primary size-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {t("form.website")}
                  </p>
                  <a
                    href={circle.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                  >
                    {stripProtocol(circle.website)}
                  </a>
                </div>
              </div>
            )}

            {/* Visibilité */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                {circle.visibility === "PUBLIC" ? (
                  <Globe className="text-primary size-5" />
                ) : (
                  <Lock className="text-primary size-5" />
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t("detail.visibility")}
                </p>
                <p className="text-sm font-medium">
                  {circle.visibility === "PUBLIC"
                    ? t("detail.publicCircle")
                    : t("detail.privateCircle")}
                </p>
              </div>
            </div>

            {/* Créé le */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                <CalendarIcon className="text-primary size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t("detail.created")}
                </p>
                <p className="text-sm font-medium">
                  {formatLongDate(circle.createdAt, locale)}
                </p>
              </div>
            </div>

            {/* Réseaux */}
            {circleNetworks.map((network) => (
              <div key={network.id} className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Network className="text-primary size-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {tNetwork("memberOf")}
                  </p>
                  <Link
                    href={`/networks/${network.slug}`}
                    className="text-sm font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                  >
                    {network.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Demandes en attente — visible Organisateurs uniquement si requiresApproval */}
          {isOrganizer && circle.requiresApproval && (
            <>
              <div className="border-border border-t" />
              <div className="border-border bg-card rounded-2xl border p-6">
                {pendingMemberships.length > 0 ? (
                  <PendingMembershipsList
                    circleId={circle.id}
                    pendingMemberships={pendingMemberships}
                  />
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <ShieldCheck className="size-5 shrink-0" />
                    <p className="text-sm">{t("detail.noPendingMemberships")}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Partager & Inviter — visible Organisateurs uniquement */}
          {isOrganizer && (
            <>
              <div className="border-border border-t" />
              <CircleShareInviteCard
                circleId={circle.id}
                circleSlug={circle.slug}
                publicUrl={publicUrl}
                t={{
                  cardTitle: t("invite.cardTitle"),
                  shareableLink: t("invite.shareableLink"),
                  emailTitle: t("invite.emailTitle"),
                  emailPlaceholder: t("invite.emailPlaceholder"),
                  emailSend: t("invite.emailSend"),
                  emailSendMultiple: t("invite.emailSendMultiple"),
                  emailSent: t("invite.emailSent"),
                  emailInvalid: t("invite.emailInvalid"),
                  emailAddMore: t("invite.emailAddMore"),
                  emailMaxReached: t("invite.emailMaxReached", { max: 10 }),
                }}
              />
            </>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Moments — toggle + timeline */}
          <div id="moments" className="scroll-mt-24">
          <CircleMomentTabs
            upcomingLabel={t("detail.upcomingMoments")}
            pastLabel={t("detail.pastMoments")}
            upcomingAction={
              isOrganizer ? (
                <Button asChild size="sm" className="w-full md:w-auto">
                  <Link href={`/dashboard/circles/${circle.slug}/moments/new`}>
                    {tMoment("create.title")}
                  </Link>
                </Button>
              ) : undefined
            }
            upcomingContent={
              upcomingMoments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                  <p className="text-muted-foreground text-sm">
                    {t("detail.noUpcomingMoments")}
                  </p>
                </div>
              ) : (
                <PaginatedMomentList>
                  {upcomingMoments.map((moment, i) => (
                    <MomentTimelineItem
                      key={moment.id}
                      moment={moment}
                      circleSlug={circle.slug}
                      registrationCount={countByMomentId.get(moment.id) ?? 0}
                      userRegistrationStatus={userStatusByMomentId.get(moment.id) ?? null}
                      isOrganizer={isOrganizer}
                      isLast={i === upcomingMoments.length - 1}
                    />
                  ))}
                </PaginatedMomentList>
              )
            }
            pastContent={
              pastMoments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                  <p className="text-muted-foreground text-sm">
                    {t("detail.noPastMoments")}
                  </p>
                </div>
              ) : (
                <PaginatedMomentList>
                  {pastMoments.map((moment, i) => (
                    <MomentTimelineItem
                      key={moment.id}
                      moment={moment}
                      circleSlug={circle.slug}
                      registrationCount={countByMomentId.get(moment.id) ?? 0}
                      userRegistrationStatus={userStatusByMomentId.get(moment.id) ?? null}
                      isOrganizer={isOrganizer}
                      isLast={i === pastMoments.length - 1}
                    />
                  ))}
                </PaginatedMomentList>
              )
            }
          />
          </div>

          </div>
          {/* /Groupe 4 */}

        </div>
      </div>
    </div>
  );
}
