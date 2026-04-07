import { prisma } from "@/infrastructure/db/prisma";
import type {
  UserRepository,
  UpdateProfileInput,
  UpdateNotificationPreferencesInput,
} from "@/domain/ports/repositories/user-repository";
import type { User, NotificationPreferences, DashboardMode, PublicUser } from "@/domain/models/user";
import { generatePublicId } from "@/lib/public-id";
import type { User as PrismaUser } from "@prisma/client";

function toDomainUser(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    firstName: record.firstName,
    lastName: record.lastName,
    image: record.image,
    emailVerified: record.emailVerified,
    onboardingCompleted: record.onboardingCompleted,
    role: record.role,
    notifyNewRegistration: record.notifyNewRegistration,
    notifyNewComment: record.notifyNewComment,
    notifyNewMomentInCircle: record.notifyNewMomentInCircle,
    bio: record.bio,
    city: record.city,
    website: record.website,
    linkedinUrl: record.linkedinUrl,
    twitterUrl: record.twitterUrl,
    githubUrl: record.githubUrl,
    dashboardMode: record.dashboardMode as DashboardMode | null,
    publicId: record.publicId ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toNotificationPreferences(record: PrismaUser): NotificationPreferences {
  return {
    notifyNewRegistration: record.notifyNewRegistration,
    notifyNewComment: record.notifyNewComment,
    notifyNewMomentInCircle: record.notifyNewMomentInCircle,
  };
}

export const prismaUserRepository: UserRepository = {
  async delete(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Trouver les Circles dont cet user est le seul HOST
      const hostMemberships = await tx.circleMembership.findMany({
        where: { userId: id, role: "HOST" },
        select: { circleId: true },
      });

      if (hostMemberships.length > 0) {
        const circleIds = hostMemberships.map((m) => m.circleId);

        // Une seule requête GROUP BY pour compter les autres Hosts sur tous les Circles (évite le N+1)
        const otherHostCounts = await tx.circleMembership.groupBy({
          by: ["circleId"],
          where: { circleId: { in: circleIds }, role: "HOST", userId: { not: id } },
          _count: { _all: true },
        });
        const otherHostCountMap = new Map(
          otherHostCounts.map((r) => [r.circleId, r._count._all])
        );

        // Supprimer uniquement les Circles sans autre Host
        const circlesWithNoOtherHost = circleIds.filter(
          (cid) => (otherHostCountMap.get(cid) ?? 0) === 0
        );
        if (circlesWithNoOtherHost.length > 0) {
          // deleteMany avec cascade (Moments, inscriptions, commentaires, membres)
          await tx.circle.deleteMany({
            where: { id: { in: circlesWithNoOtherHost } },
          });
        }
      }

      // Supprimer l'utilisateur (cascade : memberships restantes, inscriptions, commentaires, sessions, accounts)
      await tx.user.delete({ where: { id } });
    });
  },

  async findById(id: string): Promise<User | null> {
    const record = await prisma.user.findUnique({ where: { id } });
    return record ? toDomainUser(record) : null;
  },

  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const record = await prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.image !== undefined && { image: input.image }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
        ...(input.twitterUrl !== undefined && { twitterUrl: input.twitterUrl }),
        ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl }),
        onboardingCompleted: true,
      },
    });
    return toDomainUser(record);
  },

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const record = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        notifyNewRegistration: true,
        notifyNewComment: true,
        notifyNewMomentInCircle: true,
      },
    });
    return record;
  },

  async findNotificationPreferencesByIds(
    userIds: string[]
  ): Promise<Map<string, NotificationPreferences>> {
    if (userIds.length === 0) return new Map();
    // Une seule requête pour tous les utilisateurs — évite le N+1 dans les boucles de notification
    const records = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        notifyNewRegistration: true,
        notifyNewComment: true,
        notifyNewMomentInCircle: true,
      },
    });
    return new Map(
      records.map((r) => [
        r.id,
        {
          notifyNewRegistration: r.notifyNewRegistration,
          notifyNewComment: r.notifyNewComment,
          notifyNewMomentInCircle: r.notifyNewMomentInCircle,
        },
      ])
    );
  },

  async updateNotificationPreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    const record = await prisma.user.update({
      where: { id: userId },
      data: {
        notifyNewRegistration: input.notifyNewRegistration,
        notifyNewComment: input.notifyNewComment,
        notifyNewMomentInCircle: input.notifyNewMomentInCircle,
      },
    });
    return toNotificationPreferences(record);
  },

  async updateDashboardMode(userId: string, mode: DashboardMode): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { dashboardMode: mode },
    });
  },

  async findAdminEmails(): Promise<string[]> {
    const records = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    return records.map((r) => r.email).filter(Boolean) as string[];
  },

  async resolvePublicProfile(
    publicId: string
  ): Promise<{ user: PublicUser; internalUserId: string } | null> {
    const record = await prisma.user.findUnique({
      where: { publicId },
      select: {
        id: true,
        publicId: true,
        firstName: true,
        lastName: true,
        image: true,
        bio: true,
        city: true,
        website: true,
        linkedinUrl: true,
        twitterUrl: true,
        githubUrl: true,
        createdAt: true,
        memberships: {
          where: { role: "HOST" },
          select: {
            circle: {
              select: { _count: { select: { moments: true } } },
            },
          },
        },
      },
    });

    if (!record || !record.publicId) return null;

    const hostedMomentsCount = record.memberships.reduce(
      (sum, m) => sum + m.circle._count.moments,
      0
    );

    return {
      user: {
        publicId: record.publicId,
        firstName: record.firstName ?? "",
        lastName: record.lastName ?? "",
        image: record.image,
        bio: record.bio,
        city: record.city,
        socialLinks: {
          website: record.website,
          linkedinUrl: record.linkedinUrl,
          twitterUrl: record.twitterUrl,
          githubUrl: record.githubUrl,
        },
        memberSince: record.createdAt,
        hostedMomentsCount,
      },
      internalUserId: record.id,
    };
  },

  async ensurePublicId(
    userId: string,
    firstName: string | null,
    lastName: string | null
  ): Promise<string> {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { publicId: true },
    });

    if (existing?.publicId) return existing.publicId;

    // Générer avec retry jusqu'à 10 fois en cas de collision
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generatePublicId(firstName, lastName);
      const conflict = await prisma.user.findUnique({
        where: { publicId: candidate },
        select: { id: true },
      });
      if (!conflict) {
        await prisma.user.update({
          where: { id: userId },
          data: { publicId: candidate },
        });
        return candidate;
      }
    }

    throw new Error(`[ensurePublicId] Impossible de générer un publicId unique pour l'utilisateur ${userId}`);
  },
};
