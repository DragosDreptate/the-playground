import { prisma } from "@/infrastructure/db/prisma";
import type {
  RegistrationRepository,
  CreateRegistrationInput,
  UpdateRegistrationInput,
} from "@/domain/ports/repositories/registration-repository";
import type {
  Registration,
  PaymentStatus,
  RegistrationStatus,
  RegistrationWithMoment,
  RegistrationWithUser,
} from "@/domain/models/registration";
import type { LocationType } from "@/domain/models/moment";
import type { Registration as PrismaRegistration } from "@prisma/client";

function toDomainRegistration(record: PrismaRegistration): Registration {
  return {
    id: record.id,
    momentId: record.momentId,
    userId: record.userId,
    status: record.status,
    paymentStatus: record.paymentStatus,
    stripePaymentIntentId: record.stripePaymentIntentId,
    stripeReceiptUrl: record.stripeReceiptUrl,
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
    publicId: string | null;
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
      publicId: record.user.publicId,
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
        ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
        ...(input.stripePaymentIntentId && { stripePaymentIntentId: input.stripePaymentIntentId }),
        ...(input.stripeReceiptUrl && { stripeReceiptUrl: input.stripeReceiptUrl }),
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

  async countActiveByMomentId(momentId: string): Promise<number> {
    return prisma.registration.count({
      where: { momentId, status: { in: ["REGISTERED", "CHECKED_IN"] } },
    });
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
            publicId: true,
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

  async findRegisteredCountsByMomentIds(momentIds: string[]): Promise<Map<string, number>> {
    if (momentIds.length === 0) return new Map();
    // Requête GROUP BY : une seule requête pour N Moments (évite le N+1)
    const counts = await prisma.registration.groupBy({
      by: ["momentId"],
      where: { momentId: { in: momentIds }, status: "REGISTERED" },
      _count: { _all: true },
    });
    // Les Moments sans inscriptions n'apparaissent pas dans le résultat → valeur 0 par défaut
    const result = new Map(momentIds.map((id) => [id, 0]));
    for (const row of counts) {
      result.set(row.momentId, row._count._all);
    }
    return result;
  },

  async findByMomentIdsAndUser(momentIds: string[], userId: string): Promise<Map<string, Registration | null>> {
    if (momentIds.length === 0) return new Map();
    // Une seule requête pour toutes les inscriptions de l'utilisateur sur ces Moments
    const records = await prisma.registration.findMany({
      where: { momentId: { in: momentIds }, userId },
    });
    const result = new Map<string, Registration | null>(momentIds.map((id) => [id, null]));
    for (const record of records) {
      result.set(record.momentId, toDomainRegistration(record));
    }
    return result;
  },

  async update(
    id: string,
    input: UpdateRegistrationInput
  ): Promise<Registration> {
    const record = await prisma.registration.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.paymentStatus !== undefined && { paymentStatus: input.paymentStatus }),
        ...(input.stripePaymentIntentId !== undefined && { stripePaymentIntentId: input.stripePaymentIntentId }),
        ...(input.stripeReceiptUrl !== undefined && { stripeReceiptUrl: input.stripeReceiptUrl }),
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
        status: { in: ["REGISTERED", "WAITLISTED", "PENDING_APPROVAL"] },
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
            coverImage: true,
            startsAt: true,
            endsAt: true,
            locationType: true,
            locationName: true,
            circle: { select: { name: true, slug: true, coverImage: true } },
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
        coverImage: r.moment.coverImage ?? null,
        startsAt: r.moment.startsAt,
        endsAt: r.moment.endsAt,
        locationType: r.moment.locationType,
        locationName: r.moment.locationName,
        circleName: r.moment.circle.name,
        circleSlug: r.moment.circle.slug,
        circleCoverImage: r.moment.circle.coverImage ?? null,
        registrationCount: 0,
        topAttendees: [],
      },
    }));
  },

  async findPastByUserId(userId: string): Promise<RegistrationWithMoment[]> {
    const records = await prisma.registration.findMany({
      where: {
        userId,
        status: { in: ["REGISTERED", "CHECKED_IN"] },
        moment: {
          status: "PAST",
        },
      },
      include: {
        moment: {
          select: {
            id: true,
            slug: true,
            title: true,
            coverImage: true,
            startsAt: true,
            endsAt: true,
            locationType: true,
            locationName: true,
            circle: { select: { name: true, slug: true, coverImage: true } },
          },
        },
      },
      orderBy: { moment: { startsAt: "desc" } },
    });
    return records.map((r) => ({
      ...toDomainRegistration(r),
      moment: {
        id: r.moment.id,
        slug: r.moment.slug,
        title: r.moment.title,
        coverImage: r.moment.coverImage ?? null,
        startsAt: r.moment.startsAt,
        endsAt: r.moment.endsAt,
        locationType: r.moment.locationType,
        locationName: r.moment.locationName,
        circleName: r.moment.circle.name,
        circleSlug: r.moment.circle.slug,
        circleCoverImage: r.moment.circle.coverImage ?? null,
        registrationCount: 0,
        topAttendees: [],
      },
    }));
  },

  async findAllForUserDashboard(
    userId: string
  ): Promise<{ upcoming: RegistrationWithMoment[]; past: RegistrationWithMoment[] }> {
    // $queryRaw : 1 seul round-trip HTTP Neon au lieu de 3 (registrations → moments → circles)
    type Row = {
      id: string;
      momentId: string;
      userId: string;
      status: string;
      paymentStatus: string;
      stripePaymentIntentId: string | null;
      stripeReceiptUrl: string | null;
      registeredAt: Date;
      cancelledAt: Date | null;
      checkedInAt: Date | null;
      mId: string;
      mSlug: string;
      mTitle: string;
      mCoverImage: string | null;
      mStartsAt: Date;
      mEndsAt: Date | null;
      mLocationType: string;
      mLocationName: string | null;
      mStatus: string;
      cName: string;
      cSlug: string;
      cCoverImage: string | null;
      mRegistrationCount: bigint;
      mTopAttendees: { firstName: string | null; lastName: string | null; email: string; image: string | null }[];
    };

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        r.id,
        r."momentId",
        r."userId",
        r.status,
        r."paymentStatus",
        r."stripePaymentIntentId",
        r."stripeReceiptUrl",
        r."registeredAt",
        r."cancelledAt",
        r."checkedInAt",
        m.id                    AS "mId",
        m.slug                  AS "mSlug",
        m.title                 AS "mTitle",
        m."coverImage"          AS "mCoverImage",
        m."startsAt"            AS "mStartsAt",
        m."endsAt"              AS "mEndsAt",
        m."locationType"        AS "mLocationType",
        m."locationName"        AS "mLocationName",
        m.status                AS "mStatus",
        c.name                  AS "cName",
        c.slug                  AS "cSlug",
        c."coverImage"          AS "cCoverImage",
        (SELECT COUNT(*) FROM registrations r2
         WHERE r2."momentId" = m.id
           AND r2.status IN ('REGISTERED', 'CHECKED_IN')) AS "mRegistrationCount",
        (SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
          SELECT u."firstName", u."lastName", u.email, u.image
          FROM registrations r3
          JOIN users u ON u.id = r3."userId"
          WHERE r3."momentId" = m.id AND r3.status = 'REGISTERED'
          ORDER BY r3."registeredAt" ASC
          LIMIT 3
        ) sub) AS "mTopAttendees"
      FROM registrations r
      JOIN moments m ON m.id = r."momentId"
      JOIN circles c ON c.id = m."circleId"
      WHERE r."userId" = ${userId}
        AND (
          (r.status IN ('REGISTERED', 'WAITLISTED', 'PENDING_APPROVAL') AND m.status = 'PUBLISHED' AND m."startsAt" > NOW())
          OR
          (r.status IN ('REGISTERED', 'CHECKED_IN') AND m.status = 'PAST')
        )
      ORDER BY m."startsAt" ASC
    `;

    const toItem = (row: Row): RegistrationWithMoment => ({
      id: row.id,
      momentId: row.momentId,
      userId: row.userId,
      status: row.status as RegistrationStatus,
      paymentStatus: row.paymentStatus as PaymentStatus,
      stripePaymentIntentId: row.stripePaymentIntentId,
      stripeReceiptUrl: row.stripeReceiptUrl ?? null,
      registeredAt: row.registeredAt,
      cancelledAt: row.cancelledAt,
      checkedInAt: row.checkedInAt,
      moment: {
        id: row.mId,
        slug: row.mSlug,
        title: row.mTitle,
        coverImage: row.mCoverImage,
        startsAt: row.mStartsAt,
        endsAt: row.mEndsAt,
        locationType: row.mLocationType as LocationType,
        locationName: row.mLocationName,
        circleName: row.cName,
        circleSlug: row.cSlug,
        circleCoverImage: row.cCoverImage,
        registrationCount: Number(row.mRegistrationCount),
        topAttendees: (row.mTopAttendees ?? []).map((u) => ({ user: u })),
      },
    });

    const upcoming: RegistrationWithMoment[] = [];
    const past: RegistrationWithMoment[] = [];
    for (const row of rows) {
      if (row.mStatus === "PAST") past.push(toItem(row));
      else upcoming.push(toItem(row));
    }
    // Les moments passés triés par date décroissante
    past.sort((a, b) => b.moment.startsAt.getTime() - a.moment.startsAt.getTime());

    return { upcoming, past };
  },

  async findFirstWaitlisted(momentId: string): Promise<Registration | null> {
    const record = await prisma.registration.findFirst({
      where: { momentId, status: "WAITLISTED" },
      orderBy: { registeredAt: "asc" },
    });
    return record ? toDomainRegistration(record) : null;
  },

  async findFutureActiveByUserAndCircle(userId: string, circleId: string): Promise<Registration[]> {
    const now = new Date();
    const records = await prisma.registration.findMany({
      where: {
        userId,
        status: { in: ["REGISTERED", "WAITLISTED"] },
        moment: {
          circleId,
          startsAt: { gt: now },
        },
      },
    });
    return records.map(toDomainRegistration);
  },

  async countWaitlistPosition(momentId: string, userId: string): Promise<number> {
    const registration = await prisma.registration.findUnique({
      where: { momentId_userId: { momentId, userId } },
      select: { registeredAt: true, status: true },
    });

    if (!registration || registration.status !== "WAITLISTED") return 0;

    // Position = nombre d'inscrits en liste d'attente avant moi (par date) + 1
    const before = await prisma.registration.count({
      where: {
        momentId,
        status: "WAITLISTED",
        registeredAt: { lt: registration.registeredAt },
      },
    });

    return before + 1;
  },

  async findPendingApprovals(momentId: string): Promise<RegistrationWithUser[]> {
    const records = await prisma.registration.findMany({
      where: { momentId, status: "PENDING_APPROVAL" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, image: true, publicId: true },
        },
      },
      orderBy: { registeredAt: "asc" },
    });
    return records.map((r) => ({
      ...toDomainRegistration(r),
      user: r.user,
    }));
  },

  async countPendingApprovals(momentId: string): Promise<number> {
    return prisma.registration.count({
      where: { momentId, status: "PENDING_APPROVAL" },
    });
  },

  async rejectAllPendingApprovals(momentId: string): Promise<number> {
    const result = await prisma.registration.updateMany({
      where: { momentId, status: "PENDING_APPROVAL" },
      data: { status: "REJECTED" },
    });
    return result.count;
  },

  async findByStripePaymentIntentId(paymentIntentId: string): Promise<Registration | null> {
    const record = await prisma.registration.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    return record ? toDomainRegistration(record) : null;
  },

  async findTopRegistrantsByMomentIds(momentIds: string[], limit: number): Promise<Map<string, RegistrationWithUser[]>> {
    if (momentIds.length === 0) return new Map();
    // N requêtes parallèles bornées (take: limit) — évite de charger tous les inscrits
    const entries = await Promise.all(
      momentIds.map(async (id) => {
        const records = await prisma.registration.findMany({
          where: { momentId: id, status: "REGISTERED" },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, image: true, publicId: true },
            },
          },
          orderBy: { registeredAt: "asc" },
          take: limit,
        });
        return [id, records.map(toDomainRegistrationWithUser)] as const;
      })
    );
    return new Map(entries);
  },

  async getPaymentSummary(momentId: string) {
    const [paidResult, refundedResult, moment] = await Promise.all([
      prisma.registration.aggregate({
        where: { momentId, paymentStatus: "PAID", status: { not: "CANCELLED" } },
        _count: true,
      }),
      prisma.registration.aggregate({
        where: { momentId, paymentStatus: "REFUNDED" },
        _count: true,
      }),
      prisma.moment.findUnique({
        where: { id: momentId },
        select: { price: true },
      }),
    ]);

    return {
      paidCount: paidResult._count,
      totalAmount: (paidResult._count) * (moment?.price ?? 0),
      refundedCount: refundedResult._count,
    };
  },
};
