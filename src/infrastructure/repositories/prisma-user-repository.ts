import { prisma } from "@/infrastructure/db/prisma";
import type {
  UserRepository,
  UpdateProfileInput,
} from "@/domain/ports/repositories/user-repository";
import type { User } from "@/domain/models/user";
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
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const prismaUserRepository: UserRepository = {
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
};
