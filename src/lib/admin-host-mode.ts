import { cookies } from "next/headers";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleMembership } from "@/domain/models/circle";

const ADMIN_HOST_MODE_COOKIE = "admin_host_mode";

async function isAdminHostModeEnabled(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_HOST_MODE_COOKIE)?.value === "true";
}

export async function setAdminHostMode(enabled: boolean): Promise<void> {
  const cookieStore = await cookies();
  if (enabled) {
    cookieStore.set(ADMIN_HOST_MODE_COOKIE, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookieStore.delete(ADMIN_HOST_MODE_COOKIE);
  }
}

export function isAdminUser(
  session: { user: { role?: string | null } } | null
): boolean {
  return session?.user?.role === "ADMIN";
}

export async function isAdminInHostMode(
  session: { user: { role?: string | null } } | null
): Promise<boolean> {
  return session?.user?.role === "ADMIN" && (await isAdminHostModeEnabled());
}

/**
 * Retourne une fausse membership HOST pour l'admin sur n'importe quel Circle,
 * sans créer de ligne en base (invisible dans les listes de membres).
 */
function withAdminHostMode(
  repo: CircleRepository,
  adminUserId: string
): CircleRepository {
  return new Proxy(repo, {
    get(target, prop, receiver) {
      if (prop === "findMembership") {
        return async (
          circleId: string,
          userId: string
        ): Promise<CircleMembership | null> => {
          if (userId === adminUserId) {
            return { id: "admin-override", userId, circleId, role: "HOST", joinedAt: new Date() };
          }
          return target.findMembership(circleId, userId);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export async function resolveCircleRepository(
  session: { user: { id: string; role?: string | null } } | null,
  baseRepo: CircleRepository
): Promise<CircleRepository> {
  if (await isAdminInHostMode(session)) {
    return withAdminHostMode(baseRepo, session!.user.id);
  }
  return baseRepo;
}
