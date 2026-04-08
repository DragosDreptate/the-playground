import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { Users, ExternalLink, Globe } from "lucide-react";
import { prismaCircleNetworkRepository } from "@/infrastructure/repositories";
import { getNetworkBySlug } from "@/domain/usecases/get-network-by-slug";
import { PublicCircleCard } from "@/components/explorer/public-circle-card";
import { getMomentGradient } from "@/lib/gradient";
import { stripProtocol } from "@/lib/url";
import { isValidSlug } from "@/lib/slug";

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

  const t = await getTranslations("Network");
  const gradient = getMomentGradient(network.name);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Cover + Infos */}
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Cover */}
        <div className="relative">
          <div
            className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
            style={{ background: gradient }}
          />
          <div
            className="relative size-32 overflow-hidden rounded-2xl sm:size-40"
            style={{ aspectRatio: "1 / 1" }}
          >
            {network.coverImage ? (
              <Image
                src={network.coverImage}
                alt={network.name}
                fill
                className="object-cover"
                sizes="160px"
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

        {/* Nom */}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {network.name}
        </h1>

        {/* Description */}
        {network.description && (
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            {network.description}
          </p>
        )}

        {/* Site web */}
        {network.website && (
          <a
            href={network.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ExternalLink className="size-3.5" />
            {stripProtocol(network.website)}
          </a>
        )}

        {/* Compteur */}
        <p className="text-muted-foreground text-sm">
          {t("communityCount", { count: network.circles.length })}
        </p>
      </div>

      {/* Grille des Communautés */}
      {network.circles.length > 0 ? (
        <div className="space-y-4">
          {network.circles.map((circle) => (
            <PublicCircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="text-muted-foreground size-5" />
          </div>
          <p className="text-muted-foreground text-sm">{t("noCommunities")}</p>
        </div>
      )}
    </div>
  );
}
