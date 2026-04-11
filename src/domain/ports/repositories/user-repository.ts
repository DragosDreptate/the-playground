import type { User, NotificationPreferences, DashboardMode, PublicUser } from "@/domain/models/user";

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  city?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
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
  /**
   * Lookup par publicId — retourne les données publiques + l'id interne en une seule requête.
   * L'id interne est nécessaire pour les jointures downstream (circles, moments) mais ne doit
   * pas être exposé en dehors de la couche app.
   */
  resolvePublicProfile(publicId: string): Promise<{ user: PublicUser; internalUserId: string } | null>;
  /** Génère et persiste un publicId pour l'utilisateur (si absent). */
  ensurePublicId(userId: string, firstName: string | null, lastName: string | null): Promise<string>;
  /** Marque l'utilisateur comme ayant reçu l'email de bienvenue onboarding. */
  setWelcomeEmailSent(userId: string): Promise<void>;
}
