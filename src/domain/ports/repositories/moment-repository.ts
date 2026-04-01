import type { Moment, LocationType, MomentStatus, CoverImageAttribution, HostMomentSummary } from "@/domain/models/moment";
import type { CircleCategory } from "@/domain/models/circle";
import type { ExplorerSortBy } from "./circle-repository";
import type { PublicMomentRegistration, UserAvatarInfo } from "@/domain/models/user";

export type CreateMomentInput = {
  slug: string;
  circleId: string;
  createdById: string;
  title: string;
  description: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
  capacity: number | null;
  price: number;
  currency: string;
  status: MomentStatus;
  refundable?: boolean;
  requiresApproval?: boolean;
};

export type UpdateMomentInput = {
  title?: string;
  description?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  startsAt?: Date;
  endsAt?: Date | null;
  locationType?: LocationType;
  locationName?: string | null;
  locationAddress?: string | null;
  videoLink?: string | null;
  capacity?: number | null;
  price?: number;
  currency?: string;
  status?: MomentStatus;
  refundable?: boolean;
  requiresApproval?: boolean;
};

export type PublicMomentFilters = {
  category?: CircleCategory;
  sortBy?: ExplorerSortBy;
  limit?: number;
  offset?: number;
};

export type PublicMomentAttendee = { user: UserAvatarInfo };

export type PublicMoment = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  registrationCount: number;
  capacity: number | null;
  explorerScore: number;
  topAttendees: PublicMomentAttendee[];
  circle: {
    slug: string;
    name: string;
    category: CircleCategory | null;
    customCategory: string | null;
    city: string | null;
    isDemo: boolean;
  };
};

export type UpcomingCircleMoment = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  startsAt: Date;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  registrationCount: number;
};

export type MomentForReminder = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  videoLink: string | null;
  circle: { name: string; slug: string };
  registeredUsers: Array<{ email: string; name: string | null }>;
};

export interface MomentRepository {
  create(input: CreateMomentInput): Promise<Moment>;
  findById(id: string): Promise<Moment | null>;
  findBySlug(slug: string): Promise<Moment | null>;
  findByCircleId(circleId: string): Promise<Moment[]>;
  update(id: string, input: UpdateMomentInput): Promise<Moment>;
  delete(id: string): Promise<void>;
  slugExists(slug: string): Promise<boolean>;
  /** Transition PUBLISHED → PAST for Moments whose end time (or start time) has passed. */
  transitionPastMoments(): Promise<number>;
  findPublicUpcoming(filters: PublicMomentFilters): Promise<PublicMoment[]>;
  findUpcomingByCircleId(circleId: string, excludeMomentId: string, limit: number): Promise<UpcomingCircleMoment[]>;
  /** Moments à venir dans les Circles dont l'utilisateur est HOST. */
  findUpcomingByHostUserId(hostUserId: string): Promise<HostMomentSummary[]>;
  /** Moments passés dans les Circles dont l'utilisateur est HOST. */
  findPastByHostUserId(hostUserId: string): Promise<HostMomentSummary[]>;
  /**
   * Renvoie les moments upcoming + past du Host en une seule requête (évite 2 round-trips Neon).
   * Upcoming : status PUBLISHED. Past : status PAST.
   */
  findAllByHostUserId(hostUserId: string): Promise<{ upcoming: HostMomentSummary[]; past: HostMomentSummary[] }>;
  /** Marque un Moment comme ayant été diffusé (broadcast email envoyé). */
  markBroadcastSent(momentId: string): Promise<void>;
  /** Événements PUBLISHED dont le rappel 24h n'a pas encore été envoyé, démarrant dans la fenêtre donnée. */
  findMomentsNeedingReminder(windowStart: Date, windowEnd: Date): Promise<MomentForReminder[]>;
  /** Marque un Moment comme ayant reçu son rappel 24h. */
  markReminderSent(momentId: string): Promise<void>;
  /** Événements à venir dans des Circles publics auxquels l'utilisateur est inscrit (REGISTERED) — pour la page profil public. */
  getUpcomingPublicMomentsForUser(userId: string): Promise<PublicMomentRegistration[]>;
}
