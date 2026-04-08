import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { stripProtocol } from "@/lib/url";
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
import { LeaveCircleDialog } from "@/components/circles/leave-circle-dialog";
import { MomentsTabSelector } from "@/components/circles/moments-tab-selector";
import { MomentTimelineItem } from "@/components/circles/moment-timeline-item";
import { CircleMembersList } from "@/components/circles/circle-members-list";
import { CircleShareInviteCard } from "@/components/circles/circle-share-invite-card";
import { PendingMembershipsList } from "@/components/circles/pending-requests-list";
import { generateCircleInviteToken } from "@/domain/usecases/generate-circle-invite-token";
import { getMomentGradient } from "@/lib/gradient";
import { getCircleUserInitials } from "@/lib/display-name";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { HostLink } from "@/components/circles/host-link";
import { resolveCircleRepository } from "@/lib/admin-host-mode";
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
  ShieldCheck,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────


// ── Page ──────────────────────────────────────────────────────

export default async function CircleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, { tab }, t, tCommon, tDashboard, tCategory, session] = await Promise.all([
    params,
    searchParams,
    getTranslations("Circle"),
    getTranslations("Common"),
    getTranslations("Dashboard"),
    getTranslations("CircleCategory"),
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

  const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

  const membership = await circleRepo.findMembership(circle.id, session.user.id);
  if (!membership) notFound();

  const isHost = membership.role === "HOST";

  // Auto-génère le token d'invitation pour l'Organisateur si absent
  // Le lien est toujours affiché (pas de bouton "Générer" — conforme au mockup)
  if (isHost && !circle.inviteToken) {
    const result = await generateCircleInviteToken(
      { circleId: circle.id, userId: session.user.id },
      { circleRepository: circleRepo }
    );
    circle = result.circle;
  }

  const [hosts, players, allMoments, pendingMemberships] = await Promise.all([
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
    prismaCircleRepository.findMembersByRole(circle.id, "PLAYER"),
    // Le Circle est déjà chargé — skipCircleCheck évite un findById redondant
    getCircleMoments(
      circle.id,
      { momentRepository: prismaMomentRepository, circleRepository: prismaCircleRepository },
      { skipCircleCheck: true }
    ),
    isHost ? prismaCircleRepository.findPendingMemberships(circle.id) : Promise.resolve([]),
  ]);

  const totalMembers = hosts.length + players.length;
  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED" || (m.status === "DRAFT" && isHost));
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

  return (
    <div className="space-y-8">

      {/* Breadcrumb + role badge */}
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
                    <HostLink user={h.user} />
                    {i < hosts.length - 1 && ", "}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div>
              <a href="#members-section" className="text-2xl font-bold hover:underline underline-offset-2">
                {totalMembers}
              </a>
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

          {/* Quitter la Communauté — Participant uniquement */}
          {!isHost && (
            <div className="px-1">
              <LeaveCircleDialog circleId={circle.id} circleName={circle.name} />
            </div>
          )}
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* "Organisé par" + actions Host */}
          <div className="flex items-center justify-between gap-4">
            {hosts.length > 0 && (
              <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
                {t("detail.hostedBy")}
                {hosts.map((h, i) => (
                  <span key={h.user.id} className="flex items-center gap-1">
                    <HostLink user={h.user} className="text-foreground font-medium" />
                    {i < hosts.length - 1 && <span>,</span>}
                  </span>
                ))}
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

            {/* Site web */}
            {circle.website && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Globe className="text-primary size-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
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

          {/* Partager & Inviter — visible Organisateurs uniquement */}
          {isHost && (
            <CircleShareInviteCard
              circle={circle}
              publicUrl={publicUrl}
              t={{
                cardTitle: t("invite.cardTitle"),
                shareableLink: t("invite.shareableLink"),
                emailTitle: t("invite.emailTitle"),
                emailPlaceholder: t("invite.emailPlaceholder"),
                emailAdd: t("invite.emailAdd"),
                emailSend: t("invite.emailSend"),
                emailSendMultiple: t("invite.emailSendMultiple"),
                emailSent: t("invite.emailSent"),
                emailInvalid: t("invite.emailInvalid"),
                linkTitle: t("invite.linkTitle"),
                linkDescription: t("invite.linkDescription"),
                linkGenerate: t("invite.linkGenerate"),
                linkRevoke: t("invite.linkRevoke"),
                linkRevoked: t("invite.linkRevoked"),
                emailAddMore: t("invite.emailAddMore"),
                emailMaxReached: t("invite.emailMaxReached", { max: 10 }),
              }}
            />
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

          {/* Demandes en attente — visible Organisateurs uniquement si requiresApproval */}
          {isHost && circle.requiresApproval && (
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
          )}

          {/* Membres */}
          <div id="members-section" className="border-border bg-card rounded-2xl border p-6">
            <CircleMembersList hosts={hosts} players={players} variant={isHost ? "host" : "player"} circleId={circle.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
