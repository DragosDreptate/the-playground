"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import type { CoverImageAttribution } from "@/domain/models/circle";

// Domaines autorisés pour le fetch d'images de couverture (protection SSRF)
const ALLOWED_COVER_IMAGE_HOSTS = ["images.unsplash.com", "plus.unsplash.com"];

// Taille maximale d'une image de couverture uploadée directement
const MAX_COVER_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

/**
 * Valide qu'une URL pointe vers un domaine autorisé (protection contre SSRF).
 * Seuls les domaines Unsplash connus sont acceptés.
 */
function isAllowedCoverImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_COVER_IMAGE_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

export async function processCoverImage(formData: FormData): Promise<{
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
}> {
  // Cette Server Action manipule des ressources utilisateur — authentification obligatoire
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const coverImageFile = formData.get("coverImageFile") as File | null;
  const coverImageUrl = formData.get("coverImageUrl") as string | null;
  const authorName = formData.get("coverImageAuthorName") as string | null;
  const authorUrl = formData.get("coverImageAuthorUrl") as string | null;
  const removeCover = formData.get("removeCover") as string | null;

  if (removeCover === "true") {
    return { coverImage: null, coverImageAttribution: null };
  }

  if (coverImageFile && coverImageFile.size > 0) {
    // Validation de taille (protection contre upload de fichiers excessivement larges)
    if (coverImageFile.size > MAX_COVER_SIZE_BYTES) {
      throw new Error("File too large (max 10 MB)");
    }

    const buffer = Buffer.from(await coverImageFile.arrayBuffer());
    const url = await vercelBlobStorageService.upload(
      `covers/${Date.now()}.webp`,
      buffer,
      "image/webp"
    );
    return { coverImage: url, coverImageAttribution: null };
  }

  if (coverImageUrl) {
    // Protection SSRF : valider que l'URL pointe vers un domaine Unsplash autorisé
    if (!isAllowedCoverImageUrl(coverImageUrl)) {
      throw new Error("URL de couverture non autorisée");
    }

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
