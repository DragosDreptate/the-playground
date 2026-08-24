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
 * Normalise un identifiant de fuseau, ou renvoie `null` s'il est inutilisable.
 *
 * On s'appuie sur `Intl.DateTimeFormat` plutôt que sur `Intl.supportedValuesOf`,
 * qui omet les alias historiques encore émis par certains navigateurs
 * (« Asia/Calcutta », « Europe/Kiev ») et pourtant parfaitement valides.
 *
 * Deux traitements en plus de la validation :
 *
 * 1. **Canonisation de la casse** — `Intl` accepte « europe/paris » et renvoie
 *    « Europe/Paris ». Sans cette étape, la casse d'origine finirait telle quelle
 *    dans les emails (« heure de paris »).
 * 2. **Rejet des décalages bruts** — `Intl` accepte aussi « +01:00 », qui n'est pas
 *    une zone : il ne porte pas les règles d'heure d'été et produirait
 *    « heure de +01:00 » dans un email. On exige donc une forme `Région/Ville`,
 *    `UTC` étant le seul identifiant sans barre oblique qu'on accepte.
 */
export function normalizeTimezone(timezone: string): string | null {
  let canonical: string;
  try {
    canonical = new Intl.DateTimeFormat("en", { timeZone: timezone }).resolvedOptions()
      .timeZone;
  } catch {
    return null;
  }
  if (canonical === "UTC") return canonical;
  return canonical.includes("/") ? canonical : null;
}

/** Vrai si l'identifiant est un fuseau exploitable. Voir `normalizeTimezone`. */
export function isValidTimezone(timezone: string): boolean {
  return normalizeTimezone(timezone) !== null;
}

export type HostMomentSummary = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
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
