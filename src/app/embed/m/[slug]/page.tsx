import { notFound } from "next/navigation";
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

export const revalidate = 300;

type SupportedLocale = "fr" | "en";
type Theme = "light" | "dark";

function parseLocale(raw: string | undefined): SupportedLocale {
  return raw === "en" ? "en" : "fr";
}

function parseTheme(raw: string | undefined): Theme {
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

  const [circle, attendees] = await Promise.all([
    prismaCircleRepository.findById(moment.circleId),
    prismaRegistrationRepository.findActiveWithUserByMomentId(moment.id),
  ]);

  if (!circle) notFound();

  const registered = attendees.filter((r) => r.status === "REGISTERED");

  // Vue widget (server-side, sans cookie ni tracking visiteur).
  // Émis seulement sur cache miss (revalidate=300), donc volumétrie modérée.
  void captureServerEvent(moment.id, "embed_widget_view", {
    momentSlug: moment.slug,
    circleSlug: circle.slug,
    locale,
    theme,
    status: moment.status,
  });

  // No wrapper: the card renders at its natural height (~250px) and the
  // iframe is sized to match in the snippet. The `dark` class is applied
  // only as a context for the card's internal dark: variants.
  return (
    <div className={theme === "dark" ? "dark" : undefined}>
      <EmbedEventCard
        moment={moment}
        circle={circle}
        registeredCount={registered.length}
        registeredPreview={registered}
        locale={locale}
        theme={theme}
      />
    </div>
  );
}
