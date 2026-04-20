import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { stripProtocol } from "@/lib/url";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

// ── Helpers ───────────────────────────────────────────────────


// ── Page ──────────────────────────────────────────────────────

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, t, tCommon, tDashboard, tCategory, tMoment, tNetwork, session] = await Promise.all([
    params,
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
  const MEMBER_AVATARS_MAX = 5;
  const allMembersForMeta = [...hosts, ...players].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  const visibleMemberAvatars = allMembersForMeta.slice(0, MEMBER_AVATARS_MAX);
  const memberNamesToShow = allMembersForMeta
    .slice(0, 2)
    .map((m) => getDisplayName(m.user.firstName, m.user.lastName, m.user.email));
  const memberOthersCount = Math.max(0, totalMembers - memberNamesToShow.length);
  const membersMetaText =
    memberOthersCount > 0
      ? `${memberNamesToShow.join(", ")} ${t("detail.andOthers", { count: memberOthersCount })}`
      : memberNamesToShow.join(", ");
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
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-20">

          <CoverBlock
            coverImage={circle.coverImage}
            coverImageAttribution={circle.coverImageAttribution}
            gradient={gradient}
            altText={circle.name}
          />

          {/* Organisateurs — HOST en premier, puis CO_HOSTs triés alphabétiquement */}
          {circleOrganizers.length > 0 && (
            <>
              <div className="space-y-2 px-1">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t("detail.hostedBy")}
                </p>
                <ul className="space-y-2">
                  {circleOrganizers.map((host) => (
                    <li key={host.id} className="flex items-center gap-3">
                      <UserAvatar
                        name={getDisplayName(host.user.firstName, host.user.lastName, host.user.email)}
                        email={host.user.email}
                        image={host.user.image}
                        size="sm"
                      />
                      <HostLink
                        user={host.user}
                        className="text-sm font-medium leading-snug"
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-border border-t" />
            </>
          )}

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div>
              <CircleMembersDialog
                circleId={circle.id}
                initialMembers={membersFirstPage.members}
                initialTotal={membersFirstPage.total}
                initialHasMore={membersFirstPage.hasMore}
                callerRole={callerRole}
                showEmails={isOrganizer}
                triggerClassName="cursor-pointer text-2xl font-bold underline-offset-2 hover:underline"
              >
                {totalMembers}
              </CircleMembersDialog>
              <p className="text-muted-foreground text-xs">
                {t("detail.members")}
              </p>
            </div>
            <div className="border-l pl-6">
              <p className="text-2xl font-bold">{allMoments.length}</p>
              <p className="text-muted-foreground text-xs">
                {t("detail.moments")}
              </p>
            </div>
          </div>

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

          {/* Quitter la Communauté — Participant uniquement */}
          {!isOrganizer && (
            <div className="px-1">
              <LeaveCircleDialog circleId={circle.id} circleName={circle.name} />
            </div>
          )}
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* Catégorie (pill) */}
          {categoryLabel && (
            <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1 text-sm">
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
              <div className="border-primary border-l-2 pl-4">
                <CollapsibleDescription text={circle.description} />
              </div>
            </div>
          )}

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
                    triggerClassName="group flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
                  >
                    <TooltipProvider>
                      <span className="flex -space-x-1.5">
                        {visibleMemberAvatars.map((m) => {
                          const displayName = getDisplayName(m.user.firstName, m.user.lastName, m.user.email);
                          return (
                            <Tooltip key={m.id}>
                              <TooltipTrigger asChild>
                                <span
                                  className="ring-card relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.65rem] font-semibold text-white ring-2"
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
                              </TooltipTrigger>
                              <TooltipContent>{displayName}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </span>
                    </TooltipProvider>
                    <span className="text-sm font-medium underline-offset-2 group-hover:underline">
                      {membersMetaText}
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
                    className="text-sm font-medium hover:underline underline-offset-2"
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
                  {circle.createdAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
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
                    className="text-sm font-medium underline-offset-2 hover:underline"
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
    </div>
  );
}
