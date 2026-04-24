import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { measureTime } from "@/lib/perf-logger";
import { stripProtocol } from "@/lib/url";
import type { Metadata } from "next";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaCircleNetworkRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleViewTracker } from "@/components/circles/circle-view-tracker";
import { CircleMembersDialog } from "@/components/circles/circle-members-dialog";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMomentGradient } from "@/lib/gradient";
import { formatLongDate } from "@/lib/format-date";
import { getDisplayName } from "@/lib/display-name";
import { UserAvatar } from "@/components/user-avatar";
import { JoinCircleButton } from "@/components/circles/join-circle-button";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { HostLink } from "@/components/circles/host-link";
import { LeaveCircleDialog } from "@/components/circles/leave-circle-dialog";
import { MomentTimelineItem } from "@/components/circles/moment-timeline-item";
import { CircleMomentTabs } from "@/components/circles/circle-moment-tabs";
import { PaginatedMomentList } from "@/components/circles/paginated-moment-list";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { DemoBadge } from "@/components/badges/demo-badge";
import { CoverBlock } from "@/components/circles/cover-block";
import { isValidSlug } from "@/lib/slug";
import {
  Globe,
  Lock,
  Users,
  CalendarIcon,
  ChevronRight,
  MapPin,
  ExternalLink,
  Clock,
  Network,
  Tag,
} from "lucide-react";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";
import { MEMBER_AVATARS_MAX } from "@/lib/circle-constants";
import { MemberAvatarStack } from "@/components/circles/member-avatar-stack";

export const revalidate = 60;

// Deduplicate DB call between generateMetadata and the page (identique au pattern /m/[slug])
const getCachedCircle = cache(async (slug: string) => {
  try {
    return await getCircleBySlug(slug, { circleRepository: prismaCircleRepository });
  } catch {
    return null;
  }
});

// ── Helpers ───────────────────────────────────────────────────

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const circle = await getCachedCircle(slug);
    if (!circle) return {};
    const isPrivate = circle.visibility !== "PUBLIC";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      title: circle.name,
      description: circle.description,
      alternates: {
        canonical: `${appUrl}/circles/${slug}`,
        languages: {
          fr: `${appUrl}/circles/${slug}`,
          en: `${appUrl}/en/circles/${slug}`,
        },
      },
      ...(isPrivate && { robots: { index: false, follow: false } }),
      ...(!isPrivate && {
        openGraph: {
          title: circle.name,
          description: circle.description ?? undefined,
          type: "website",
        },
        twitter: {
          title: circle.name,
          description: circle.description ?? undefined,
        },
      }),
    };
  } catch {
    return {};
  }
}

// ── Page ──────────────────────────────────────────────────────

