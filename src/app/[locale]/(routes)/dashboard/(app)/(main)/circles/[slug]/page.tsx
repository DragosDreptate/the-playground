import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleNotFoundError } from "@/domain/errors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteCircleDialog } from "@/components/circles/delete-circle-dialog";
import { MomentsTabSelector } from "@/components/circles/moments-tab-selector";
import { MomentTimelineItem } from "@/components/circles/moment-timeline-item";
import { CircleMembersList } from "@/components/circles/circle-members-list";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import { getMomentGradient } from "@/lib/gradient";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import {
  Globe,
  Lock,
  Users,
  CalendarIcon,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";

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

// ── Page ──────────────────────────────────────────────────────

export default async function CircleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, { tab }, t, tCommon, tDashboard, session] = await Promise.all([
    params,
    searchParams,
    getTranslations("Circle"),
    getTranslations("Common"),
    getTranslations("Dashboard"),
    auth(),
  ]);

  const activeTab = tab === "past" ? "past" : "upcoming";

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

  const membership = await prismaCircleRepository.findMembership(
    circle.id,
    session.user.id
  );
  if (!membership) notFound();

  const isHost = membership.role === "HOST";

  const [hosts, players, allMoments] = await Promise.all([
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
    prismaCircleRepository.findMembersByRole(circle.id, "PLAYER"),
    getCircleMoments(
      circle.id,
      { momentRepository: prismaMomentRepository, circleRepository: prismaCircleRepository },
      { skipCircleCheck: true }
    ),
  ]);

  const totalMembers = hosts.length + players.length;
  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED");
  const pastMoments = allMoments.filter((m) => m.status === "PAST" || m.status === "CANCELLED");
  const displayedMoments = activeTab === "past" ? pastMoments : upcomingMoments;

  // Récupère compteurs + inscriptions utilisateur en deux requêtes GROUP BY (évite le N+1)
  const momentIds = displayedMoments.map((m) => m.id);
  const [countByMomentId, userRegistrationsByMomentId] = await Promise.all([
    prismaRegistrationRepository.findRegisteredCountsByMomentIds(momentIds),
    prismaRegistrationRepository.findByMomentIdsAndUser(momentIds, session.user.id!),
  ]);
  const userStatusByMomentId = new Map(
    [...userRegistrationsByMomentId.entries()].map(([id, reg]) => [id, reg?.status ?? null])
  );

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/circles/${circle.slug}`;

  const gradient = getMomentGradient(circle.name);
  const hostNames = formatHostNames(hosts);

  return (
    <div className="space-y-8">

      {/* Breadcrumb + role badge */}
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            {tDashboard("title")}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground truncate font-medium">
            {circle.name}
          </span>
        </div>
        <Badge
          variant={isHost ? "outline" : "secondary"}
          className={isHost ? "border-primary/40 text-primary" : ""}
        >
          {isHost ? tDashboard("role.host") : tDashboard("role.player")}
        </Badge>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + hosts + stats ────────────── */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">

          {/* Cover — carré, glow blur */}
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

          {/* Hosts bloc */}
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
              <p className="text-2xl font-bold">{totalMembers}</p>
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
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* "Organisé par" + actions Host */}
          <div className="flex items-center justify-between gap-4">
            {hosts.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {t("detail.hostedBy")}{" "}
                <span className="text-foreground font-medium">{hostNames}</span>
              </p>
            )}
            {isHost && (
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm">
                  <Link href={`/dashboard/circles/${circle.slug}/edit`}>
                    {tCommon("edit")}
                  </Link>
                </Button>
                <DeleteCircleDialog circleId={circle.id} />
              </div>
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
              <p className="text-sm leading-relaxed">{circle.description}</p>
            </div>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Meta */}
          <div className="flex flex-col gap-3">

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
                  {t("detail.memberCount", { count: totalMembers })}
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

          {/* Lien partageable — visible Organisateurs uniquement */}
          {isHost && (
            <div className="border-border bg-card rounded-xl border p-4 flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto] lg:gap-x-3 lg:gap-y-2">
              <div className="flex items-center gap-2 lg:col-span-2">
                <LinkIcon className="text-muted-foreground size-4 shrink-0" />
                <span className="text-sm font-medium">{t("detail.shareableLink")}</span>
              </div>
              <Link
                href={`/circles/${circle.slug}`}
                target="_blank"
                className="border-border bg-muted/50 hover:border-primary hover:bg-primary/5 rounded-lg border px-3 py-2 transition-colors min-w-0"
              >
                <span className="text-muted-foreground block truncate font-mono text-sm">
                  {publicUrl.replace(/^https?:\/\//, "")}
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <CopyLinkButton value={publicUrl} />
              </div>
            </div>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Moments — toggle + timeline */}
          <div className="space-y-6">
            <MomentsTabSelector
              activeTab={activeTab}
              isHost={isHost}
              circleSlug={circle.slug}
            />

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
                    registrationCount={countByMomentId.get(moment.id) ?? 0}
                    userRegistrationStatus={userStatusByMomentId.get(moment.id) ?? null}
                    isHost={isHost}
                    isLast={i === displayedMoments.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Membres */}
          <div className="border-border rounded-2xl border p-6">
            <CircleMembersList hosts={hosts} players={players} variant={isHost ? "host" : "player"} />
          </div>
        </div>
      </div>
    </div>
  );
}
