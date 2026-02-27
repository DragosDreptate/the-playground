"use server";

import * as Sentry from "@sentry/nextjs";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createResendEmailService } from "@/infrastructure/services";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import { createMoment } from "@/domain/usecases/create-moment";
import { updateMoment } from "@/domain/usecases/update-moment";
import { deleteMoment } from "@/domain/usecases/delete-moment";
import { DomainError } from "@/domain/errors";
import type { LocationType, Moment } from "@/domain/models/moment";
import type { RegistrationWithUser } from "@/domain/models/registration";
import type { ActionResult } from "./types";
import { processCoverImage } from "./cover-image";
import { revalidatePath } from "next/cache";
import { notifyNewMoment } from "./notify-new-moment";

const emailService = createResendEmailService();

function getDateFnsLocale(locale: string) {
  return locale === "fr" ? fr : enUS;
}

function formatLocationText(
  locationType: string,
  locationName: string | null,
  locationAddress: string | null,
  videoLink: string | null,
  locale: string
): string {
  if (locationType === "ONLINE") {
    return videoLink ?? (locale === "fr" ? "En ligne" : "Online");
  }
  return (
    [locationName, locationAddress].filter(Boolean).join(", ") ||
    (locale === "fr" ? "À définir" : "TBD")
  );
}

export async function createMomentAction(
  circleId: string,
  formData: FormData
): Promise<ActionResult<Moment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const startsAtRaw = formData.get("startsAt") as string;
  const endsAtRaw = formData.get("endsAt") as string | null;
  const locationType = (formData.get("locationType") as LocationType) ?? "IN_PERSON";
  const locationName = (formData.get("locationName") as string) || null;
  const locationAddress = (formData.get("locationAddress") as string) || null;
  const videoLink = (formData.get("videoLink") as string) || null;
  const capacityRaw = formData.get("capacity") as string | null;
  const priceRaw = formData.get("price") as string | null;
  const currency = (formData.get("currency") as string) || "EUR";

  if (!title?.trim()) {
    return { success: false, error: "Title is required", code: "VALIDATION" };
  }
  if (!description?.trim()) {
    return { success: false, error: "Description is required", code: "VALIDATION" };
  }
  if (!startsAtRaw) {
    return { success: false, error: "Start date is required", code: "VALIDATION" };
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  const capacity = capacityRaw ? parseInt(capacityRaw, 10) || null : null;
  const price = priceRaw ? parseInt(priceRaw, 10) || 0 : 0;

  try {
    const coverData = await processCoverImage(formData);

    const result = await createMoment(
      {
        circleId,
        userId: session.user.id,
        title: title.trim(),
        description: description.trim(),
        ...coverData,
        startsAt,
        endsAt,
        locationType,
        locationName,
        locationAddress,
        videoLink,
        capacity,
        price,
        currency,
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        registrationRepository: prismaRegistrationRepository,
      }
    );

    // Fire-and-forget : notifier les followers/membres + envoyer email de confirmation à l'organisateur
    prismaCircleRepository.findById(circleId).then(async (circle) => {
      if (!circle) return;

      // Notifier les followers et membres du Circle
      notifyNewMoment(result.moment, session.user.id, circle.name, circle.slug).catch(
        console.error
      );

      // Email de confirmation à l'organisateur avec ICS
      const [host, locale] = await Promise.all([
        prismaUserRepository.findById(session.user.id),
        getLocale(),
      ]);
      if (!host?.email) return;

      const dateFnsLocale = getDateFnsLocale(locale);
      const momentDate = format(result.moment.startsAt, "EEEE d MMMM yyyy, HH:mm", { locale: dateFnsLocale });
      const momentDateMonth = format(result.moment.startsAt, "MMM", { locale: dateFnsLocale }).toUpperCase();
      const momentDateDay = format(result.moment.startsAt, "d");
      const locationText = formatLocationText(
        result.moment.locationType,
        result.moment.locationName,
        result.moment.locationAddress,
        result.moment.videoLink,
        locale
      );
      const hostName = [host.firstName, host.lastName].filter(Boolean).join(" ") || host.email;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const icsContent = generateIcs({
        uid: result.moment.id,
        title: result.moment.title,
        description: result.moment.description,
        startsAt: result.moment.startsAt,
        endsAt: result.moment.endsAt,
        location: locationText,
        videoLink: result.moment.videoLink,
        url: `${appUrl}/m/${result.moment.slug}`,
        organizerName: circle.name,
      });

      const t = await getTranslations({ locale, namespace: "Email" });
      await emailService.sendHostMomentCreated({
        to: host.email,
        hostName,
        momentTitle: result.moment.title,
        momentSlug: result.moment.slug,
        circleSlug: circle.slug,
        momentDate,
        momentDateMonth,
        momentDateDay,
        locationText,
        circleName: circle.name,
        icsContent,
        strings: {
          subject: t("hostMomentCreated.subject", { momentTitle: result.moment.title }),
          heading: t("hostMomentCreated.heading"),
          statusMessage: t("hostMomentCreated.statusMessage", { momentTitle: result.moment.title }),
          dateLabel: t("common.dateLabel"),
          locationLabel: t("common.locationLabel"),
          manageMomentCta: t("hostMomentCreated.manageMomentCta"),
          footer: t("common.footer"),
        },
      });
    }).catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });

    revalidatePath("/", "layout");
    return { success: true, data: result.moment };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

