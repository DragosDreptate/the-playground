"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { updateProfile } from "@/domain/usecases/update-profile";
import { deleteAccount } from "@/domain/usecases/delete-account";
import { updateNotificationPreferences } from "@/domain/usecases/update-notification-preferences";
import { DomainError } from "@/domain/errors";
import { signOut } from "@/infrastructure/auth/auth.config";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { isUploadedUrl } from "@/lib/blob";
import type { User, NotificationPreferences } from "@/domain/models/user";
import type { ActionResult } from "./types";

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
    const user = await updateProfile(
      {
        userId: session.user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      { userRepository: prismaUserRepository }
    );
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
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
    throw error;
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
    notifyNewFollower: formData.get("notifyNewFollower") === "true",
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
    throw error;
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
    throw error;
  }
}
