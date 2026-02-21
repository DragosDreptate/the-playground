import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { getProfile } from "@/domain/usecases/get-profile";
import {
  prismaCircleRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { prisma } from "@/infrastructure/db/prisma";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { updateProfileAction } from "@/app/actions/profile";
import { UserAvatar } from "@/components/user-avatar";
import { getMomentGradient } from "@/lib/gradient";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Mail, CalendarIcon } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const userId = session.user.id;

  const [user, circles, momentCount] = await Promise.all([
    getProfile({ userId }, { userRepository: prismaUserRepository }),
    prismaCircleRepository.findAllByUserId(userId),
    prisma.registration.count({
      where: { userId, status: "REGISTERED" },
    }),
  ]);

  const t = await getTranslations("Profile");
  const tDashboard = await getTranslations("Dashboard");

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const gradient = getMomentGradient(user.email);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          {tDashboard("title")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate font-medium">
          {t("edit.title")}
        </span>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ─── RIGHT column : form + meta ────────────── */}
        <div className="order-1 min-w-0 flex-1 lg:order-2">
          {/* Section label */}
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t("edit.personalInfo")}
          </p>

          {/* Title + description */}
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {fullName || t("edit.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("edit.description")}
          </p>

          {/* Separator */}
          <div className="border-border mt-6 border-t" />

          {/* Form */}
          <div className="mt-6">
            <ProfileForm
              user={{
                firstName: user.firstName ?? "",
                lastName: user.lastName ?? "",
              }}
              mode="edit"
              action={updateProfileAction}
            />
          </div>

          {/* Separator */}
          <div className="border-border mt-6 border-t" />

          {/* Meta rows */}
          <div className="mt-6 flex flex-col gap-3">
            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Mail className="text-primary size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("form.email")}
                </p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>

            {/* Member since */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <CalendarIcon className="text-primary size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("edit.memberSince")}
                </p>
                <p className="text-sm font-medium">
                  {user.createdAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── LEFT column : cover + avatar + stats ────────────── */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">
          {/* Cover — carré, glow blur */}
          <div className="relative">
            <div
              className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
              style={{ background: gradient }}
            />
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ background: gradient, aspectRatio: "1 / 1" }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <UserAvatar
                  name={fullName || null}
                  email={user.email}
                  image={user.image}
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Name + email */}
          <div className="space-y-0.5 px-1">
            {fullName && (
              <p className="text-lg font-semibold">{fullName}</p>
            )}
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div>
              <p className="text-2xl font-bold">{circles.length}</p>
              <p className="text-muted-foreground text-xs">
                {t("edit.circles")}
              </p>
            </div>
            <div className="border-l pl-6">
              <p className="text-2xl font-bold">{momentCount}</p>
              <p className="text-muted-foreground text-xs">
                {t("edit.moments")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