export async function updateMomentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<Moment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const startsAtRaw = formData.get("startsAt") as string;
  const endsAtRaw = formData.get("endsAt") as string | null;
  const locationType = formData.get("locationType") as LocationType | null;
  const locationName = formData.get("locationName") as string | null;
  const locationAddress = formData.get("locationAddress") as string | null;
  const videoLink = formData.get("videoLink") as string | null;
  const capacityRaw = formData.get("capacity") as string | null;
  const priceRaw = formData.get("price") as string | null;
  const currency = formData.get("currency") as string | null;
  const status = formData.get("status") as string | null;

  if (title !== null && !title.trim()) {
    return { success: false, error: "Title cannot be empty", code: "VALIDATION" };
  }

  const capacity = capacityRaw ? parseInt(capacityRaw, 10) || null : undefined;
  const price = priceRaw !== null ? parseInt(priceRaw, 10) || 0 : undefined;

  try {
    // Récupère l'ancienne cover pour cleanup si besoin
    const existingMoment = await prismaMomentRepository.findById(momentId);
    const oldCoverImage = existingMoment?.coverImage ?? null;

    const coverData = await processCoverImage(formData);

    const result = await updateMoment(
      {
        momentId,
        userId: session.user.id,
        ...(title && { title: title.trim() }),
        ...(description !== null && { description: description.trim() }),
        ...coverData,
        ...(startsAtRaw && { startsAt: new Date(startsAtRaw) }),
        ...(endsAtRaw !== undefined && { endsAt: endsAtRaw ? new Date(endsAtRaw) : null }),
        ...(locationType && { locationType }),
        ...(locationName !== undefined && { locationName: locationName || null }),
        ...(locationAddress !== undefined && { locationAddress: locationAddress || null }),
        ...(videoLink !== undefined && { videoLink: videoLink || null }),
        ...(capacity !== undefined && { capacity }),
        ...(price !== undefined && { price }),
        ...(currency && { currency }),
        ...(status && { status: status as Moment["status"] }),
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    // Cleanup ancien blob si une nouvelle image a été uploadée
    if (
      coverData.coverImage !== undefined &&
      coverData.coverImage !== oldCoverImage &&
      oldCoverImage
    ) {
      await vercelBlobStorageService.delete(oldCoverImage);
    }

    // Notifier les participants si date/heure ou lieu ont changé
    if (existingMoment) {
      const dateChanged =
        (startsAtRaw && new Date(startsAtRaw).getTime() !== existingMoment.startsAt.getTime()) ||
        (endsAtRaw !== null && endsAtRaw
          ? !existingMoment.endsAt ||
            new Date(endsAtRaw).getTime() !== existingMoment.endsAt.getTime()
          : endsAtRaw === "" && existingMoment.endsAt !== null);

      const locationChanged =
        (locationType && locationType !== existingMoment.locationType) ||
        (locationName !== null && locationName !== existingMoment.locationName) ||
        (locationAddress !== null && locationAddress !== existingMoment.locationAddress);

      if (dateChanged || locationChanged) {
        const locale = await getLocale();
        const t = await getTranslations("Email");
        sendMomentUpdateEmails(
          result.moment,
          Boolean(dateChanged),
          Boolean(locationChanged),
          t,
          locale
        ).catch((err) => Sentry.captureException(err));
      }
    }

    revalidatePath("/", "layout");
    return { success: true, data: result.moment };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

type TranslationFunction = Awaited<ReturnType<typeof getTranslations<"Email">>>;

async function sendMomentUpdateEmails(
  moment: Moment,
  dateChanged: boolean,
  locationChanged: boolean,
  t: TranslationFunction,
  locale: string
): Promise<void> {
  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const registrations =
    await prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id);

  const confirmed = registrations.filter((r) => r.status === "REGISTERED");
  if (confirmed.length === 0) return;

  const dateFnsLocale = getDateFnsLocale(locale);
  const momentDate = format(moment.startsAt, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = format(moment.startsAt, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = format(moment.startsAt, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    moment.videoLink,
    locale
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const icsContent = generateIcs({
    uid: moment.id,
    title: moment.title,
    description: moment.description,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    location: locationText,
    videoLink: moment.videoLink,
    url: `${baseUrl}/m/${moment.slug}`,
    organizerName: circle.name,
  });

  const updateStrings = {
    subject: t("momentUpdate.subject", { momentTitle: moment.title }),
    dateChangedLabel: t("momentUpdate.dateChangedLabel"),
    locationChangedLabel: t("momentUpdate.locationChangedLabel"),
    dateLabel: t("common.dateLabel"),
    locationLabel: t("common.locationLabel"),
    viewMomentCta: t("common.viewMomentCta"),
    footer: t("common.footer"),
  };

  await Promise.all(
    confirmed.map(async (registration) => {
      const user = registration.user;
      if (!user?.email) return;

      const playerName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

      return emailService.sendMomentUpdate({
        to: user.email,
        playerName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        momentDate,
        momentDateMonth,
        momentDateDay,
        locationText,
        circleName: circle.name,
        circleSlug: circle.slug,
        dateChanged,
        locationChanged,
        icsContent,
        strings: {
          ...updateStrings,
          heading: t("momentUpdate.heading"),
          intro: t("momentUpdate.intro"),
        },
      });
    })
  );

  // Notifier l'organisateur aussi
  const hosts = await prismaCircleRepository.findMembersByRole(circle.id, "HOST");
  await Promise.all(
    hosts.map(async (host) => {
      const user = host.user;
      if (!user?.email) return;

      const hostName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

      return emailService.sendMomentUpdate({
        to: user.email,
        playerName: hostName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        momentDate,
        momentDateMonth,
        momentDateDay,
        locationText,
        circleName: circle.name,
        circleSlug: circle.slug,
        dateChanged,
        locationChanged,
        icsContent,
        strings: {
          ...updateStrings,
          heading: t("hostMomentUpdate.heading"),
          intro: t("hostMomentUpdate.intro"),
        },
      });
    })
  );
}

export async function deleteMomentAction(
  momentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    // Fetch data before deletion — needed for email notifications
    const [momentToDelete, registrationsToNotify] = await Promise.all([
      prismaMomentRepository.findById(momentId),
      prismaRegistrationRepository.findActiveWithUserByMomentId(momentId),
    ]);

    await deleteMoment(
      { momentId, userId: session.user.id },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );

    // Fire-and-forget : notifier les participants de l'annulation
    if (momentToDelete && registrationsToNotify.length > 0) {
      sendMomentCancelledEmails(momentToDelete, registrationsToNotify).catch(
        (err) => Sentry.captureException(err)
      );
    }

    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
  }
}

async function sendMomentCancelledEmails(
  moment: Moment,
  registrations: RegistrationWithUser[]
): Promise<void> {
  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) return;

  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Email" });
  const dateFnsLocale = getDateFnsLocale(locale);

  const momentDate = format(moment.startsAt, "EEEE d MMMM yyyy, HH:mm", { locale: dateFnsLocale });
  const momentDateMonth = format(moment.startsAt, "MMM", { locale: dateFnsLocale }).toUpperCase();
  const momentDateDay = format(moment.startsAt, "d");
  const locationText = formatLocationText(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    moment.videoLink,
    locale
  );

  const strings = {
    subject: t("momentCancelled.subject", { momentTitle: moment.title }),
    heading: t("momentCancelled.heading"),
    message: t("momentCancelled.message", { momentTitle: moment.title }),
    ctaLabel: t("momentCancelled.ctaLabel"),
    footer: t("common.footer"),
  };

  // Notifier REGISTERED et WAITLISTED (tous les participants actifs)
  await Promise.all(
    registrations.map(async (registration) => {
      const user = registration.user;
      if (!user?.email) return;

      const recipientName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

      return emailService.sendMomentCancelled({
        to: user.email,
        recipientName,
        momentTitle: moment.title,
        momentDate,
        momentDateMonth,
        momentDateDay,
        locationText,
        circleName: circle.name,
        circleSlug: circle.slug,
        strings,
      });
    })
  );
}
