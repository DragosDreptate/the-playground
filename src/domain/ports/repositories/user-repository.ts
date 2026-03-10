import type { User, NotificationPreferences, DashboardMode, PublicUser } from "@/domain/models/user";

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  name?: string | null;
  image?: string | null;
};

export type UpdateNotificationPreferencesInput = NotificationPreferences;

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  updateProfile(id: string, input: UpdateProfileInput): Promise<User>;
  delete(id: string): Promise<void>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  /**
   * Récupère les préférences de notification de plusieurs utilisateurs en une seule requête.
   * Évite le N+1 lors de l'envoi de notifications à plusieurs Hosts.
   */
  findNotificationPreferencesByIds(userIds: string[]): Promise<Map<string, NotificationPreferences>>;
  updateNotificationPreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences>;
  updateDashboardMode(userId: string, mode: DashboardMode): Promise<void>;
  findAdminEmails(): Promise<string[]>;
  /** Lookup par publicId — retourne les données publiques de l'utilisateur (jamais l'email). */
  getPublicUserByPublicId(publicId: string): Promise<PublicUser | null>;
  /** Retourne l'id interne de l'utilisateur à partir de son publicId (pour les jointures internes). */
  findUserIdByPublicId(publicId: string): Promise<string | null>;
  /** Génère et persiste un publicId pour l'utilisateur (si absent). */
  ensurePublicId(userId: string, firstName: string | null, lastName: string | null): Promise<string>;
}
