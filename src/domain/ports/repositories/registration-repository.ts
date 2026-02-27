import type {
  Registration,
  RegistrationStatus,
  RegistrationWithMoment,
  RegistrationWithUser,
} from "@/domain/models/registration";

export type CreateRegistrationInput = {
  momentId: string;
  userId: string;
  status: RegistrationStatus;
};

export type UpdateRegistrationInput = {
  status?: RegistrationStatus;
  cancelledAt?: Date | null;
  checkedInAt?: Date | null;
};

export interface RegistrationRepository {
  create(input: CreateRegistrationInput): Promise<Registration>;
  findById(id: string): Promise<Registration | null>;
  findByMomentAndUser(
    momentId: string,
    userId: string
  ): Promise<Registration | null>;
  findActiveByMomentId(momentId: string): Promise<Registration[]>;
  findActiveWithUserByMomentId(
    momentId: string
  ): Promise<RegistrationWithUser[]>;
  countByMomentIdAndStatus(
    momentId: string,
    status: RegistrationStatus
  ): Promise<number>;
  /**
   * Renvoie une Map momentId → nombre d'inscrits REGISTERED pour une liste de Moments.
   * Une seule requête GROUP BY (évite le N+1 de la page Circle dashboard).
   */
  findRegisteredCountsByMomentIds(momentIds: string[]): Promise<Map<string, number>>;
  /**
   * Renvoie une Map momentId → Registration (ou null) pour un User sur une liste de Moments.
   * Une seule requête (évite le N+1 de la page Circle dashboard).
   */
  findByMomentIdsAndUser(momentIds: string[], userId: string): Promise<Map<string, Registration | null>>;
  update(id: string, input: UpdateRegistrationInput): Promise<Registration>;
  findUpcomingByUserId(userId: string): Promise<RegistrationWithMoment[]>;
  findPastByUserId(userId: string): Promise<RegistrationWithMoment[]>;
  findFirstWaitlisted(momentId: string): Promise<Registration | null>;
  countWaitlistPosition(momentId: string, userId: string): Promise<number>;
  /** Renvoie les inscriptions actives (REGISTERED ou WAITLIST) à venir pour un User dans un Circle. */
  findFutureActiveByUserAndCircle(userId: string, circleId: string): Promise<Registration[]>;
}
