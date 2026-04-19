import Image from "next/image";
import { Users } from "lucide-react";

import type { CoverImageAttribution } from "@/domain/models/circle";

type CoverBlockProps = {
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
  gradient: string;
  altText: string;
  fallbackIcon?: React.ReactNode;
  sizes?: string;
  priority?: boolean;
  children?: React.ReactNode;
};

export function CoverBlock({
  coverImage,
  coverImageAttribution,
  gradient,
  altText,
  fallbackIcon = <Users className="size-6 text-white" />,
  sizes = "(max-width: 1024px) 100vw, 340px",
  priority = true,
  children,
}: CoverBlockProps) {
  return (
    <>
      <div className="relative">
        <div
          className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
          style={{ background: gradient }}
        />
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: "1 / 1" }}
        >
          {coverImage ? (
            <Image
              src={coverImage}
              alt={altText}
              fill
              className="object-cover"
              sizes={sizes}
              priority={priority}
            />
          ) : (
            <>
              <div className="size-full" style={{ background: gradient }} />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  {fallbackIcon}
                </div>
              </div>
            </>
          )}
          {children}
        </div>
      </div>

      {coverImageAttribution && (
        <p className="text-muted-foreground px-1 text-xs">
          Photo par{" "}
          <a
            href={coverImageAttribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline"
          >
            {coverImageAttribution.name}
          </a>{" "}
          sur Unsplash
        </p>
      )}
    </>
  );
}
