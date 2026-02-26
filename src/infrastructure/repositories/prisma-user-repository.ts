import { prisma } from "@/infrastructure/db/prisma";
import type {
  UserRepository,
  UpdateProfileInput,
  UpdateNotificationPreferencesInput,
} from "@/domain/ports/repositories/user-repository";
import type { User, NotificationPreferences } from "@/domain/models/user";
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
    notifyNewFollower: record.notifyNewFollower,
    notifyNewMomentInCircle: record.notifyNewMomentInCircle,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toNotificationPreferences(record: PrismaUser): NotificationPreferences {
  return {
    notifyNewRegistration: record.notifyNewRegistration,
    notifyNewComment: record.notifyNewComment,
    notifyNewFollower: record.notifyNewFollower,
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

        // Compter les co-Hosts restants pour chaque Circle en une seule requête GROUP BY
        const otherHostCounts = await tx.circleMembership.groupBy({
          by: ["circleId"],
          where: { circleId: { in: circleIds }, role: "HOST", userId: { not: id } },
          _count: { _all: true },
        });
        const otherHostCountMap = new Map(
          otherHostCounts.map((r) => [r.circleId, r._count._all])
        );

        // Supprimer les Circles dont cet utilisateur est le seul Organisateur
        const circleIdsToDelete = circleIds.filter(
          (cid) => (otherHostCountMap.get(cid) ?? 0) === 0
        );
        if (circleIdsToDelete.length > 0) {
          // deleteMany ne cascade pas — on supprime via delete pour déclencher les cascades Prisma
          for (const circleId of circleIdsToDelete) {
            await tx.circle.delete({ where: { id: circleId } });
          }
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
        notifyNewFollower: true,
        notifyNewMomentInCircle: true,
      },
    });
    return record;
  },

  async findNotificationPreferencesByIds(
    userIds: string[]
  ): Promise<Map<string, NotificationPreferences>> {
    if (userIds.length === 0) return new Map();
    const records = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        notifyNewRegistration: true,
        notifyNewComment: true,
        notifyNewFollower: true,
        notifyNewMomentInCircle: true,
      },
    });
    return new Map(
      records.map((r) => [
        r.id,
        {
          notifyNewRegistration: r.notifyNewRegistration,
          notifyNewComment: r.notifyNewComment,
          notifyNewFollower: r.notifyNewFollower,
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
        notifyNewFollower: input.notifyNewFollower,
        notifyNewMomentInCircle: input.notifyNewMomentInCircle,
      },
    });
    return toNotificationPreferences(record);
  },
};
