"use server";

import * as Sentry from "@sentry/nextjs";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";

const PLATFORM_TIMEZONE = "Europe/Paris";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
  prismaMomentAttachmentRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createResendEmailService, createStripePaymentService } from "@/infrastructure/services";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import { createMoment } from "@/domain/usecases/create-moment";
import { updateMoment } from "@/domain/usecases/update-moment";
import { deleteMoment } from "@/domain/usecases/delete-moment";
import { publishMoment } from "@/domain/usecases/publish-moment";
import type { LocationType, Moment } from "@/domain/models/moment";
import type { RegistrationWithUser } from "@/domain/models/registration";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";
import { partitionMomentUpdateRecipients } from "./helpers/moment-update-recipients";
import { processCoverImage } from "./cover-image";
import { revalidatePath } from "next/cache";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { notifyNewMoment } from "./notify-new-moment";
import { notifyAdminEntityCreated } from "./notify-admin-entity-created";
import { isAdminUser, resolveCircleRepository } from "@/lib/admin-host-mode";
import { getDisplayName } from "@/lib/display-name";

const emailService = createResendEmailService();
const paymentService = createStripePaymentService();

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
  const requiresApproval = formData.get("requiresApproval") === "on";

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
  // Refundable only meaningful for paid events; default to true for free events
  const refundable = price > 0 ? formData.get("refundable") === "on" : true;

  // Intent = "draft" (default) or "publish" — coming from the form's submit
  // button `name="intent" value="..."`. When "publish", we chain a publishMoment
  // call after createMoment to publish the event in a single user action.
  const intent = formData.get("intent") as string | null;
  const shouldPublishImmediately = intent === "publish";

  const userId = session.user.id;
  return toActionResult(async () => {
    const coverData = await processCoverImage(formData);
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

    const result = await createMoment(
      {
        circleId,
        userId,
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
        refundable,
        requiresApproval,
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: circleRepo,
        registrationRepository: prismaRegistrationRepository,
      }
    );

    // Fire-and-forget : notifier les admins de la nouvelle création (brouillon)
    prismaCircleRepository.findById(circleId).then(async (circle) => {
      if (!circle) return;

      const creator = await prismaUserRepository.findById(userId);
      notifyAdminEntityCreated({
        entityType: "moment",
        entityName: result.moment.title,
        entitySlug: result.moment.slug,
        creatorId: userId,
        creatorName: creator?.name ?? creator?.email ?? session.user.email ?? "",
        creatorEmail: creator?.email ?? session.user.email ?? "",
        circleName: circle.name,
        circleSlug: circle.slug,
      }).catch(console.error);
    }).catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });

    if (!shouldPublishImmediately) {
      invalidateDashboardCache(userId);
      return result.moment;
    }

    // Publish-on-create path : chain publishMoment after a successful createMoment.
    // If the publish step fails, we fall back to returning the freshly-created
    // DRAFT (logged to Sentry) so the user doesn't lose their work — they'll be
    // redirected to the draft page where they can retry publication manually
    // via the existing PublishMomentButton.
    try {
      const publishResult = await publishMoment(
        { momentId: result.moment.id, userId },
        { momentRepository: prismaMomentRepository, circleRepository: circleRepo }
      );

      sendMomentPublishedNotifications(publishResult.moment, userId);

      revalidatePath(`/dashboard/circles/${publishResult.moment.circleId}`);
      revalidatePath(`/m/${publishResult.moment.slug}`);
      revalidatePath(`/en/m/${publishResult.moment.slug}`);

      invalidateDashboardCache(userId);
      return publishResult.moment;
    } catch (publishError) {
      Sentry.captureException(publishError, {
        tags: { context: "publish_after_create" },
        extra: { momentId: result.moment.id, circleId: result.moment.circleId },
      });
      // Fall back to the draft — the user still got their moment created.
      invalidateDashboardCache(userId);
      return result.moment;
    }
  });
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
  const requiresApprovalUpdate = formData.get("requiresApproval") === "on";

  if (title !== null && !title.trim()) {
    return { success: false, error: "Title cannot be empty", code: "VALIDATION" };
  }

  const capacity = capacityRaw ? parseInt(capacityRaw, 10) || null : undefined;
  const price = priceRaw !== null ? parseInt(priceRaw, 10) || 0 : undefined;
  // Refundable only meaningful for paid events; default to true when price becomes 0
  const refundable = price !== undefined
    ? (price > 0 ? formData.get("refundable") === "on" : true)
    : undefined;

  const userId = session.user.id;
  return toActionResult(async () => {
    // Récupère l'ancienne cover pour cleanup si besoin
    const existingMoment = await prismaMomentRepository.findById(momentId);
    const oldCoverImage = existingMoment?.coverImage ?? null;

    const coverData = await processCoverImage(formData);
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

    // Événement passé : ignorer les dates soumises — elles sont non modifiables
    const isPastMoment = existingMoment?.status === "PAST";

    const result = await updateMoment(
      {
        momentId,
        userId,
        ...(title && { title: title.trim() }),
        ...(description !== null && { description: description.trim() }),
        ...coverData,
        ...(!isPastMoment && startsAtRaw && { startsAt: new Date(startsAtRaw) }),
        ...(!isPastMoment && endsAtRaw !== undefined && { endsAt: endsAtRaw ? new Date(endsAtRaw) : null }),
        ...(locationType && { locationType }),
        ...(locationName !== undefined && { locationName: locationName || null }),
        ...(locationAddress !== undefined && { locationAddress: locationAddress || null }),
        ...(videoLink !== undefined && { videoLink: videoLink || null }),
        ...(capacity !== undefined && { capacity }),
        ...(price !== undefined && { price }),
        ...(currency && { currency }),
        ...(status && { status: status as Moment["status"] }),
        ...(refundable !== undefined && { refundable }),
        requiresApproval: requiresApprovalUpdate,
      },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: circleRepo,
        registrationRepository: prismaRegistrationRepository,
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

      if ((dateChanged || locationChanged) && !isAdminUser(session)) {
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

    // Invalide uniquement la page de cet événement (les deux locales)
    revalidatePath(`/m/${result.moment.slug}`);
    revalidatePath(`/en/m/${result.moment.slug}`);

    invalidateDashboardCache(session.user.id);
    return result.moment;
  });
}

type TranslationFunction = Awaited<ReturnType<typeof getTranslations<"Email">>>;

async function sendMomentUpdateEmails(
  moment: Moment,
  dateChanged: boolean,
  locationChanged: boolean,
  t: TranslationFunction,
  locale: string
): Promise<void> {
  const [circle, registrations, hosts] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
  ]);
  if (!circle) return;

  const confirmed = registrations.filter((r) => r.status === "REGISTERED");
  if (confirmed.length === 0) return;

  const { participants: participantRecipients, hosts: hostRecipients } =
    partitionMomentUpdateRecipients(confirmed, hosts);

  const dateFnsLocale = getDateFnsLocale(locale);
  const momentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", {
    locale: dateFnsLocale,
  });
  const momentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", {
    locale: dateFnsLocale,
  });
  const momentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
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
    method: "REQUEST",
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

  const commonFields = {
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
  };

  // Notifier les participants (les HOSTs inscrits sont exclus, ils reçoivent la version Organisateur)
  if (participantRecipients.length > 0) {
    await emailService.sendMomentUpdateBatch({
      ...commonFields,
      recipients: participantRecipients,
      strings: { ...updateStrings, heading: t("momentUpdate.heading"), intro: t("momentUpdate.intro") },
    });
  }

  // Notifier les Organisateurs
  if (hostRecipients.length > 0) {
    await emailService.sendMomentUpdateBatch({
      ...commonFields,
      recipients: hostRecipients,
      strings: { ...updateStrings, heading: t("hostMomentUpdate.heading"), intro: t("hostMomentUpdate.intro") },
    });
  }
}

