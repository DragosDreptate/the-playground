import type { Circle, CircleMembership, CircleMemberRole, CircleMemberWithUser, CircleWithRole, CircleCategory, CoverImageAttribution, CircleFollow, DashboardCircle } from "@/domain/models/circle";

export type CreateCircleInput = {
  name: string;
  slug: string;
  description: string;
  visibility: Circle["visibility"];
  category?: CircleCategory;
  city?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
};

export type UpdateCircleInput = {
  name?: string;
  description?: string;
  visibility?: Circle["visibility"];
  category?: CircleCategory | null;
  city?: string | null;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
};

export type PublicCircleFilters = {
  category?: CircleCategory;
  limit?: number;
  offset?: number;
};

export type PublicCircle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CircleCategory | null;
  city: string | null;
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
  memberCount: number;
  upcomingMomentCount: number;
  nextMoment: {
    title: string;
    startsAt: Date;
  } | null;
};

export type CircleFollowerInfo = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export interface CircleRepository {
  create(input: CreateCircleInput): Promise<Circle>;
  findById(id: string): Promise<Circle | null>;
  findBySlug(slug: string): Promise<Circle | null>;
  findByUserId(userId: string, role: CircleMemberRole): Promise<Circle[]>;
  update(id: string, input: UpdateCircleInput): Promise<Circle>;
  delete(id: string): Promise<void>;
  slugExists(slug: string): Promise<boolean>;
  addMembership(circleId: string, userId: string, role: CircleMemberRole): Promise<CircleMembership>;
  findAllByUserId(userId: string): Promise<CircleWithRole[]>;
  findAllByUserIdWithStats(userId: string): Promise<DashboardCircle[]>;
  findMembership(circleId: string, userId: string): Promise<CircleMembership | null>;
  findMembersByRole(circleId: string, role: CircleMemberRole): Promise<CircleMemberWithUser[]>;
  countMembers(circleId: string): Promise<number>;
  /** Renvoie une Map circleId → nombre de membres pour une liste de Circles (une seule requête GROUP BY). */
  findMemberCountsByCircleIds(circleIds: string[]): Promise<Map<string, number>>;
  findPublic(filters: PublicCircleFilters): Promise<PublicCircle[]>;
  // Follow
  followCircle(userId: string, circleId: string): Promise<CircleFollow>;
  unfollowCircle(userId: string, circleId: string): Promise<void>;
  getFollowStatus(userId: string, circleId: string): Promise<boolean>;
  findFollowers(circleId: string): Promise<CircleFollowerInfo[]>;
  /** Membres du Circle (PLAYER ou HOST) à notifier pour un nouvel événement, en excluant le créateur */
  findPlayersForNewMomentNotification(circleId: string, excludeUserId: string): Promise<CircleFollowerInfo[]>;
}
