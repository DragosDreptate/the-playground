import type { UserRole } from "@/domain/models/user";
import type { CircleVisibility, CircleCategory } from "@/domain/models/circle";
import type { MomentStatus } from "@/domain/models/moment";

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export type AdminStats = {
  totalUsers: number;
  totalCircles: number;
  totalMoments: number;
  totalRegistrations: number;
  totalComments: number;
  totalMembers: number; // membres PLAYER des Communautés
  recentUsers: number; // derniers 7 jours
  recentCircles: number;
  recentMoments: number;
  recentComments: number;
  recentMembers: number;
};

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export type AdminUserFilters = {
  search?: string;
  role?: UserRole;
  limit?: number;
  offset?: number;
  since?: Date;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AdminUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  circleCount: number;
  momentCount: number;
  createdAt: Date;
};

export type AdminUserDetail = AdminUserRow & {
  name: string | null;
  image: string | null;
  onboardingCompleted: boolean;
  registrationCount: number;
  circles: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
  moments: Array<{
    id: string;
    title: string;
    slug: string;
    startsAt: Date;
    status: string;
    circleName: string;
  }>;
};

// ─────────────────────────────────────────────
// Circles
// ─────────────────────────────────────────────

export type AdminCircleFilters = {
  search?: string;
  visibility?: CircleVisibility;
  category?: CircleCategory;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AdminCircleRow = {
  id: string;
  slug: string;
  name: string;
  visibility: CircleVisibility;
  category: CircleCategory | null;
  city: string | null;
  website: string | null;
  memberCount: number;
  momentCount: number;
  hostName: string;
  createdAt: Date;
};

export type AdminCircleDetail = AdminCircleRow & {
  description: string;
  hosts: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }>;
  recentMoments: Array<{
    id: string;
    title: string;
    slug: string;
    status: MomentStatus;
    startsAt: Date;
  }>;
  isDemo: boolean;
  explorerScore: number;
  overrideScore: number | null;
  excludedFromExplorer: boolean;
  scoreUpdatedAt: Date | null;
};

// ─────────────────────────────────────────────
// Moments
// ─────────────────────────────────────────────

export type AdminMomentFilters = {
  search?: string;
  status?: MomentStatus;
  limit?: number;
  offset?: number;
  since?: Date;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AdminMomentRow = {
  id: string;
  slug: string;
  title: string;
  status: MomentStatus;
  circleName: string;
  registrationCount: number;
  commentCount: number;
  capacity: number | null;
  startsAt: Date;
  createdAt: Date;
};

export type AdminMomentDetail = AdminMomentRow & {
  description: string;
  circleId: string;
  circleSlug: string;
  createdByEmail: string | null;
  createdByName: string | null;
  registrations: Array<{
    id: string;
    userId: string;
    userEmail: string;
    userName: string | null;
    status: string;
    registeredAt: Date;
  }>;
};

// ─────────────────────────────────────────────
// Time series
// ─────────────────────────────────────────────

export type AdminTimeSeriesPoint = {
  date: string; // ISO date "YYYY-MM-DD"
  count: number;
};

export type AdminTimeSeries = {
  users: AdminTimeSeriesPoint[];
  registrations: AdminTimeSeriesPoint[];
  moments: AdminTimeSeriesPoint[];
};

// ─────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────

export type AdminActivationStats = {
  totalUsers: number;
  activatedUsers: number; // ≥1 inscription non-annulée
  retainedUsers: number;  // ≥2 inscriptions dans ≥2 événements différents
  activationRate: number; // pourcentage (0-100)
  retentionRate: number;  // pourcentage (0-100)
};

// ─────────────────────────────────────────────
// Insight — Registrations
// ─────────────────────────────────────────────

export type AdminInsightRegistration = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  momentTitle: string;
  momentSlug: string;
  circleName: string;
  status: string;
  registeredAt: Date;
};

// ─────────────────────────────────────────────
// Insight — Members
// ─────────────────────────────────────────────

export type AdminInsightMember = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  circleId: string;
  circleName: string;
  circleSlug: string;
  joinedAt: Date;
};

// ─────────────────────────────────────────────
// Insight — Comments
// ─────────────────────────────────────────────

export type AdminInsightComment = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  content: string;
  momentTitle: string;
  momentSlug: string;
  circleName: string;
  createdAt: Date;
};

// ─────────────────────────────────────────────
// Explorer
// ─────────────────────────────────────────────

export type ExplorerFilter = "all" | "excluded" | "boosted";

export type AdminExplorerFilters = {
  search?: string;
  filter?: ExplorerFilter;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AdminExplorerCircleRow = {
  id: string;
  slug: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  isDemo: boolean;
  explorerScore: number;
  overrideScore: number | null;
  excludedFromExplorer: boolean;
  scoreUpdatedAt: Date | null;
  memberCount: number;
  momentCount: number;
  hostName: string;
};

export type AdminExplorerMomentFilters = {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AdminExplorerMomentRow = {
  id: string;
  slug: string;
  title: string;
  circleName: string;
  circleSlug: string;
  isDemo: boolean;
  explorerScore: number;
  startsAt: Date;
  registrationCount: number;
};

// ─────────────────────────────────────────────
// Repository interface
// ─────────────────────────────────────────────

export interface AdminRepository {
  // Stats
  getStats(): Promise<AdminStats>;
  getTimeSeries(days: number): Promise<AdminTimeSeries>;
  getActivationStats(): Promise<AdminActivationStats>;

  // Users
  findAllUsers(filters: AdminUserFilters): Promise<AdminUserRow[]>;
  countUsers(filters: AdminUserFilters): Promise<number>;
  findUserById(id: string): Promise<AdminUserDetail | null>;
  deleteUser(id: string): Promise<void>;

  // Circles
  findAllCircles(filters: AdminCircleFilters): Promise<AdminCircleRow[]>;
  countCircles(filters: AdminCircleFilters): Promise<number>;
  findCircleById(id: string): Promise<AdminCircleDetail | null>;
  deleteCircle(id: string): Promise<void>;

  // Explorer — Circles
  findAllExplorerCircles(filters: AdminExplorerFilters): Promise<AdminExplorerCircleRow[]>;
  countExplorerCircles(filters: AdminExplorerFilters): Promise<number>;
  updateCircleExcluded(id: string, excluded: boolean): Promise<void>;
  updateCircleOverrideScore(id: string, score: number | null): Promise<void>;

  // Explorer — Moments
  findAllExplorerMoments(filters: AdminExplorerMomentFilters): Promise<AdminExplorerMomentRow[]>;
  countExplorerMoments(filters: AdminExplorerMomentFilters): Promise<number>;

  // Moments
  findAllMoments(filters: AdminMomentFilters): Promise<AdminMomentRow[]>;
  countMoments(filters: AdminMomentFilters): Promise<number>;
  findMomentById(id: string): Promise<AdminMomentDetail | null>;
  deleteMoment(id: string): Promise<void>;
  updateMomentStatus(id: string, status: MomentStatus): Promise<void>;

  // Insights
  getRegistrationsInsight(
    days: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ registrations: AdminInsightRegistration[]; total: number }>;
  getMembersInsight(
    days: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ members: AdminInsightMember[]; total: number }>;
  getCommentsInsight(
    days: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ comments: AdminInsightComment[]; total: number }>;
  getUsersByActivation(
    segment: "never" | "once" | "retained",
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ users: Array<AdminUserRow & { registrationCount: number }>; total: number }>;
}
