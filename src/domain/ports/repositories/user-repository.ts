import type { User, NotificationPreferences, DashboardMode } from "@/domain/models/user";

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
  /** Récupère les préférences de notification pour plusieurs utilisateurs en une seule requête (évite le N+1). */
  findNotificationPreferencesByIds(userIds: string[]): Promise<Map<string, NotificationPreferences>>;
  updateNotificationPreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences>;
  updateDashboardMode(userId: string, mode: DashboardMode): Promise<void>;
}