export async function deleteMomentAction(
  momentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  return toActionResult(async () => {
    // Fetch data before deletion — needed for email notifications + blob cleanup
    const [momentToDelete, registrationsToNotify, circleRepo, attachmentsToCleanup] = await Promise.all([
      prismaMomentRepository.findById(momentId),
      prismaRegistrationRepository.findActiveWithUserByMomentId(momentId),
      resolveCircleRepository(session, prismaCircleRepository),
      prismaMomentAttachmentRepository.findByMoment(momentId),
    ]);

    await deleteMoment(
      { momentId, userId },
      {
        momentRepository: prismaMomentRepository,
        circleRepository: circleRepo,
        registrationRepository: prismaRegistrationRepository,
        paymentService,
      }
    );

    // Blob cleanup is external to the DB cascade and must run explicitly.
    // Fire-and-forget: errors captured in Sentry but don't block the response.
    if (momentToDelete) {
      const blobsToDelete = [
        ...(momentToDelete.coverImage ? [momentToDelete.coverImage] : []),
        ...attachmentsToCleanup.map((a) => a.url),
      ];
      Promise.all(
        blobsToDelete.map((url) => vercelBlobStorageService.delete(url))
      ).catch((err) => Sentry.captureException(err));
    }

    // Skip notifications only when admin moderates someone else's event.
    const isHostOfEvent = momentToDelete
      ? (await prismaCircleRepository.findMembership(momentToDelete.circleId, userId))?.role === "HOST"
      : false;
    const shouldNotify = momentToDelete && registrationsToNotify.length > 0 && (!isAdminUser(session) || isHostOfEvent);
    if (shouldNotify) {
      sendMomentCancelledEmails(momentToDelete, registrationsToNotify).catch(
        (err) => Sentry.captureException(err)
      );
    }

    if (momentToDelete) {
      revalidatePath(`/m/${momentToDelete.slug}`);
      revalidatePath(`/en/m/${momentToDelete.slug}`);
    }

    invalidateDashboardCache(userId);
  });
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

  const momentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", { locale: dateFnsLocale });
  const momentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", { locale: dateFnsLocale }).toUpperCase();
  const momentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
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

  // Notifier REGISTERED et WAITLISTED (tous les participants actifs) en batch
  const recipients = registrations
    .filter((r) => r.user?.email)
    .map((r) => ({
      to: r.user!.email!,
      recipientName: getDisplayName(r.user!.firstName, r.user!.lastName, r.user!.email!),
    }));

  if (recipients.length > 0) {
    await emailService.sendMomentCancelledBatch({
      recipients,
      momentTitle: moment.title,
      momentDate,
      momentDateMonth,
      momentDateDay,
      locationText,
      circleName: circle.name,
      circleSlug: circle.slug,
      strings,
    });
  }
}

