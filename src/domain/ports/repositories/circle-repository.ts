import type { Circle, CircleMembership, CircleMemberRole, CircleMemberWithUser, CircleWithRole, CircleCategory, CoverImageAttribution, DashboardCircle, MembershipStatus } from "@/domain/models/circle";
import type { PublicCircleMembership } from "@/domain/models/user";

export type CreateCircleInput = {
  name: string;
  slug: string;
  description: string;
  visibility: Circle["visibility"];
  category?: CircleCategory;
  customCategory?: string | null;
  city?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  requiresApproval?: boolean;
};

export type UpdateCircleInput = {
  name?: string;
  description?: string;
  visibility?: Circle["visibility"];
  category?: CircleCategory | null;
  customCategory?: string | null;
  city?: string | null;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  inviteToken?: string | null;
  requiresApproval?: boolean;
  stripeConnectAccountId?: string | null;
};

export type ExplorerSortBy = "date" | "popular" | "members";

export type PublicCircleFilters = {
  category?: CircleCategory;
  sortBy?: ExplorerSortBy;
  limit?: number;
  offset?: number;
};

export type PublicCircle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CircleCategory | null;
  customCategory: string | null;
  city: string | null;
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
  memberCount: number;
  upcomingMomentCount: number;
  nextMoment: {
    title: string;
    startsAt: Date;
  } | null;
  isDemo: boolean;
  explorerScore: number;
};

export type CircleFollowerInfo = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type FeaturedCircle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CircleCategory | null;
  customCategory: string | null;
  city: string | null;
  coverImage: string; // non-null garanti (condition du pool)
  coverImageAttribution: CoverImageAttribution | null;
  memberCount: number;
  upcomingMomentCount: number;
};

export interface CircleRepository {
  create(input: CreateCircleInput): Promise<Circle>;
  findByInviteToken(token: string): Promise<Circle | null>;
  /**
   * Crée un Circle et sa CircleMembership HOST dans une seule transaction atomique.
   * Garantit qu'un Circle ne peut pas exister sans Organisateur.
   */
  createWithHostMembership(input: CreateCircleInput, hostUserId: string): Promise<Circle>;
  findById(id: string): Promise<Circle | null>;
  findBySlug(slug: string): Promise<Circle | null>;
  findByUserId(userId: string, role: CircleMemberRole): Promise<Circle[]>;
  update(id: string, input: UpdateCircleInput): Promise<Circle>;
  delete(id: string): Promise<void>;
  slugExists(slug: string): Promise<boolean>;
  addMembership(circleId: string, userId: string, role: CircleMemberRole, status?: MembershipStatus): Promise<CircleMembership>;
  updateMembershipStatus(circleId: string, userId: string, status: MembershipStatus): Promise<CircleMembership>;
  findPendingMemberships(circleId: string): Promise<CircleMemberWithUser[]>;
  countPendingMemberships(circleId: string): Promise<number>;
  findAllByUserId(userId: string): Promise<CircleWithRole[]>;
  findAllByUserIdWithStats(userId: string): Promise<DashboardCircle[]>;
  findMembership(circleId: string, userId: string): Promise<CircleMembership | null>;
  findMembersByRole(circleId: string, role: CircleMemberRole): Promise<CircleMemberWithUser[]>;
  countMembers(circleId: string): Promise<number>;
  countMoments(circleId: string): Promise<number>;
  /** Renvoie une Map circleId → nombre de membres pour une liste de Circles (une seule requête GROUP BY). */
  findMemberCountsByCircleIds(circleIds: string[]): Promise<Map<string, number>>;
  findPublic(filters: PublicCircleFilters): Promise<PublicCircle[]>;
  removeMembership(circleId: string, userId: string): Promise<void>;
  /** Membres du Circle (PLAYER ou HOST) à notifier pour un nouvel événement, en excluant le créateur */
  findPlayersForNewMomentNotification(circleId: string, excludeUserId: string): Promise<CircleFollowerInfo[]>;
  /** Communautés publiques dont l'utilisateur est membre — pour la page profil public. */
  getPublicCirclesForUser(userId: string): Promise<PublicCircleMembership[]>;
  /** 3 communautés sélectionnées aléatoirement (seed = date du jour) pour la section "À la une". */
  findFeatured(): Promise<FeaturedCircle[]>;
}
