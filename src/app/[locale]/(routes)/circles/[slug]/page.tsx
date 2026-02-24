import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { getMomentGradient } from "@/lib/gradient";
import { FollowButton } from "@/components/circles/follow-button";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import {
  Globe,
  Lock,
  Users,
  CalendarIcon,
  ChevronRight,
  MapPin,
  XCircle,
} from "lucide-react";

export const revalidate = 60;

// ── Helpers ───────────────────────────────────────────────────

function getInitials(user: CircleMemberWithUser["user"]): string {
  if (user.firstName && user.lastName)
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName[0].toUpperCase();
  return user.email[0].toUpperCase();
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

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
    return {
      title: circle.name,
      description: circle.description,
      openGraph: {
        title: circle.name,
        description: circle.description ?? undefined,
        type: "website",
      },
      twitter: {
        title: circle.name,
        description: circle.description ?? undefined,
      },
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "past" ? "past" : "upcoming";

  const t = await getTranslations("Circle");
  const tExplorer = await getTranslations("Explorer");
  const tCategory = await getTranslations("CircleCategory");
  const tDashboard = await getTranslations("Dashboard");
  const tMoment = await getTranslations("Moment");

  // Session optionnelle — les pages publiques sont accessibles sans auth
  const session = await auth();

  let circle;
  try {
    circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
  } catch (error) {
    if (error instanceof CircleNotFoundError) notFound();
    throw error;
  }

  // Only PUBLIC circles are accessible without auth
  if (circle.visibility !== "PUBLIC") notFound();

  // Parallélise les requêtes indépendantes
  const parallelQueries: [
    ReturnType<typeof prismaCircleRepository.findMembersByRole>,
    ReturnType<typeof getCircleMoments>,
    ReturnType<typeof prismaCircleRepository.countMembers>,
    Promise<boolean | null>,
    Promise<boolean | null>,
  ] = [
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
    getCircleMoments(circle.id, {
      momentRepository: prismaMomentRepository,
      circleRepository: prismaCircleRepository,
    }),
    prismaCircleRepository.countMembers(circle.id),
    session?.user?.id
      ? prismaCircleRepository.findMembership(circle.id, session.user.id).then((m) => m !== null)
      : Promise.resolve(null),
    session?.user?.id
      ? prismaCircleRepository.getFollowStatus(session.user.id, circle.id)
      : Promise.resolve(null),
  ];

  const [hosts, allMoments, memberCount, isMemberResult, isFollowingResult] =
    await Promise.all(parallelQueries);

  const isMember = isMemberResult === true;
  const isFollowing = isFollowingResult === true;
  const isHost = session?.user?.id
    ? hosts.some((h) => h.user.id === session.user!.id)
    : false;
  const showFollowButton = !!session?.user?.id && !isMember;
  const showMemberBadge = isMember && !isHost;

  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED");
  const pastMoments = allMoments.filter(
    (m) => m.status === "PAST" || m.status === "CANCELLED"
  );
  const displayedMoments =
    activeTab === "past" ? pastMoments : upcomingMoments;

  const gradient = getMomentGradient(circle.name);
  const hostNames = formatHostNames(hosts);

  return (
    <div className="space-y-8">
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={circle.coverImage}
                  alt={circle.name}
                  className="size-full object-cover"
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
                    {getInitials(host.user)}
                  </div>
                ))}
                {hosts.length > 5 && (
                  <span className="text-muted-foreground text-xs">
                    +{hosts.length - 5}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-snug">{hostNames}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div>
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-muted-foreground text-xs">{t("detail.members")}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-2xl font-bold">{allMoments.length}</p>
              <p className="text-muted-foreground text-xs">{t("detail.moments")}</p>
            </div>
          </div>

          {/* Badge Membre — visible pour les membres non-Organisateurs */}
          {showMemberBadge && (
            <div className="flex w-full items-center justify-center gap-2 rounded-full border border-green-500/25 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-400">
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

          {/* Bouton Suivre — visible uniquement pour les utilisateurs connectés non-membres */}
          {showFollowButton && (
            <FollowButton circleId={circle.id} initialFollowing={isFollowing} />
          )}
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* "Organisé par" */}
          {hosts.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {t("detail.hostedBy")}{" "}
              <span className="text-foreground font-medium">{hostNames}</span>
            </p>
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
              <p className="text-sm leading-relaxed">{circle.description}</p>
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
                      {tCategory(circle.category)}
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
                  {circle.createdAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
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
                className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                  activeTab === "upcoming"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("detail.upcomingMoments")}
              </Link>
              <Link
                href="?tab=past"
                className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
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
                {displayedMoments.map((moment, i) => {
                  const isLast = i === displayedMoments.length - 1;
                  const isCancelled = moment.status === "CANCELLED";
                  const momentGradient = getMomentGradient(moment.title);

                  const timeStr = moment.startsAt.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const weekday = moment.startsAt.toLocaleDateString(undefined, { weekday: "short" });
                  const dateStr = moment.startsAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const now = new Date();
                  const isToday = moment.startsAt.toDateString() === now.toDateString();

                  const locationLabel =
                    moment.locationType === "ONLINE" || moment.locationType === "HYBRID"
                      ? moment.locationType === "ONLINE" ? tDashboard("online") : tDashboard("hybrid")
                      : moment.locationName ?? moment.locationAddress ?? null;
                  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

                  return (
                    <div key={moment.id} className="flex gap-0">
                      {/* Date column */}
                      <div className="w-[100px] shrink-0 pr-4 pt-1 text-right">
                        {isToday ? (
                          <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            {t("detail.today")}
                          </span>
                        ) : (
                          <>
                            <p className="text-muted-foreground text-xs">{weekday}</p>
                            <p className="text-sm font-medium leading-snug">{dateStr}</p>
                          </>
                        )}
                      </div>

                      {/* Dot + vertical line */}
                      <div className="flex shrink-0 flex-col items-center">
                        <div className={`mt-2 size-2 shrink-0 rounded-full ${isCancelled ? "bg-destructive/50" : "bg-border"}`} />
                        {!isLast && (
                          <div className="mt-2 flex-1 border-l border-dashed border-border" />
                        )}
                      </div>

                      {/* Card */}
                      <div className={`min-w-0 flex-1 pl-4 ${isLast ? "pb-0" : "pb-8"}`}>
                        <Link href={`/m/${moment.slug}`} className="group block">
                          <div className={`bg-card flex flex-col rounded-xl border transition-colors ${isCancelled ? "border-destructive/20" : "border-border hover:border-primary/30"}`}>
                            {isCancelled && (
                              <div className="flex items-center gap-2 rounded-t-xl border-b border-destructive/20 bg-destructive/10 px-4 py-2">
                                <XCircle className="size-3.5 shrink-0 text-destructive" />
                                <span className="text-destructive text-xs font-medium">{tMoment("public.eventCancelled")}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-4 p-4">
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-muted-foreground text-xs">{timeStr}</p>
                                <p className={`truncate font-semibold leading-snug ${isCancelled ? "text-muted-foreground line-through" : "group-hover:underline"}`}>
                                  {moment.title}
                                </p>
                                {locationLabel && (
                                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                    <LocationIcon className="size-3.5 shrink-0" />
                                    <span className="truncate">{locationLabel}</span>
                                  </div>
                                )}
                              </div>
                              <div
                                className={`size-[60px] shrink-0 rounded-lg ${isCancelled ? "grayscale opacity-40" : ""}`}
                                style={{ background: momentGradient }}
                              />
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
