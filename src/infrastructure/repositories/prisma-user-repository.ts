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

      for (const { circleId } of hostMemberships) {
        const otherHostsCount = await tx.circleMembership.count({
          where: { circleId, role: "HOST", userId: { not: id } },
        });

        if (otherHostsCount === 0) {
          // Seul Organisateur → supprimer la Communauté entière (cascade : Moments, inscriptions, commentaires, membres)
          await tx.circle.delete({ where: { id: circleId } });
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
