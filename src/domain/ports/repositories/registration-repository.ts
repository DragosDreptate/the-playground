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
  update(id: string, input: UpdateRegistrationInput): Promise<Registration>;
  findUpcomingByUserId(userId: string): Promise<RegistrationWithMoment[]>;
  findFirstWaitlisted(momentId: string): Promise<Registration | null>;
}
