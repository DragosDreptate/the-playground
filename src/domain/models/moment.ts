import type { CoverImageAttribution } from "@/domain/models/circle";
import type { UserAvatarInfo } from "@/domain/models/user";

export type { CoverImageAttribution };

export type LocationType = "IN_PERSON" | "ONLINE" | "HYBRID";

export type MomentStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "PAST";

export type MomentTopAttendee = { user: UserAvatarInfo };

/**
 * Fuseau appliqué quand aucun n'a été saisi : créations hors UI (seeds, scripts)
 * et événements créés avant l'introduction du champ. Voir ADR-0008.
 */
export const DEFAULT_TIMEZONE = "Europe/Paris";

/**
 * Valide un identifiant de fuseau IANA.
 *
 * On s'appuie sur `Intl.DateTimeFormat`, qui lève une `RangeError` sur un fuseau
 * inconnu, plutôt que sur `Intl.supportedValuesOf("timeZone")` : cette dernière
 * omet les alias historiques encore émis par certains navigateurs (« Asia/Calcutta »,
 * « Europe/Kiev »), qui sont pourtant valides.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export type HostMomentSummary = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  status: MomentStatus;
  registrationCount: number;
  topAttendees: MomentTopAttendee[];
  circle: {
    slug: string;
    name: string;
    coverImage: string | null;
  };
};

export type Moment = {
  id: string;
  slug: string;
  circleId: string;
  createdById: string | null;
  title: string;
  description: string;
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
  startsAt: Date;
  endsAt: Date | null;
  /** Fuseau de l'événement (identifiant IANA, ex. "Europe/Dublin"). Voir ADR-0008. */
  timezone: string;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
  capacity: number | null;
  price: number; // In cents. 0 = free. Stripe convention.
  currency: string;
  status: MomentStatus;
  refundable: boolean;
  requiresApproval: boolean;
  lastHostMessageSentAt: Date | null;
  reminder24hSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
