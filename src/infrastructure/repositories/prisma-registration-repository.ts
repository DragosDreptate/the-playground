import { prisma } from "@/infrastructure/db/prisma";
import type {
  RegistrationRepository,
  CreateRegistrationInput,
  UpdateRegistrationInput,
} from "@/domain/ports/repositories/registration-repository";
import type {
  Registration,
  RegistrationStatus,
  RegistrationWithMoment,
  RegistrationWithUser,
} from "@/domain/models/registration";
import type { Registration as PrismaRegistration } from "@prisma/client";

function toDomainRegistration(record: PrismaRegistration): Registration {
  return {
    id: record.id,
    momentId: record.momentId,
    userId: record.userId,
    status: record.status,
    paymentStatus: record.paymentStatus,
    stripePaymentIntentId: record.stripePaymentIntentId,
    registeredAt: record.registeredAt,
    cancelledAt: record.cancelledAt,
    checkedInAt: record.checkedInAt,
  };
}

type PrismaRegistrationWithUser = PrismaRegistration & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  };
};

function toDomainRegistrationWithUser(
  record: PrismaRegistrationWithUser
): RegistrationWithUser {
  return {
    ...toDomainRegistration(record),
    user: {
      id: record.user.id,
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      email: record.user.email,
      image: record.user.image,
    },
  };
}

export const prismaRegistrationRepository: RegistrationRepository = {
  async create(input: CreateRegistrationInput): Promise<Registration> {
    const record = await prisma.registration.create({
      data: {
        momentId: input.momentId,
        userId: input.userId,
        status: input.status,
      },
    });
    return toDomainRegistration(record);
  },

  async findById(id: string): Promise<Registration | null> {
    const record = await prisma.registration.findUnique({ where: { id } });
    return record ? toDomainRegistration(record) : null;
  },

  async findByMomentAndUser(
    momentId: string,
    userId: string
  ): Promise<Registration | null> {
    const record = await prisma.registration.findUnique({
      where: { momentId_userId: { momentId, userId } },
    });
    return record ? toDomainRegistration(record) : null;
  },

  async findActiveByMomentId(momentId: string): Promise<Registration[]> {
    const records = await prisma.registration.findMany({
      where: {
        momentId,
        status: { in: ["REGISTERED", "WAITLISTED"] },
      },
      orderBy: { registeredAt: "asc" },
    });
    return records.map(toDomainRegistration);
  },

  async findActiveWithUserByMomentId(
    momentId: string
  ): Promise<RegistrationWithUser[]> {
    const records = await prisma.registration.findMany({
      where: {
        momentId,
        status: { in: ["REGISTERED", "WAITLISTED"] },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { registeredAt: "asc" },
    });
    return records.map(toDomainRegistrationWithUser);
  },

  async countByMomentIdAndStatus(
    momentId: string,
    status: RegistrationStatus
  ): Promise<number> {
    return prisma.registration.count({
      where: { momentId, status },
    });
  },

  async update(
    id: string,
    input: UpdateRegistrationInput
  ): Promise<Registration> {
    const record = await prisma.registration.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.cancelledAt !== undefined && {
          cancelledAt: input.cancelledAt,
        }),
        ...(input.checkedInAt !== undefined && {
          checkedInAt: input.checkedInAt,
        }),
      },
    });
    return toDomainRegistration(record);
  },

  async findUpcomingByUserId(userId: string): Promise<RegistrationWithMoment[]> {
    const records = await prisma.registration.findMany({
      where: {
        userId,
        status: { in: ["REGISTERED", "WAITLISTED"] },
        moment: {
          status: "PUBLISHED",
          startsAt: { gt: new Date() },
        },
      },
      include: {
        moment: {
          select: {
            id: true,
            slug: true,
            title: true,
            startsAt: true,
            endsAt: true,
            locationType: true,
            locationName: true,
            circle: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { moment: { startsAt: "asc" } },
    });
    return records.map((r) => ({
      ...toDomainRegistration(r),
      moment: {
        id: r.moment.id,
        slug: r.moment.slug,
        title: r.moment.title,
        startsAt: r.moment.startsAt,
        endsAt: r.moment.endsAt,
        locationType: r.moment.locationType,
        locationName: r.moment.locationName,
        circleName: r.moment.circle.name,
        circleSlug: r.moment.circle.slug,
      },
    }));
  },

  async findFirstWaitlisted(momentId: string): Promise<Registration | null> {
    const record = await prisma.registration.findFirst({
      where: { momentId, status: "WAITLISTED" },
      orderBy: { registeredAt: "asc" },
    });
    return record ? toDomainRegistration(record) : null;
  },
};
