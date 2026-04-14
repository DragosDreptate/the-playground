import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import type { DashboardCircle } from "@/domain/models/circle";
import type { HostMomentSummary } from "@/domain/models/moment";

/**
 * TTL du cache dashboard : 60s.
 * Les mutations invalident explicitement via invalidateDashboardCache(userId).
 * 60s est le plafond de staleness en cas d'oubli d'invalidation.
 */
const DASHBOARD_CACHE_TTL_SECONDS = 60;

/**
 * Tag unique par utilisateur, partagé par toutes les queries dashboard cachées.
 * Un seul revalidateTag invalide atomiquement toutes les vues dashboard du user.
 */
export function dashboardCacheTag(userId: string): string {
  return `dashboard:${userId}`;
}

/**
 * À appeler dans toute server action qui mute les données visibles sur le
 * dashboard d'un utilisateur : inscription, désinscription, création
 * d'événement, join/leave communauté, etc.
 */
export function invalidateDashboardCache(userId: string): void {
  // Next.js 16 : profile "max" requis comme 2e argument de revalidateTag.
  // 'max' = invalidation immédiate avec la durée de vie maximale.
  revalidateTag(dashboardCacheTag(userId), "max");
}

// ---------------------------------------------------------------------------
// DashboardCircle — cache cross-requête avec sérialisation Date
// ---------------------------------------------------------------------------

/** @internal Exporté pour les tests unitaires — ne pas utiliser hors de ce module. */
export type SerializedDashboardCircle = Omit<
  DashboardCircle,
  "createdAt" | "updatedAt" | "nextMoment"
> & {
  createdAt: string;
  updatedAt: string;
  nextMoment: { title: string; startsAt: string } | null;
};

/** @internal Exporté pour les tests unitaires. */
export function serializeDashboardCircle(c: DashboardCircle): SerializedDashboardCircle {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    nextMoment: c.nextMoment
      ? { ...c.nextMoment, startsAt: c.nextMoment.startsAt.toISOString() }
      : null,
  };
}

/** @internal Exporté pour les tests unitaires. */
export function deserializeDashboardCircle(c: SerializedDashboardCircle): DashboardCircle {
  return {
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    nextMoment: c.nextMoment
      ? { ...c.nextMoment, startsAt: new Date(c.nextMoment.startsAt) }
      : null,
  };
}

/**
 * Double cache :
 *  - React.cache() : dédup intra-requête (plusieurs composants appelants)
 *  - unstable_cache : cache Next.js cross-requête (TTL 60s, invalidation par tag)
 *
 * Les Date sont sérialisées en ISO string (JSON.stringify perd le type Date
 * silencieusement) puis reconstituées au retour, sinon les comparaisons
 * temporelles en aval (ex. nextMoment.startsAt.getTime()) casseraient.
 */
export const getCachedDashboardCircles = cache(
  async (userId: string): Promise<DashboardCircle[]> => {
    const fetchCached = unstable_cache(
      async () => {
        const circles =
          await prismaCircleRepository.findAllByUserIdWithStats(userId);
        return circles.map(serializeDashboardCircle);
      },
      ["dashboard-circles", userId],
      {
        revalidate: DASHBOARD_CACHE_TTL_SECONDS,
        tags: [dashboardCacheTag(userId)],
      }
    );
    const serialized = await fetchCached();
    return serialized.map(deserializeDashboardCircle);
  }
);

// ---------------------------------------------------------------------------
// HostMomentSummary — cache cross-requête avec sérialisation Date
// ---------------------------------------------------------------------------

/** @internal Exporté pour les tests unitaires. */
export type SerializedHostMomentSummary = Omit<
  HostMomentSummary,
  "startsAt" | "endsAt"
> & {
  startsAt: string;
  endsAt: string | null;
};

/** @internal Exporté pour les tests unitaires. */
export function serializeHostMoment(m: HostMomentSummary): SerializedHostMomentSummary {
  return {
    ...m,
    startsAt: m.startsAt.toISOString(),
    endsAt: m.endsAt ? m.endsAt.toISOString() : null,
  };
}

/** @internal Exporté pour les tests unitaires. */
export function deserializeHostMoment(m: SerializedHostMomentSummary): HostMomentSummary {
  return {
    ...m,
    startsAt: new Date(m.startsAt),
    endsAt: m.endsAt ? new Date(m.endsAt) : null,
  };
}

export const getCachedHostMoments = cache(
  async (
    userId: string
  ): Promise<{ upcoming: HostMomentSummary[]; past: HostMomentSummary[] }> => {
    const fetchCached = unstable_cache(
      async () => {
        const result = await prismaMomentRepository.findAllByHostUserId(userId);
        return {
          upcoming: result.upcoming.map(serializeHostMoment),
          past: result.past.map(serializeHostMoment),
        };
      },
      ["dashboard-host-moments", userId],
      {
        revalidate: DASHBOARD_CACHE_TTL_SECONDS,
        tags: [dashboardCacheTag(userId)],
      }
    );
    const serialized = await fetchCached();
    return {
      upcoming: serialized.upcoming.map(deserializeHostMoment),
      past: serialized.past.map(deserializeHostMoment),
    };
  }
);
