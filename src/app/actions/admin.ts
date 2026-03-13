"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { getAdminStats } from "@/domain/usecases/admin/get-admin-stats";
import { getAdminTimeSeries } from "@/domain/usecases/admin/get-admin-time-series";
import { getAdminActivationStats } from "@/domain/usecases/admin/get-admin-activation-stats";
import { getAdminUsers } from "@/domain/usecases/admin/get-admin-users";
import { getAdminUser } from "@/domain/usecases/admin/get-admin-user";
import { adminDeleteUser } from "@/domain/usecases/admin/admin-delete-user";
import { getAdminCircles } from "@/domain/usecases/admin/get-admin-circles";
import { getAdminCircle } from "@/domain/usecases/admin/get-admin-circle";
import { adminDeleteCircle } from "@/domain/usecases/admin/admin-delete-circle";
import { getAdminExplorerCircles } from "@/domain/usecases/admin/get-admin-explorer-circles";
import { getAdminExplorerMoments } from "@/domain/usecases/admin/get-admin-explorer-moments";
import { adminUpdateCircleExcluded } from "@/domain/usecases/admin/admin-update-circle-excluded";
import { adminUpdateCircleOverrideScore } from "@/domain/usecases/admin/admin-update-circle-override-score";
import { getAdminMoments } from "@/domain/usecases/admin/get-admin-moments";
import { getAdminMoment } from "@/domain/usecases/admin/get-admin-moment";
import { adminDeleteMoment } from "@/domain/usecases/admin/admin-delete-moment";
import { adminUpdateMomentStatus } from "@/domain/usecases/admin/admin-update-moment-status";
import { DomainError } from "@/domain/errors";
import { setAdminHostMode } from "@/lib/admin-host-mode";
import type { ActionResult } from "./types";
import type { AdminStats, AdminTimeSeries, AdminActivationStats, AdminUserFilters, AdminUserRow, AdminUserDetail, AdminCircleFilters, AdminCircleRow, AdminCircleDetail, AdminExplorerFilters, AdminExplorerCircleRow, AdminExplorerMomentFilters, AdminExplorerMomentRow, AdminMomentFilters, AdminMomentRow, AdminMomentDetail } from "@/domain/ports/repositories/admin-repository";
import type { MomentStatus } from "@/domain/models/moment";

const deps = { adminRepository: prismaAdminRepository };

async function requireAdmin(): Promise<ActionResult<{ userId: string; role: "ADMIN" }>> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" };
  }
  return { success: true, data: { userId: session.user.id, role: "ADMIN" } };
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export async function getAdminStatsAction(): Promise<ActionResult<AdminStats>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const stats = await getAdminStats(check.data.role, deps);
  return { success: true, data: stats };
}

export async function getAdminTimeSeriesAction(
  days = 30
): Promise<ActionResult<AdminTimeSeries>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const timeSeries = await getAdminTimeSeries(check.data.role, days, deps);
  return { success: true, data: timeSeries };
}

export async function getAdminActivationStatsAction(): Promise<ActionResult<AdminActivationStats>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const activation = await getAdminActivationStats(check.data.role, deps);
  return { success: true, data: activation };
}

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export async function getAdminUsersAction(
  filters: AdminUserFilters
): Promise<ActionResult<{ users: AdminUserRow[]; total: number }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const result = await getAdminUsers(check.data.role, filters, deps);
  return { success: true, data: result };
}

export async function getAdminUserAction(
  userId: string
): Promise<ActionResult<AdminUserDetail | null>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const user = await getAdminUser(check.data.role, userId, deps);
  return { success: true, data: user };
}

export async function adminDeleteUserAction(
  userId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminDeleteUser(check.data.role, userId, deps);
    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// Circles
// ─────────────────────────────────────────────

export async function getAdminCirclesAction(
  filters: AdminCircleFilters
): Promise<ActionResult<{ circles: AdminCircleRow[]; total: number }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const result = await getAdminCircles(check.data.role, filters, deps);
  return { success: true, data: result };
}

export async function getAdminCircleAction(
  circleId: string
): Promise<ActionResult<AdminCircleDetail | null>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const circle = await getAdminCircle(check.data.role, circleId, deps);
  return { success: true, data: circle };
}

export async function adminDeleteCircleAction(
  circleId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminDeleteCircle(check.data.role, circleId, deps);
    revalidatePath("/admin/circles");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// Moments
// ─────────────────────────────────────────────

export async function getAdminMomentsAction(
  filters: AdminMomentFilters
): Promise<ActionResult<{ moments: AdminMomentRow[]; total: number }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const result = await getAdminMoments(check.data.role, filters, deps);
  return { success: true, data: result };
}

export async function getAdminMomentAction(
  momentId: string
): Promise<ActionResult<AdminMomentDetail | null>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const moment = await getAdminMoment(check.data.role, momentId, deps);
  return { success: true, data: moment };
}

export async function adminDeleteMomentAction(
  momentId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminDeleteMoment(check.data.role, momentId, deps);
    revalidatePath("/admin/moments");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function adminCancelMomentAction(
  momentId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminUpdateMomentStatus(check.data.role, momentId, "CANCELLED" as MomentStatus, deps);
    revalidatePath("/admin/moments");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// Explorer
// ─────────────────────────────────────────────

export async function getAdminExplorerCirclesAction(
  filters: AdminExplorerFilters
): Promise<ActionResult<{ circles: AdminExplorerCircleRow[]; total: number }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const result = await getAdminExplorerCircles(check.data.role, filters, deps);
  return { success: true, data: result };
}

export async function adminUpdateCircleExcludedAction(
  circleId: string,
  excluded: boolean
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminUpdateCircleExcluded(check.data.role, circleId, excluded, deps);
    revalidatePath("/admin/explorer");
    revalidatePath(`/admin/circles/${circleId}`);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function adminUpdateCircleOverrideScoreAction(
  circleId: string,
  score: number | null
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminUpdateCircleOverrideScore(check.data.role, circleId, score, deps);
    revalidatePath("/admin/explorer");
    revalidatePath(`/admin/circles/${circleId}`);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function getAdminExplorerMomentsAction(
  filters: AdminExplorerMomentFilters
): Promise<ActionResult<{ moments: AdminExplorerMomentRow[]; total: number }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const result = await getAdminExplorerMoments(check.data.role, filters, deps);
  return { success: true, data: result };
}

// ─────────────────────────────────────────────
// Admin Host Mode
// ─────────────────────────────────────────────

export async function toggleAdminHostModeAction(
  enabled: boolean
): Promise<ActionResult<{ enabled: boolean }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  await setAdminHostMode(enabled);
  return { success: true, data: { enabled } };
}
