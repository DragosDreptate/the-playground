"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { updateProfile } from "@/domain/usecases/update-profile";
import { deleteAccount } from "@/domain/usecases/delete-account";
import { updateNotificationPreferences } from "@/domain/usecases/update-notification-preferences";
import { DomainError } from "@/domain/errors";
import { signOut } from "@/infrastructure/auth/auth.config";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { isUploadedUrl } from "@/lib/blob";
import { after } from "next/server";
import { createResendEmailService } from "@/infrastructure/services";
import { formatLongDate } from "@/lib/format-date";
import { getDisplayName } from "@/lib/display-name";
import { notifySlackNewUser, isAdminEmailEnabled } from "@/infrastructure/services/slack/slack-notification-service";
import type { User, NotificationPreferences } from "@/domain/models/user";
import type { ActionResult } from "./types";

const emailService = createResendEmailService();

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo — filet de sécurité (le resize côté client ramène à ~50 Ko)

export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult<User>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  if (!firstName?.trim()) {
    return { success: false, error: "First name is required", code: "VALIDATION" };
  }
  if (!lastName?.trim()) {
    return { success: false, error: "Last name is required", code: "VALIDATION" };
  }

  try {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const user = await updateProfile(
      {
        userId: session.user.id,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        name: `${trimmedFirst} ${trimmedLast}`,
      },
      { userRepository: prismaUserRepository }
    );
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function completeOnboardingAction(
  formData: FormData
): Promise<ActionResult<User>> {
  const session = await auth();
  const result = await updateProfileAction(formData);

  if (result.success) {
    // Filet de sécurité : générer le publicId si le callback signIn a échoué silencieusement
    after(async () => {
      try {
        if (session?.user?.id) {
          await prismaUserRepository.ensurePublicId(
            session.user.id,
            result.data.firstName,
            result.data.lastName
          );
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { context: "publicId_generation_onboarding" } });
      }
    });

    // Fire-and-forget : notifier les admins du nouvel utilisateur
    after(async () => {
      try {
        await notifyAdminNewUser(result.data);
      } catch (e) {
        Sentry.captureException(e);
      }
    });
  }

  return result;
}

async function notifyAdminNewUser(user: User): Promise<void> {
  const adminEmails = await prismaUserRepository.findAdminEmails();
  const recipients = adminEmails.filter((email) => email !== user.email);
  if (recipients.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminUsersUrl = `${appUrl}/admin/users`;
  const userName = getDisplayName(user.firstName, user.lastName, user.email);
  const registeredAt = formatLongDate(new Date(), "fr");

  if (isAdminEmailEnabled()) {
    const results = await Promise.allSettled(
      recipients.map((to) =>
        emailService.sendAdminNewUser({
          to,
          userName,
          userEmail: user.email,
          registeredAt,
          adminUsersUrl,
          strings: {
            subject: `[Admin] Nouvel utilisateur — ${userName}`,
            heading: "Nouvel utilisateur sur The Playground",
            message: `${userName} vient de compléter son inscription.`,
            ctaLabel: "Voir les utilisateurs dans l'admin",
            footer: "Vous recevez cet email car vous êtes administrateur de The Playground.",
          },
        })
      )
    );

    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(`[notifyAdminNewUser] Échec envoi email admin ${recipients[i]}:`, result.reason);
      }
    });
  }

  await notifySlackNewUser({ userName, userEmail: user.email, registeredAt, adminUsersUrl });
}

export async function deleteAccountAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await deleteAccount(
      { userId: session.user.id },
      { userRepository: prismaUserRepository }
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }

  // Compte supprimé — déconnexion (signOut lance un redirect en interne, ne retourne jamais)
  await signOut({ redirectTo: "/" });
  return { success: true, data: undefined };
}

export async function updateNotificationPreferencesAction(
  formData: FormData
): Promise<ActionResult<NotificationPreferences>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const prefs: NotificationPreferences = {
    notifyNewRegistration: formData.get("notifyNewRegistration") === "true",
    notifyNewComment: formData.get("notifyNewComment") === "true",
    notifyNewMomentInCircle: formData.get("notifyNewMomentInCircle") === "true",
  };

  try {
    const result = await updateNotificationPreferences(
      { userId: session.user.id, ...prefs },
      { userRepository: prismaUserRepository }
    );
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function uploadAvatarAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "No file provided", code: "VALIDATION" };
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Accepted: JPEG, PNG, WebP, GIF",
      code: "VALIDATION",
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      success: false,
      error: "File too large (max 5 MB)",
      code: "VALIDATION",
    };
  }

  try {
    const userId = session.user.id;

    // Supprimer l'ancien avatar uploadé si existant (pas les avatars OAuth)
    const existingUser = await prismaUserRepository.findById(userId);
    if (existingUser?.image && isUploadedUrl(existingUser.image)) {
      await vercelBlobStorageService.delete(existingUser.image);
    }

    // Générer un path unique pour éviter les collisions de cache
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const path = `avatars/${userId}-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await vercelBlobStorageService.upload(path, buffer, file.type);

    // Sauvegarder l'URL via le usecase
    await updateProfile(
      { userId, firstName: existingUser?.firstName ?? "", lastName: existingUser?.lastName ?? "", image: url },
      { userRepository: prismaUserRepository }
    );

    return { success: true, data: { url } };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}
