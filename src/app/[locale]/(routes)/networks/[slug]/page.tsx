import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { Users, Globe, ChevronRight } from "lucide-react";
import { prismaCircleNetworkRepository } from "@/infrastructure/repositories";
import { getNetworkBySlug } from "@/domain/usecases/get-network-by-slug";
import { PublicCircleCard } from "@/components/explorer/public-circle-card";
import { CollapsibleDescription } from "@/components/moments/collapsible-description";
import { getMomentGradient } from "@/lib/gradient";
import { stripProtocol } from "@/lib/url";
import { isValidSlug } from "@/lib/slug";
import { Link } from "@/i18n/navigation";

export const revalidate = 300;

const deps = { circleNetworkRepository: prismaCircleNetworkRepository };

const getCachedNetwork = cache(async (slug: string) => {
  return getNetworkBySlug(slug, deps);
});

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return {};

  const network = await getCachedNetwork(slug);
  if (!network) return {};

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    title: network.name,
    description: network.description ?? undefined,
    openGraph: {
      title: network.name,
      description: network.description ?? undefined,
      ...(network.coverImage && {
        images: [{ url: network.coverImage }],
      }),
      url: `${appUrl}/networks/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: network.name,
      description: network.description ?? undefined,
      ...(network.coverImage && {
        images: [network.coverImage],
      }),
    },
  };
}

export default async function NetworkPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const network = await getCachedNetwork(slug);
  if (!network) notFound();

  const [t, tExplorer] = await Promise.all([
    getTranslations("Network"),
    getTranslations("Explorer"),
  ]);

  const gradient = getMomentGradient(network.name);
  const totalMoments = network.circles.reduce(
    (sum, c) => sum + c.upcomingMomentCount,
    0
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href="/explorer" className="hover:text-foreground transition-colors">
          {tExplorer("title")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate font-medium">{network.name}</span>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* ─── LEFT column : cover + stats ────────────── */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">

          {/* Cover */}
          <div className="relative">
            <div
              className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
              style={{ background: gradient }}
            />
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ aspectRatio: "1 / 1" }}
            >
              {network.coverImage ? (
                <Image
                  src={network.coverImage}
                  alt={network.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 340px"
                  priority
                />
              ) : (
                <>
                  <div className="size-full" style={{ background: gradient }} />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <Globe className="size-6 text-white" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div>
              <p className="text-2xl font-bold">{network.circles.length}</p>
              <p className="text-muted-foreground text-xs">{t("communities")}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-2xl font-bold">{totalMoments}</p>
              <p className="text-muted-foreground text-xs">{t("moments")}</p>
            </div>
          </div>
        </div>

        {/* ─── RIGHT column ─────────────────────────────────── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* Titre */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {network.name}
          </h1>

          {/* À propos */}
          {network.description && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t("about")}
              </p>
              <CollapsibleDescription text={network.description} />
            </div>
          )}

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Meta */}
          <div className="flex flex-col gap-3">
            {/* Site web */}
            {network.website && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Globe className="text-primary size-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("website")}
                  </p>
                  <a
                    href={network.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline underline-offset-2"
                  >
                    {stripProtocol(network.website)}
                  </a>
                </div>
              </div>
            )}

            {/* Communautés */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Users className="text-primary size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("communities")}
                </p>
                <p className="text-sm font-medium">
                  {t("communityCount", { count: network.circles.length })}
                </p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Communautés membres */}
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t("memberCommunities")}
          </p>

          {network.circles.length > 0 ? (
            <div className="flex flex-col gap-2 sm:gap-3">
              {network.circles.map((circle) => (
                <PublicCircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <p className="text-muted-foreground text-sm">
                {t("noCommunities")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
