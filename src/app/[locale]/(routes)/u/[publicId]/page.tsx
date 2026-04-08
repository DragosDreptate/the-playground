import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaUserRepository,
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { getUserPublicProfile } from "@/domain/usecases/get-user-public-profile";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Crown, MapPin, Globe, Linkedin, Github, CalendarDays, Users } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";
import { CollapsibleList } from "@/components/collapsible-list";
import { formatLongDate, formatMonthYear } from "@/lib/format-date";
import { getMomentGradient } from "@/lib/gradient";

export default async function UserPublicProfilePage({
  params,
}: {
  params: Promise<{ publicId: string; locale: string }>;
}) {
  const { publicId, locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/sign-in`);
  }

  const t = await getTranslations("Profile.publicProfile");
  const tDashboard = await getTranslations("Dashboard");

  const result = await getUserPublicProfile(
    { publicId, viewerUserId: session.user.id },
    {
      userRepository: prismaUserRepository,
      circleRepository: prismaCircleRepository,
      momentRepository: prismaMomentRepository,
    }
  );

  if (!result) notFound();

  const { user, isOwnProfile, publicCircles, upcomingPublicMoments } = result;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const memberSince = formatMonthYear(user.memberSince, locale);
  const hasSocialLinks = !!(
    user.socialLinks.website ||
    user.socialLinks.linkedinUrl ||
    user.socialLinks.twitterUrl ||
    user.socialLinks.githubUrl
  );

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Fil d'ariane — uniquement pour son propre profil */}
      {isOwnProfile && (
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <Link href="/dashboard/profile" className="hover:text-foreground transition-colors">
            {tDashboard("title")}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{t("itsYourProfile")}</span>
        </div>
      )}

      {/* Header utilisateur */}
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-20">
          {user.image && <AvatarImage src={user.image} alt={fullName} />}
          <AvatarFallback
            className="text-2xl font-semibold text-white"
            style={{ background: getMomentGradient(user.publicId) }}
          >
            {initials || "?"}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            {user.bio}
          </p>
        )}

        {/* Meta: city, member since, hosted events */}
        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
          {user.city && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {user.city}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {t("memberSince", { date: memberSince })}
          </span>
          {user.hostedMomentsCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {t("hostedEvents", { count: user.hostedMomentsCount })}
            </span>
          )}
        </div>

        {/* Social links */}
        {hasSocialLinks && (
          <div className="flex items-center gap-2">
            {user.socialLinks.website && (
              <a
                href={user.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                title={t("socialLinks.website")}
              >
                <Globe className="size-4" />
              </a>
            )}
            {user.socialLinks.linkedinUrl && (
              <a
                href={user.socialLinks.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                title="LinkedIn"
              >
                <Linkedin className="size-4" />
              </a>
            )}
            {user.socialLinks.twitterUrl && (
              <a
                href={user.socialLinks.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                title="Twitter / X"
              >
                <XIcon className="size-4" />
              </a>
            )}
            {user.socialLinks.githubUrl && (
              <a
                href={user.socialLinks.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                title="GitHub"
              >
                <Github className="size-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Section Communautés */}
      {publicCircles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("communities", { count: publicCircles.length })}
          </h2>
          <CollapsibleList
            items={publicCircles.map((membership) => (
              <Link
                key={membership.circleSlug}
                href={`/circles/${membership.circleSlug}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                {membership.circleCover ? (
                  <div
                    className="size-10 shrink-0 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url(${membership.circleCover})` }}
                  />
                ) : (
                  <div
                    className="size-10 shrink-0 rounded-md"
                    style={{ background: getMomentGradient(membership.circleSlug) }}
                  />
                )}

                <p className="flex-1 min-w-0 text-sm font-medium truncate">
                  {membership.circleName}
                </p>

                <Badge
                  variant={membership.role === "HOST" ? "default" : "secondary"}
                  className="shrink-0 gap-1"
                >
                  {membership.role === "HOST" && <Crown className="size-3" />}
                  {membership.role === "HOST" ? t("roleHost") : t("rolePlayer")}
                </Badge>
              </Link>
            ))}
          />
        </section>
      )}

      {/* Section Prochains événements */}
      {upcomingPublicMoments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("upcomingEvents", { count: upcomingPublicMoments.length })}
          </h2>
          <CollapsibleList
            items={upcomingPublicMoments.map((reg) => (
              <Link
                key={reg.momentSlug}
                href={`/m/${reg.momentSlug}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{reg.momentTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">{reg.circleName}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatLongDate(reg.momentDate, locale)}
                </p>
              </Link>
            ))}
          />
        </section>
      )}

      {/* État vide */}
      {publicCircles.length === 0 && upcomingPublicMoments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          {t("noCommunities")}
        </p>
      )}
    </div>
  );
}
