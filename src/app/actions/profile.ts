"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { updateProfile } from "@/domain/usecases/update-profile";
import { DomainError } from "@/domain/errors";
import type { User } from "@/domain/models/user";
import type { ActionResult } from "./types";

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
