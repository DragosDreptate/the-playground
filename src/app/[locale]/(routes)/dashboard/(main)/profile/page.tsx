import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { getProfile } from "@/domain/usecases/get-profile";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { updateProfileAction } from "@/app/actions/profile";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const user = await getProfile(
    { userId: session.user.id },
    { userRepository: prismaUserRepository }
  );

  const t = await getTranslations("Profile");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("edit.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("edit.description")}
        </p>
      </div>
      <ProfileForm
        user={{
          email: user.email,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
        }}
        mode="edit"
        action={updateProfileAction}
      />
    </div>
  );
}
