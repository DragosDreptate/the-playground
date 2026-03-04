"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { setDashboardMode } from "@/domain/usecases/set-dashboard-mode";
import type { DashboardMode } from "@/domain/models/user";

export async function setDashboardModeAction(mode: DashboardMode): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await setDashboardMode(session.user.id, mode, {
    userRepository: prismaUserRepository,
  });
}
