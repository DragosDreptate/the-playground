import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { MomentNotFoundError } from "@/domain/errors";
import { isValidSlug } from "@/lib/slug";
import { captureServerEvent } from "@/lib/posthog-server";
import { EmbedEventCard } from "@/components/embed/embed-event-card";
import { EmbedHeightReporter } from "@/components/embed/embed-height-reporter";
import type { EmbedLocale, EmbedTheme } from "@/components/embed/types";

export const revalidate = 300;

function parseLocale(raw: string | undefined): EmbedLocale {
  return raw === "en" ? "en" : "fr";
}

function parseTheme(raw: string | undefined): EmbedTheme {
  return raw === "dark" ? "dark" : "light";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string; theme?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const locale = parseLocale(sp.locale);

  if (!isValidSlug(slug)) return { robots: { index: false, follow: false } };

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "EmbedWidget" });
  return {
    title: t("titleAlt", { title: moment.title }),
    robots: { index: false, follow: false },
  };
}

export default async function EmbedMomentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string; theme?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  if (!isValidSlug(slug)) notFound();

  const locale = parseLocale(sp.locale);
  const theme = parseTheme(sp.theme);

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) notFound();
    throw error;
  }

  if (moment.status === "DRAFT") notFound();

  const [circle, registered] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaRegistrationRepository.findRegisteredPreviewAndCount(moment.id, 4),
  ]);

  if (!circle) notFound();

  // distinctId stable pour compter les vues, pas créer un user PostHog par event.
  // `after()` détache l'envoi du request lifecycle (sinon Vercel tronque).
  after(() =>
    captureServerEvent("embed_widget", "embed_widget_view", {
      momentId: moment.id,
      momentSlug: moment.slug,
      circleSlug: circle.slug,
      locale,
      theme,
      status: moment.status,
    })
  );

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <EmbedEventCard
        moment={moment}
        circle={circle}
        registeredCount={registered.total}
        registeredPreview={registered.preview}
        locale={locale}
        theme={theme}
      />
      <EmbedHeightReporter />
    </div>
  );
}
