"use server";

import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import type { CoverImageAttribution } from "@/domain/models/circle";

export async function processCoverImage(formData: FormData): Promise<{
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
}> {
  const coverImageFile = formData.get("coverImageFile") as File | null;
  const coverImageUrl = formData.get("coverImageUrl") as string | null;
  const authorName = formData.get("coverImageAuthorName") as string | null;
  const authorUrl = formData.get("coverImageAuthorUrl") as string | null;
  const removeCover = formData.get("removeCover") as string | null;

  if (removeCover === "true") {
    return { coverImage: null, coverImageAttribution: null };
  }

  if (coverImageFile && coverImageFile.size > 0) {
    const buffer = Buffer.from(await coverImageFile.arrayBuffer());
    const url = await vercelBlobStorageService.upload(
      `covers/${Date.now()}.webp`,
      buffer,
      "image/webp"
    );
    return { coverImage: url, coverImageAttribution: null };
  }

  if (coverImageUrl) {
    const response = await fetch(coverImageUrl);
    if (!response.ok) {
      throw new Error("Impossible de récupérer l'image Unsplash");
    }
    const blob = await response.blob();
    const url = await vercelBlobStorageService.upload(
      `covers/${Date.now()}.webp`,
      blob,
      "image/webp"
    );
    const attribution: CoverImageAttribution | null =
      authorName && authorUrl ? { name: authorName, url: authorUrl } : null;
    return { coverImage: url, coverImageAttribution: attribution };
  }

  return {};
}
