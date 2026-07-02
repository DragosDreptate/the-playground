import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { stripProtocol } from "@/lib/url";
import { isSessionAccountNew } from "@/lib/account-trust";
import { degradedQuery } from "@/lib/degraded-query";
import { formatLongDate } from "@/lib/format-date";
import type { RegistrationWithUser } from "@/domain/models/registration";
import type { CircleNetwork } from "@/domain/models/circle-network";
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
import { CircleShareButton } from "@/components/circles/circle-share-button";
import { getMomentGradient } from "@/lib/gradient";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { HostLink } from "@/components/circles/host-link";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
import { redirectToPublicCircle } from "@/lib/dashboard-circle-public-redirect";
import { isActiveOrganizer, visibleMembersFor } from "@/domain/models/circle";
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
import { isUpcomingCancelled, isPastMoment, byStartsAtDesc } from "@/lib/moment-timeline";
import { computeMembersMeta, sortCircleOrganizers } from "@/lib/circle-helpers";
import { MemberAvatarStack } from "@/components/circles/member-avatar-stack";
import { CircleOrganizersList } from "@/components/circles/circle-organizers-list";

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

  // Bounce visitors without a membership to the public circle page instead of a
  // 404 — typically someone who was handed the `/dashboard/circles/[slug]`
  // management link rather than the public `/circles/[slug]` one. PENDING members
  // keep their current access (the membership is non-null), so they are unaffected.
  const membership = await circleRepo.findMembership(circle.id, session.user.id);
  if (!membership) redirectToPublicCircle(slug);

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
    // pendingMemberships volontairement NON dégradé : l'état "aucune
    // demande" est indistinguable d'une dégradation et un Organisateur qui
    // croit la queue vide peut laisser des demandes non approuvées.
    isOrganizer ? prismaCircleRepository.findPendingMemberships(circle.id) : Promise.resolve([]),
    degradedQuery(
      prismaCircleNetworkRepository.findNetworksByCircleId(circle.id),
      [] as CircleNetwork[],
      "dashboard_circle_page:circle_networks",
    ),
    degradedQuery(
      prismaCircleRepository.findMembersPaginated(circle.id, {
        offset: 0,
        limit: 20,
        priorityUserId: session.user.id,
      }),
      { members: [], total: 0, hasMore: false },
      "dashboard_circle_page:members_first_page",
    ),
  ]);

  const totalMembers = hosts.length + players.length;
  const circleOrganizers = sortCircleOrganizers(hosts);
  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);
  const anonymousFallback = tCommon("anonymousFallback");
  // PII : l'email des membres n'est sérialisé qu'à l'Organisateur (SEC-11).
  const { visibleAvatars: visibleMemberAvatars, metaText: membersMetaText, metaMobileText: membersMetaMobileText } =
    computeMembersMeta(
      visibleMembersFor(isOrganizer, hosts),
      visibleMembersFor(isOrganizer, players),
      totalMembers,
      t,
      anonymousFallback,
    );
  const visibleMembers = visibleMembersFor(isOrganizer, membersFirstPage.members);
  // Un événement annulé encore daté dans le futur reste dans « prochains »
  // (affiché barré), les autres annulés rejoignent l'historique « passés »,
  // trié en antichronologique (le plus récent d'abord).
  const now = Date.now();
  const upcomingMoments = allMoments.filter(
    (m) => m.status === "PUBLISHED" || (m.status === "DRAFT" && isOrganizer) || isUpcomingCancelled(m, now)
  );
  const pastMoments = allMoments.filter((m) => isPastMoment(m, now)).sort(byStartsAtDesc);

  // Récupère compteurs + inscriptions utilisateur + top inscrits (avatars) pour TOUS les moments
  const allMomentIds = allMoments.map((m) => m.id);
  const [countByMomentId, userRegistrationsByMomentId, topAttendeesByMomentId] = await Promise.all([
    degradedQuery(
      prismaRegistrationRepository.findRegisteredCountsByMomentIds(allMomentIds),
      new Map<string, number>(),
      "dashboard_circle_page:registration_counts",
    ),
    // userRegistrations volontairement NON dégradé : si vide, chaque
    // Moment s'affiche "non inscrit" alors que l'utilisateur l'est, ce
    // qui le pousse à re-cliquer "S'inscrire" et déclencher une erreur
    // de contrainte unique. Mieux vaut une vraie erreur de page.
    prismaRegistrationRepository.findByMomentIdsAndUser(allMomentIds, session.user.id!),
    degradedQuery(
      prismaRegistrationRepository.findTopRegistrantsByMomentIds(allMomentIds, 3),
      new Map<string, RegistrationWithUser[]>(),
      "dashboard_circle_page:top_registrants",
    ),
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
            >
              <CircleShareButton
                url={publicUrl}
                ariaLabel={tCommon("share.communityLabel")}
                circleId={circle.id}
                circleSlug={circle.slug}
                circleName={circle.name}
              />
            </CoverBlock>
          </div>

          {/* Groupe 2 — Organisateurs + Stats + CTA (mobile: order-4) */}
          <div className="flex flex-col gap-4 max-lg:order-4">

          <CircleOrganizersList
            organizers={circleOrganizers}
            linkable
            label={t("detail.hostedBy")}
            anonymousFallback={anonymousFallback}
            contactOrganizer={
              isOrganizer
                ? undefined
                : {
                    circleId: circle.id,
                    senderEmail: session.user.email ?? null,
                    signInUrl: null,
                    accountTooNew: isSessionAccountNew(session),
                  }
            }
          />

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <CircleMembersDialog
              circleId={circle.id}
              initialMembers={visibleMembers}
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

          {/* Bouton Quitter — Participant uniquement */}
          {!isOrganizer && (
            <LeaveCircleDialog circleId={circle.id} circleName={circle.name} />
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
                    initialMembers={visibleMembers}
                    initialTotal={membersFirstPage.total}
                    initialHasMore={membersFirstPage.hasMore}
                    callerRole={callerRole}
                    showEmails={isOrganizer}
                    circleName={circle.name}
                    circleSlug={circle.slug}
                    triggerClassName="group flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
                  >
                    <MemberAvatarStack
                      members={visibleMemberAvatars}
                      anonymousFallback={anonymousFallback}
                    />
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
                      isLast={i === upcomingMoments.length - 1}
                      topAttendees={(topAttendeesByMomentId.get(moment.id) ?? []).map((r) => ({ user: { firstName: r.user.firstName, lastName: r.user.lastName, email: r.user.email, image: r.user.image } }))}
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
                      isLast={i === pastMoments.length - 1}
                      topAttendees={(topAttendeesByMomentId.get(moment.id) ?? []).map((r) => ({ user: { firstName: r.user.firstName, lastName: r.user.lastName, email: r.user.email, image: r.user.image } }))}
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
