import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { measureTime } from "@/lib/perf-logger";
import type { Metadata } from "next";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleViewTracker } from "@/components/circles/circle-view-tracker";
import { CircleMembersList } from "@/components/circles/circle-members-list";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMomentGradient } from "@/lib/gradient";
import { formatLongDate } from "@/lib/format-date";
import { getCircleUserInitials } from "@/lib/display-name";
import { FollowButton } from "@/components/circles/follow-button";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { HostLink } from "@/components/circles/host-link";
import { LeaveCircleDialog } from "@/components/circles/leave-circle-dialog";
import { MomentTimelineItem } from "@/components/circles/moment-timeline-item";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import Image from "next/image";
import {
  Globe,
  Lock,
  Users,
  CalendarIcon,
  ChevronRight,
  MapPin,
  ExternalLink,
  Crown,
} from "lucide-react";

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
    return {
      title: circle.name,
      description: circle.description,
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
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug, locale }, { tab }, t, tExplorer, tCategory, session] =
    await Promise.all([
      params,
      searchParams,
      getTranslations("Circle"),
      getTranslations("Explorer"),
      getTranslations("CircleCategory"),
      // Session optionnelle — les pages publiques sont accessibles sans auth
      measureTime("circle-page:auth", () => auth()),
    ]);

  const activeTab = tab === "past" ? "past" : "upcoming";

  // getCachedCircle déduplique la requête avec generateMetadata (React cache)
  const circle = await measureTime("circle-page:circle", () => getCachedCircle(slug));
  if (!circle) notFound();

  // Parallélise les requêtes indépendantes
  const parallelQueries: [
    ReturnType<typeof prismaCircleRepository.findMembersByRole>,
    ReturnType<typeof getCircleMoments>,
    ReturnType<typeof prismaCircleRepository.countMembers>,
    Promise<boolean | null>,
    Promise<boolean | null>,
    ReturnType<typeof prismaCircleRepository.findMembersByRole>,
  ] = [
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
    // Le Circle est déjà chargé — skipCircleCheck évite un findById redondant
    getCircleMoments(
      circle.id,
      { momentRepository: prismaMomentRepository, circleRepository: prismaCircleRepository },
      { skipCircleCheck: true }
    ),
    prismaCircleRepository.countMembers(circle.id),
    session?.user?.id
      ? prismaCircleRepository.findMembership(circle.id, session.user.id).then((m) => m !== null)
      : Promise.resolve(null),
    session?.user?.id
      ? prismaCircleRepository.getFollowStatus(session.user.id, circle.id)
      : Promise.resolve(null),
    // Players chargés uniquement pour les connectés (section membres)
    session?.user?.id
      ? prismaCircleRepository.findMembersByRole(circle.id, "PLAYER")
      : Promise.resolve([]),
  ];

  const [hosts, allMoments, memberCount, isMemberResult, isFollowingResult, players] =
    await measureTime("circle-page:data", () => Promise.all(parallelQueries));

  const isMember = isMemberResult === true;
  const isFollowing = isFollowingResult === true;
  const isHost = session?.user?.id
    ? hosts.some((h) => h.user.id === session.user!.id)
    : false;
  const isConnected = !!session?.user?.id;
  // Membres visibles : connecté + (circle public OU membre/organisateur)
  const canSeeMembers = isConnected && (circle.visibility === "PUBLIC" || isMember || isHost);
  const showFollowButton = !!session?.user?.id && !isMember;
  const showMemberBadge = isMember && !isHost;

  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED");
  const pastMoments = allMoments.filter(
    (m) => m.status === "PAST" || m.status === "CANCELLED"
  );
  const displayedMoments =
    activeTab === "past" ? pastMoments : upcomingMoments;

  const gradient = getMomentGradient(circle.name);

  return (
    <div className="space-y-8">
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
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">

          {/* Cover */}
          <div className="relative">
            <div
              className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
              style={{ background: gradient }}
            />
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ aspectRatio: "1 / 1" }}
            >
              {circle.coverImage ? (
                <Image
                  src={circle.coverImage}
                  alt={circle.name}
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
                      <Users className="size-6 text-white" />
                    </div>
                  </div>
                </>
              )}
              {circle.isDemo && (
                <span className="absolute top-2 left-2 rounded-md border border-primary/70 bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary">
                  {tExplorer("circleCard.demo")}
                </span>
              )}
            </div>
          </div>

          {/* Attribution photographe */}
          {circle.coverImageAttribution && (
            <p className="text-muted-foreground px-1 text-xs">
              Photo par{" "}
              <a
                href={circle.coverImageAttribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline"
              >
                {circle.coverImageAttribution.name}
              </a>{" "}
              sur Unsplash
            </p>
          )}

          {/* Hosts */}
          {hosts.length > 0 && (
            <div className="space-y-2 px-1">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t("detail.hosts")}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {hosts.slice(0, 5).map((host) => (
                  <div
                    key={host.id}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: getMomentGradient(host.user.email) }}
                    title={host.user.firstName ?? host.user.email}
                  >
                    {getCircleUserInitials(host.user)}
                  </div>
                ))}
                {hosts.length > 5 && (
                  <span className="text-muted-foreground text-xs">
                    +{hosts.length - 5}
                  </span>
                )}
              </div>
              <p className="flex flex-wrap gap-x-1 text-sm font-medium leading-snug">
                {hosts.map((h, i) => (
                  <span key={h.user.id}>
                    <HostLink user={h.user} linkDisabled={!isConnected} />
                    {i < hosts.length - 1 && ", "}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div>
              {isConnected ? (
                <a href="#members-section" className="text-2xl font-bold hover:underline underline-offset-2">
                  {memberCount}
                </a>
              ) : (
                <p className="text-2xl font-bold">{memberCount}</p>
              )}
              <p className="text-muted-foreground text-xs">{t("detail.members")}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-2xl font-bold">{allMoments.length}</p>
              <p className="text-muted-foreground text-xs">{t("detail.moments")}</p>
            </div>
          </div>

          {/* Badge Organisateur — visible pour les Organisateurs */}
          {isHost && (
            <div className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary">
              <Crown className="size-4 shrink-0" aria-hidden="true" />
              {t("detail.isHost")}
            </div>
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

          {/* Bouton Suivre — visible uniquement pour les utilisateurs connectés non-membres */}
          {showFollowButton && (
            <FollowButton circleId={circle.id} initialFollowing={isFollowing} />
          )}
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* "Organisé par" + raccourci Organisateur */}
          <div className="flex items-center justify-between gap-4">
            {hosts.length > 0 && (
              <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
                {t("detail.hostedBy")}
                {hosts.map((h, i) => (
                  <span key={h.user.id} className="flex items-center gap-1">
                    <HostLink user={h.user} className="text-foreground font-medium" linkDisabled={!isConnected} />
                    {i < hosts.length - 1 && <span>,</span>}
                  </span>
                ))}
              </p>
            )}
            {isHost && (
              <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
                <Link href={`/dashboard/circles/${circle.slug}`}>
                  <ExternalLink className="size-3.5" />
                  {t("detail.manageCircle")}
                </Link>
              </Button>
            )}
          </div>

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
              <CollapsibleDescription text={circle.description} />
            </div>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Meta */}
          <div className="flex flex-col gap-3">

            {/* Catégorie */}
            {circle.category && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <span className="text-primary text-base">🏷</span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("form.category")}
                  </p>
                  <p className="text-sm font-medium">
                    <Badge variant="secondary" className="text-xs">
                      {circle.category === "OTHER" && circle.customCategory
                        ? circle.customCategory
                        : tCategory(circle.category)}
                    </Badge>
                  </p>
                </div>
              </div>
            )}

            {/* Ville */}
            {circle.city && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <MapPin className="text-primary size-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("form.city")}
                  </p>
                  <p className="text-sm font-medium">{circle.city}</p>
                </div>
              </div>
            )}

            {/* Visibilité */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                {circle.visibility === "PUBLIC" ? (
                  <Globe className="text-primary size-4" />
                ) : (
                  <Lock className="text-primary size-4" />
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("detail.visibility")}
                </p>
                <p className="text-sm font-medium">
                  {circle.visibility === "PUBLIC"
                    ? t("detail.publicCircle")
                    : t("detail.privateCircle")}
                </p>
              </div>
            </div>

            {/* Membres */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Users className="text-primary size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("detail.members")}
                </p>
                <p className="text-sm font-medium">
                  {t("detail.memberCount", { count: memberCount })}
                </p>
              </div>
            </div>

            {/* Créé le */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <CalendarIcon className="text-primary size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("detail.created")}
                </p>
                <p className="text-sm font-medium">
                  {formatLongDate(circle.createdAt, locale)}
                </p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Moments — toggle + timeline */}
          <div className="space-y-6">
            {/* Tab selector */}
            <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
              <Link
                href="?tab=upcoming"
                className={`whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                  activeTab === "upcoming"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("detail.upcomingMoments")}
              </Link>
              <Link
                href="?tab=past"
                className={`whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                  activeTab === "past"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("detail.pastMoments")}
              </Link>
            </div>

            {displayedMoments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <p className="text-muted-foreground text-sm">
                  {activeTab === "upcoming"
                    ? t("detail.noUpcomingMoments")
                    : t("detail.noPastMoments")}
                </p>
              </div>
            ) : (
              <div>
                {displayedMoments.map((moment, i) => (
                  <MomentTimelineItem
                    key={moment.id}
                    moment={moment}
                    circleSlug={circle.slug}
                    registrationCount={0}
                    userRegistrationStatus={null}
                    isHost={false}
                    isLast={i === displayedMoments.length - 1}
                    variant="public"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section Membres */}
          {(canSeeMembers || !isConnected) && (
            <div id="members-section" className="border-border bg-card rounded-2xl border p-6">
              {canSeeMembers ? (
                <CircleMembersList
                  hosts={hosts}
                  players={players}
                  variant="member-view"
                />
              ) : (
                <p className="text-muted-foreground text-center text-sm py-4">
                  {t("detail.signInToSeeMembers")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
