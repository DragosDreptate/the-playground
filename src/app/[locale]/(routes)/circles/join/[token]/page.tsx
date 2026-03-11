import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { getMomentGradient } from "@/lib/gradient";
import { formatLongDate } from "@/lib/format-date";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { MomentTimelineItem } from "@/components/circles/moment-timeline-item";
import { JoinCircleByInviteForm } from "@/components/circles/join-circle-by-invite-form";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { HostLink } from "@/components/circles/host-link";
import { getCircleUserInitials } from "@/lib/display-name";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import Image from "next/image";
import {
  Globe,
  Lock,
  Users,
  CalendarIcon,
  MapPin,
  Crown,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────

// ── Page ──────────────────────────────────────────────────────

export default async function JoinCircleByInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;

  const circle = await prismaCircleRepository.findByInviteToken(token);
  if (!circle) notFound();

  const [t, tCategory, session] = await Promise.all([
    getTranslations("Circle"),
    getTranslations("CircleCategory"),
    auth(),
  ]);

  const [hosts, allMoments, memberCount] = await Promise.all([
    prismaCircleRepository.findMembersByRole(circle.id, "HOST"),
    getCircleMoments(
      circle.id,
      { momentRepository: prismaMomentRepository, circleRepository: prismaCircleRepository },
      { skipCircleCheck: true }
    ),
    prismaCircleRepository.countMembers(circle.id),
  ]);

  let alreadyMember = false;
  if (session?.user?.id) {
    const membership = await prismaCircleRepository.findMembership(circle.id, session.user.id);
    alreadyMember = !!membership;
  }

  const upcomingMoments = allMoments.filter((m) => m.status === "PUBLISHED");

  const gradient = getMomentGradient(circle.name);

  return (
    <div className="space-y-8">

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column ─────────────────────────────────────── */}
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
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-muted-foreground text-xs">{t("detail.members")}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-2xl font-bold">{allMoments.length}</p>
              <p className="text-muted-foreground text-xs">{t("detail.moments")}</p>
            </div>
          </div>

          {/* CTA Rejoindre — zone d'action principale */}
          <div className="px-1">
            <JoinCircleByInviteForm
              token={token}
              isAuthenticated={!!session?.user?.id}
              alreadyMember={alreadyMember}
              circleSlug={circle.slug}
              t={{
                joinButton: t("invite.joinButton"),
                joinSignIn: t("invite.joinSignIn"),
                alreadyMember: t("invite.alreadyMember"),
                viewCircle: t("invite.viewCircle"),
              }}
            />
          </div>
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2 lg:pt-2">

          {/* "Organisé par" */}
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
                  <p className="text-muted-foreground text-xs">{t("form.category")}</p>
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
                  <p className="text-muted-foreground text-xs">{t("form.city")}</p>
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
                <p className="text-muted-foreground text-xs">{t("detail.visibility")}</p>
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
                <p className="text-muted-foreground text-xs">{t("detail.members")}</p>
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
                <p className="text-muted-foreground text-xs">{t("detail.created")}</p>
                <p className="text-sm font-medium">
                  {formatLongDate(circle.createdAt, locale)}
                </p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Prochains événements — aperçu */}
          <div className="space-y-6">
            <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
              <span className="whitespace-nowrap rounded-full bg-foreground px-4 py-1 text-sm font-medium text-background">
                {t("detail.upcomingMoments")}
              </span>
            </div>

            {upcomingMoments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <p className="text-muted-foreground text-sm">
                  {t("detail.noUpcomingMoments")}
                </p>
              </div>
            ) : (
              <div>
                {upcomingMoments.map((moment, i) => (
                  <MomentTimelineItem
                    key={moment.id}
                    moment={moment}
                    circleSlug={circle.slug}
                    registrationCount={0}
                    userRegistrationStatus={null}
                    isHost={false}
                    isLast={i === upcomingMoments.length - 1}
                    variant="public"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
