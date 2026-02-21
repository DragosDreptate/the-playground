"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { getAdminStats } from "@/domain/usecases/admin/get-admin-stats";
import { getAdminUsers } from "@/domain/usecases/admin/get-admin-users";
import { getAdminUser } from "@/domain/usecases/admin/get-admin-user";
import { adminDeleteUser } from "@/domain/usecases/admin/admin-delete-user";
import { getAdminCircles } from "@/domain/usecases/admin/get-admin-circles";
import { getAdminCircle } from "@/domain/usecases/admin/get-admin-circle";
import { adminDeleteCircle } from "@/domain/usecases/admin/admin-delete-circle";
import { getAdminMoments } from "@/domain/usecases/admin/get-admin-moments";
import { getAdminMoment } from "@/domain/usecases/admin/get-admin-moment";
import { adminDeleteMoment } from "@/domain/usecases/admin/admin-delete-moment";
import { adminUpdateMomentStatus } from "@/domain/usecases/admin/admin-update-moment-status";
import { DomainError } from "@/domain/errors";
import type { ActionResult } from "./types";
import type { AdminStats, AdminUserFilters, AdminUserRow, AdminUserDetail, AdminCircleFilters, AdminCircleRow, AdminCircleDetail, AdminMomentFilters, AdminMomentRow, AdminMomentDetail } from "@/domain/ports/repositories/admin-repository";
import type { MomentStatus } from "@/domain/models/moment";

const deps = { adminRepository: prismaAdminRepository };

async function requireAdmin(): Promise<ActionResult<{ userId: string }>> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" };
  }
  return { success: true, data: { userId: session.user.id } };
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export async function getAdminStatsAction(): Promise<ActionResult<AdminStats>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const stats = await getAdminStats(deps);
  return { success: true, data: stats };
}

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export async function getAdminUsersAction(
  filters: AdminUserFilters
): Promise<ActionResult<{ users: AdminUserRow[]; total: number }>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const result = await getAdminUsers(filters, deps);
  return { success: true, data: result };
}

export async function getAdminUserAction(
  userId: string
): Promise<ActionResult<AdminUserDetail | null>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const user = await getAdminUser(userId, deps);
  return { success: true, data: user };
}

export async function adminDeleteUserAction(
  userId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminDeleteUser(userId, deps);
    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
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

  const result = await getAdminCircles(filters, deps);
  return { success: true, data: result };
}

export async function getAdminCircleAction(
  circleId: string
): Promise<ActionResult<AdminCircleDetail | null>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const circle = await getAdminCircle(circleId, deps);
  return { success: true, data: circle };
}

export async function adminDeleteCircleAction(
  circleId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminDeleteCircle(circleId, deps);
    revalidatePath("/admin/circles");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
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

  const result = await getAdminMoments(filters, deps);
  return { success: true, data: result };
}

export async function getAdminMomentAction(
  momentId: string
): Promise<ActionResult<AdminMomentDetail | null>> {
  const check = await requireAdmin();
  if (!check.success) return check;

  const moment = await getAdminMoment(momentId, deps);
  return { success: true, data: moment };
}

export async function adminDeleteMomentAction(
  momentId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminDeleteMoment(momentId, deps);
    revalidatePath("/admin/moments");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

export async function adminCancelMomentAction(
  momentId: string
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.success) return check;

  try {
    await adminUpdateMomentStatus(momentId, "CANCELLED" as MomentStatus, deps);
    revalidatePath("/admin/moments");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}
