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

  return (
    <div className="mx-auto max-w-lg space-y-6">
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

      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <UserAvatar
          name={fullName || null}
          email={user.email}
          image={user.image}
          size="xl"
        />
        {fullName && (
          <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
        )}
        <p className="text-muted-foreground text-sm">{user.email}</p>
        <p className="text-muted-foreground text-xs">
          {circles.length} {t("edit.circles")} · {momentCount} {t("edit.moments")}
        </p>
      </div>

      {/* Separator */}
      <div className="border-border border-t" />

      {/* Form */}
      <ProfileForm
        user={{
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
        }}
        mode="edit"
        action={updateProfileAction}
      />

      {/* Separator */}
      <div className="border-border border-t" />

      {/* Meta rows */}
      <div className="flex flex-col gap-3">
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
  );
}