export async function publishMomentAction(
  momentId: string
): Promise<ActionResult<Moment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const userId = session.user.id;
  return toActionResult(async () => {
    const circleRepo = await resolveCircleRepository(session, prismaCircleRepository);

    const result = await publishMoment(
      { momentId, userId },
      { momentRepository: prismaMomentRepository, circleRepository: circleRepo }
    );

    sendMomentPublishedNotifications(result.moment, userId);

    revalidatePath(`/dashboard/circles/${result.moment.circleId}`);
    revalidatePath(`/m/${result.moment.slug}`);
    revalidatePath(`/en/m/${result.moment.slug}`);

    invalidateDashboardCache(userId);
    return result.moment;
  });
}

/**
 * Fire-and-forget post-publication notifications : notify community members
 * of the new published event and send a confirmation email to the host with
 * an ICS attachment. Never throws — all errors are logged to Sentry so that
 * a failed notification doesn't fail the upstream action.
 *
 * Shared between `publishMomentAction` (manual DRAFT → PUBLISHED transition)
 * and `createMomentAction` with `intent=publish` (create + publish in one
 * operation).
 */
function sendMomentPublishedNotifications(moment: Moment, userId: string): void {
  prismaCircleRepository
    .findById(moment.circleId)
    .then(async (circle) => {
      if (!circle) return;

      notifyNewMoment(moment, userId, circle.name, circle.slug).catch((err) => {
        console.error("[notifyNewMoment] Erreur:", err);
        Sentry.captureException(err);
      });

      const [host, locale] = await Promise.all([
        prismaUserRepository.findById(userId),
        getLocale(),
      ]);
      if (!host?.email) return;

      const dateFnsLocale = getDateFnsLocale(locale);
      const momentDate = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy, HH:mm", { locale: dateFnsLocale });
      const momentDateMonth = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", { locale: dateFnsLocale }).toUpperCase();
      const momentDateDay = formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
      const locationText = formatLocationText(
        moment.locationType,
        moment.locationName,
        moment.locationAddress,
        moment.videoLink,
        locale
      );
      const hostName = [host.firstName, host.lastName].filter(Boolean).join(" ") || host.email;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const icsContent = generateIcs({
        uid: moment.id,
        title: moment.title,
        description: moment.description,
        startsAt: moment.startsAt,
        endsAt: moment.endsAt,
        location: locationText,
        videoLink: moment.videoLink,
        url: `${appUrl}/m/${moment.slug}`,
        organizerName: circle.name,
        method: "REQUEST",
        attendeeEmail: host.email,
      });

      const t = await getTranslations({ locale, namespace: "Email" });
      await emailService.sendHostMomentCreated({
        to: host.email,
        hostName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        circleSlug: circle.slug,
        momentDate,
        momentDateMonth,
        momentDateDay,
        locationText,
        circleName: circle.name,
        icsContent,
        strings: {
          subject: t("hostMomentCreated.subject", { momentTitle: moment.title }),
          heading: t("hostMomentCreated.heading"),
          statusMessage: t("hostMomentCreated.statusMessage", { momentTitle: moment.title }),
          dateLabel: t("common.dateLabel"),
          locationLabel: t("common.locationLabel"),
          manageMomentCta: t("hostMomentCreated.manageMomentCta"),
          footer: t("common.footer"),
        },
      });
    })
    .catch((err) => {
      console.error(err);
      Sentry.captureException(err);
    });
}
