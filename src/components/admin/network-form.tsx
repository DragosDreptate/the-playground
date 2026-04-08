"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CoverImagePicker, type CoverSelection } from "@/components/circles/cover-image-picker";
import {
  adminCreateNetworkAction,
  adminUpdateNetworkAction,
} from "@/app/actions/admin";
import { processCoverImage } from "@/app/actions/cover-image";
import { generateSlug } from "@/lib/slug";

type NetworkFormProps =
  | {
      mode: "create";
      networkId?: undefined;
      defaultValues?: undefined;
    }
  | {
      mode: "edit";
      networkId: string;
      defaultValues: {
        name: string;
        slug: string;
        description: string;
        website: string;
        coverImage: string;
      };
    };

export function NetworkForm({ mode, networkId, defaultValues }: NetworkFormProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [website, setWebsite] = useState(defaultValues?.website ?? "");
  const [coverImage, setCoverImage] = useState(defaultValues?.coverImage ?? "");
  const [coverSelection, setCoverSelection] = useState<CoverSelection | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === "edit");

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  function handleCoverSelect(selection: CoverSelection) {
    setCoverSelection(selection);
    if (selection.type === "remove") {
      setCoverImage("");
    } else if (selection.type === "unsplash") {
      setCoverImage(selection.thumbUrl);
    } else if (selection.type === "upload") {
      setCoverImage(selection.previewUrl);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      let finalCoverImage = mode === "edit" ? defaultValues.coverImage : "";

      // Process cover image if changed
      if (coverSelection) {
        const formData = new FormData();
        if (coverSelection.type === "remove") {
          formData.set("removeCover", "true");
        } else if (coverSelection.type === "upload") {
          formData.set("coverImageFile", coverSelection.file);
        } else if (coverSelection.type === "unsplash") {
          formData.set("coverImageUrl", coverSelection.url);
          formData.set("coverImageAuthorName", coverSelection.attribution.name);
          formData.set("coverImageAuthorUrl", coverSelection.attribution.url);
        }
        const processed = await processCoverImage(formData);
        if (processed.coverImage !== undefined) {
          finalCoverImage = processed.coverImage ?? "";
        }
      }

      const input = {
        name,
        slug,
        description: description || undefined,
        coverImage: finalCoverImage || undefined,
        website: website || undefined,
      };

      if (mode === "create") {
        const result = await adminCreateNetworkAction(input);
        if (result.success) {
          router.push(`/admin/networks/${result.data.id}`);
        }
      } else {
        await adminUpdateNetworkAction(networkId, input);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="network-name">{t("networkName")}</Label>
        <Input
          id="network-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="network-slug">{t("networkSlug")}</Label>
        <Input
          id="network-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManuallyEdited(true);
          }}
          className="font-mono text-sm"
          required
        />
        {mode === "edit" && slug !== defaultValues.slug && (
          <p className="text-xs text-amber-600">
            ⚠ Changer le slug cassera les liens existants.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="network-description">{t("networkDescription")}</Label>
        <Textarea
          id="network-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("networkCoverImage")}</Label>
        <CoverImagePicker
          circleName={name}
          currentImage={coverImage || null}
          onSelect={handleCoverSelect}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="network-website">{t("networkWebsite")}</Label>
        <Input
          id="network-website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || !name.trim() || !slug.trim()}
      >
        {isPending
          ? mode === "create"
            ? t("creating")
            : t("saving")
          : mode === "create"
            ? t("createNetwork")
            : t("saveNetwork")}
      </Button>
    </div>
  );
}
