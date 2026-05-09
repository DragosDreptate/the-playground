import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCachedSession } from "@/lib/auth-cache";
import { getProfile } from "@/domain/usecases/get-profile";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { shouldRedirectFromSetup } from "@/lib/onboarding";
import { safeCallbackUrl } from "@/lib/url";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { completeOnboardingAction } from "@/app/actions/profile";
import { AvatarUpload } from "@/components/profile/avatar-upload";

function parseName(name: string | null): { firstName: string; lastName: string } {
  if (!name?.trim()) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  // callbackUrl peut venir :
  //  - de la query (cas guard onboarding sur server action publique : Player connecté
  //    mais non onboardé qui clique S'inscrire / Rejoindre / poste un commentaire)
  //  - du cookie auth-callback-url (cas magic link / OAuth posant le cookie pendant sign-in)
  // La query est prioritaire car elle correspond à l'intention immédiate du clic.
  const { callbackUrl: queryCallbackUrl } = await searchParams;
  const cookieStore = await cookies();
  const cookieCallbackUrl = cookieStore.get("auth-callback-url")?.value;
  const callbackUrl =
    safeCallbackUrl(queryCallbackUrl) ?? safeCallbackUrl(cookieCallbackUrl);

  if (shouldRedirectFromSetup(session.user)) {
    redirect(callbackUrl ?? "/dashboard");
  }

  const user = await getProfile(
    { userId: session.user.id },
    { userRepository: prismaUserRepository }
  );

  const firstName = user.firstName ?? parseName(user.name).firstName;
  const lastName = user.lastName ?? parseName(user.name).lastName;

  const t = await getTranslations("Profile");

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || null;

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <AvatarUpload
          name={fullName}
          email={user.email}
          image={user.image ?? session.user.image ?? null}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("setup.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("setup.description")}
          </p>
        </div>
      </div>
      <ProfileForm
        user={{ firstName, lastName, bio: null, city: null, website: null, linkedinUrl: null, twitterUrl: null, githubUrl: null }}
        mode="setup"
        action={completeOnboardingAction}
        callbackUrl={callbackUrl}
      />
    </div>
  );
}
