"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { uploadAvatarAction } from "@/app/actions/profile";
import { resizeImage } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

type AvatarUploadProps = {
  name: string | null;
  email: string;
  /** URL de l'avatar actuel (OAuth ou uploadé). Null = initiales uniquement. */
  image: string | null;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function AvatarUpload({ name, email, image }: AvatarUploadProps) {
  const t = useTranslations("Profile.avatar");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // L'image à afficher : preview optimiste en priorité, puis image persistée
  const displayImage = preview ?? image;

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset du champ pour permettre de re-sélectionner le même fichier
    e.target.value = "";
    setError(null);

    // Validation côté client
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t("errorType"));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(t("errorSize"));
      return;
    }

    // Resize dans le navigateur (zéro friction, photo 10 Mo → ~50 Ko)
    let resized: Blob;
    try {
      resized = await resizeImage(file);
    } catch {
      setError(t("errorUpload"));
      return;
    }

    // Preview optimiste immédiate
    const previewUrl = URL.createObjectURL(resized);
    setPreview(previewUrl);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("avatar", resized, "avatar.webp");

      const result = await uploadAvatarAction(formData);

      if (!result.success) {
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
        setError(t("errorUpload"));
        return;
      }

      // Refresh pour récupérer l'URL persistée depuis la DB
      router.refresh();
      // On libère la preview blob URL après le refresh (délai pour éviter le flash)
      setTimeout(() => {
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
      }, 500);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar cliquable avec overlay hover */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="group relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-default"
        aria-label={displayImage ? t("change") : t("add")}
      >
        <UserAvatar name={name} email={email} image={displayImage} size="xl" />

        {/* Overlay hover / upload */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full transition-opacity",
            "bg-black/40",
            isPending
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          {isPending ? (
            <Loader2 className="size-6 text-white animate-spin" />
          ) : (
            <Camera className="size-6 text-white" />
          )}
        </span>
      </button>

      {/* Lien texte — visible uniquement si pas encore de photo (meilleure découvrabilité mobile) */}
      {!displayImage && !isPending && (
        <button
          type="button"
          onClick={handleClick}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          {t("add")}
        </button>
      )}

      {/* Texte "Envoi en cours" visible pendant l'upload */}
      {isPending && (
        <p className="text-muted-foreground text-xs">{t("uploading")}</p>
      )}

      {/* Message d'erreur */}
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}

      {/* Input file caché */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </div>
  );
}
