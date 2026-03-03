import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getMomentGradient } from "@/lib/gradient";
import { Users } from "lucide-react";
import Image from "next/image";
import { JoinCircleByInviteForm } from "@/components/circles/join-circle-by-invite-form";

export default async function JoinCircleByInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;

  const circle = await prismaCircleRepository.findByInviteToken(token);
  if (!circle) notFound();

  const [t, session] = await Promise.all([
    getTranslations("Circle"),
    auth(),
  ]);

  const memberCount = await prismaCircleRepository.countMembers(circle.id);

  let alreadyMember = false;
  if (session?.user?.id) {
    const membership = await prismaCircleRepository.findMembership(circle.id, session.user.id);
    alreadyMember = !!membership;
  }

  const gradient = getMomentGradient(circle.name);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Cover */}
        <div className="relative mb-8">
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
                sizes="448px"
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

        {/* Info card */}
        <div className="bg-card border-border rounded-2xl border p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              {t("invite.joinTitle", { circleName: circle.name })}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{circle.name}</h1>
          </div>

          {circle.description && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
              {circle.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4 shrink-0" />
            <span>
              {t("detail.memberCount", { count: memberCount })}
            </span>
          </div>

          <div className="border-t pt-4">
            <JoinCircleByInviteForm
              token={token}
              isAuthenticated={!!session?.user?.id}
              alreadyMember={alreadyMember}
              circleSlug={circle.slug}
              t={{
                joinButton: t("invite.joinButton"),
                joinSignIn: t("invite.joinSignIn"),
                alreadyMember: t("invite.alreadyMember"),
                joined: t("invite.joined"),
                viewCircle: t("detail.manageCircle"),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
