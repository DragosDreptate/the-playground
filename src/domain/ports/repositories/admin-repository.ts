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
  recentUsers: number; // derniers 7 jours
  recentCircles: number;
  recentMoments: number;
};

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export type AdminUserFilters = {
  search?: string;
  role?: UserRole;
  limit?: number;
  offset?: number;
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
};

export type AdminCircleRow = {
  id: string;
  slug: string;
  name: string;
  visibility: CircleVisibility;
  category: CircleCategory | null;
  city: string | null;
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
};

// ─────────────────────────────────────────────
// Moments
// ─────────────────────────────────────────────

export type AdminMomentFilters = {
  search?: string;
  status?: MomentStatus;
  limit?: number;
  offset?: number;
};

export type AdminMomentRow = {
  id: string;
  slug: string;
  title: string;
  status: MomentStatus;
  circleName: string;
  registrationCount: number;
  capacity: number | null;
  startsAt: Date;
  createdAt: Date;
};

export type AdminMomentDetail = AdminMomentRow & {
  description: string;
  circleId: string;
  circleSlug: string;
  createdByEmail: string;
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
// Repository interface
// ─────────────────────────────────────────────

export interface AdminRepository {
  // Stats
  getStats(): Promise<AdminStats>;

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

  // Moments
  findAllMoments(filters: AdminMomentFilters): Promise<AdminMomentRow[]>;
  countMoments(filters: AdminMomentFilters): Promise<number>;
  findMomentById(id: string): Promise<AdminMomentDetail | null>;
  deleteMoment(id: string): Promise<void>;
  updateMomentStatus(id: string, status: MomentStatus): Promise<void>;
}
