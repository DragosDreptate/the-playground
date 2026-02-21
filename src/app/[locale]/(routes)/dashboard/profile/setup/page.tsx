import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { getProfile } from "@/domain/usecases/get-profile";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { shouldRedirectFromSetup } from "@/lib/onboarding";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { updateProfileAction } from "@/app/actions/profile";

function parseName(name: string | null): { firstName: string; lastName: string } {
  if (!name?.trim()) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default async function ProfileSetupPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  if (shouldRedirectFromSetup(session.user)) {
    redirect("/dashboard");
  }

  const user = await getProfile(
    { userId: session.user.id },
    { userRepository: prismaUserRepository }
  );

  const firstName = user.firstName ?? parseName(user.name).firstName;
  const lastName = user.lastName ?? parseName(user.name).lastName;

  const t = await getTranslations("Profile");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("setup.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("setup.description")}
        </p>
      </div>
      <ProfileForm
        user={{ firstName, lastName }}
        mode="setup"
        action={updateProfileAction}
      />
    </div>
  );
}