export default async function PublicCirclePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  if (!isValidSlug(slug)) notFound();

  const [t, tExplorer, tCategory, tNetwork, session] =
    await Promise.all([
      getTranslations("Circle"),
      getTranslations("Explorer"),
      getTranslations("CircleCategory"),
      getTranslations("Network"),
      // Session optionnelle — les pages publiques sont accessibles sans auth
      measureTime("circle-page:auth", () => auth()),
    ]);


  // getCachedCircle déduplique la requête avec generateMetadata (React cache)
  const circle = await measureTime("circle-page:circle", () => getCachedCircle(slug));
  if (!circle) notFound();

  // Parallélise les requêtes indépendantes
  const parallelQueries: [
    ReturnType<typeof prismaCircleRepository.findMembersByRole>,
    ReturnType<typeof getCircleMoments>,
    ReturnType<typeof prismaCircleRepository.countMembers>,
    Promise<import("@/domain/models/circle").MembershipStatus | null>,
    ReturnType<typeof prismaCircleRepository.findMembersByRole>,
  ] = [
    prismaCircleRepository.findOrganizers(circle.id),
    // Le Circle est déjà chargé — skipCircleCheck évite un findById redondant
    getCircleMoments(
      circle.id,
      { momentRepository: prismaMomentRepository, circleRepository: prismaCircleRepository },
      { skipCircleCheck: true }
    ),
    prismaCircleRepository.countMembers(circle.id),
    session?.user?.id
      ? prismaCircleRepository.findMembership(circle.id, session.user.id).then((m) => m?.status ?? null)
      : Promise.resolve(null),
    prismaCircleRepository.findMembersByRole(circle.id, "PLAYER"),
  ];

  const [hosts, allMoments, memberCount, isMemberResult, players] =
    await measureTime("circle-page:data", () => Promise.all(parallelQueries));

  const isMember = isMemberResult === "ACTIVE";
  const isPendingMember = isMemberResult === "PENDING";
  const isOrganizer = session?.user?.id
    ? hosts.some((h) => h.user.id === session.user!.id)
    : false;
  const isConnected = !!session?.user?.id;
  const primaryHosts = hosts.filter((h) => h.role === "HOST");
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
  const memberOthersCount = Math.max(0, memberCount - memberNamesToShow.length);
  const memberOthersText = memberOthersCount > 0 ? t("detail.andOthers", { count: memberOthersCount }) : "";
  const membersMetaText = memberOthersText
    ? `${memberNamesToShow.join(", ")} ${memberOthersText}`
    : memberNamesToShow.join(", ");
  const membersMetaMobileText = memberOthersText || memberNamesToShow.join(", ");
  // Membres visibles : connecté + (circle public OU membre/organisateur)
  const canSeeMembers = isConnected && (circle.visibility === "PUBLIC" || isMember || isOrganizer);
  const showJoinButton = isConnected && !isMember && !isPendingMember;
  const showSignInToJoin = !isConnected;
  const showMemberBadge = isMember && !isOrganizer;

  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED");
  const pastMoments = allMoments.filter(
    (m) => m.status === "PAST" || m.status === "CANCELLED"
  );
  // Fetch registration counts + top attendees (avatars) pour TOUS les moments (upcoming + past)
  const allMomentIds = allMoments.map((m) => m.id);
  const [countByMomentId, topAttendeesByMomentId, circleNetworks, membersFirstPage] = await Promise.all([
    prismaRegistrationRepository.findRegisteredCountsByMomentIds(allMomentIds),
    prismaRegistrationRepository.findTopRegistrantsByMomentIds(allMomentIds, 3),
    prismaCircleNetworkRepository.findNetworksByCircleId(circle.id),
    canSeeMembers
      ? prismaCircleRepository.findMembersPaginated(circle.id, {
          offset: 0,
          limit: 20,
          priorityUserId: session?.user?.id ?? null,
        })
      : Promise.resolve({ members: [], total: 0, hasMore: false }),
  ]);

  const gradient = getMomentGradient(circle.name);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const jsonLd =
    circle.visibility === "PUBLIC"
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: circle.name,
          ...(circle.description && { description: circle.description }),
          url: `${appUrl}/circles/${circle.slug}`,
          ...(circle.city && { location: { "@type": "Place", name: circle.city } }),
          ...(circle.coverImage && { image: circle.coverImage }),
          ...(circle.website && { sameAs: circle.website }),
        }
      : null;

  return (
    <div className="space-y-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CircleViewTracker
        circleId={circle.id}
        circleSlug={circle.slug}
        circleName={circle.name}
        visibility={circle.visibility}
        memberCount={memberCount}
      />
      {/* Breadcrumb */}
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href="/explorer" className="hover:text-foreground transition-colors">
          {tExplorer("title")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate font-medium">{circle.name}</span>
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
              {circle.isDemo && <DemoBadge label={tExplorer("circleCard.demo")} size="lg" />}
            </CoverBlock>
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
                    const linkable = isConnected && host.user.publicId;
                    return (
                      <li key={host.id}>
                        {linkable ? (
                          <Link
                            href={`/u/${host.user.publicId}`}
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
              <div className="border-border border-t" />
            </>
          )}

          {/* Stats */}
          <div className="flex gap-6 px-1">
            {canSeeMembers ? (
              <CircleMembersDialog
                circleId={circle.id}
                initialMembers={membersFirstPage.members}
                initialTotal={membersFirstPage.total}
                initialHasMore={membersFirstPage.hasMore}
                triggerClassName="group/stat flex cursor-pointer items-baseline gap-2"
              >
                <span className="text-2xl font-bold group-hover/stat:text-primary dark:group-hover/stat:text-[oklch(0.76_0.27_341)] transition-colors">{memberCount}</span>
                <span className="text-muted-foreground text-sm">{t("detail.members")}</span>
              </CircleMembersDialog>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{memberCount}</span>
                <span className="text-muted-foreground text-sm">{t("detail.members")}</span>
              </div>
            )}
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

          {/* CTA "Gérer cette communauté" — visible pour les Organisateurs */}
          {isOrganizer && (
            <Button asChild size="sm" className="w-full gap-2">
              <Link href={`/dashboard/circles/${circle.slug}`}>
                <ExternalLink className="size-4" />
                {t("detail.manageCircle")}
              </Link>
            </Button>
          )}

          {/* Badge Membre — visible pour les membres non-Organisateurs */}
          {showMemberBadge && (
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
          )}

          {/* Bouton Quitter — visible pour les membres non-Organisateurs */}
          {showMemberBadge && (
            <LeaveCircleDialog circleId={circle.id} circleName={circle.name} />
          )}

          {/* Badge en attente — visible quand la demande est en cours de validation */}
          {isPendingMember && (
            <div className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-sm font-medium text-amber-500">
              <Clock className="size-4" />
              {t("detail.pendingApproval")}
            </div>
          )}

          {/* Bouton Rejoindre — visible uniquement pour les utilisateurs connectés non-membres */}
          {showJoinButton && (
            <JoinCircleButton circleId={circle.id} requiresApproval={circle.requiresApproval} />
          )}

          {/* CTA Se connecter — visible pour les visiteurs non-authentifiés */}
          {showSignInToJoin && (
            <Button variant="default" size="sm" asChild className="w-full gap-2">
              <a href={`/${locale}/auth/sign-in?callbackUrl=/${locale}/circles/${slug}`}>
                <Users className="size-4" />
                {t("detail.signInToJoin")}
              </a>
            </Button>
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

          {/* Groupe 4 — Meta + Événements (mobile: order-5) */}
          <div className="flex flex-col gap-5 max-lg:order-5">

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Meta */}
          <div className="flex flex-col gap-3">

            {/* Membres — avatars + texte clicables si canSeeMembers, sinon statique */}
            {visibleMemberAvatars.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Users className="text-primary size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {t("detail.members")}
                  </p>
                  {canSeeMembers ? (
                    <CircleMembersDialog
                      circleId={circle.id}
                      initialMembers={membersFirstPage.members}
                      initialTotal={membersFirstPage.total}
                      initialHasMore={membersFirstPage.hasMore}
                      triggerClassName="group flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
                    >
                      <MemberAvatarStack members={visibleMemberAvatars} />
                      <span className="text-sm font-medium group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
                        <span className="lg:hidden">{membersMetaMobileText}</span>
                        <span className="hidden lg:inline">{membersMetaText}</span>
                      </span>
                    </CircleMembersDialog>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <MemberAvatarStack members={visibleMemberAvatars} />
                      <span className="text-sm font-medium">
                        <span className="lg:hidden">{membersMetaMobileText}</span>
                        <span className="hidden lg:inline">{membersMetaText}</span>
                      </span>
                    </div>
                  )}
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

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Moments — toggle + timeline */}
          <div id="moments" className="scroll-mt-24">
          <CircleMomentTabs
            upcomingLabel={t("detail.upcomingMoments")}
            pastLabel={t("detail.pastMoments")}
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
                      userRegistrationStatus={null}
                      isOrganizer={false}
                      isLast={i === upcomingMoments.length - 1}
                      variant="public"
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
                      userRegistrationStatus={null}
                      isOrganizer={false}
                      isLast={i === pastMoments.length - 1}
                      variant="public"
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
