"use client";

import { useActionState, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Circle, CircleVisibility, CircleCategory, CoverImageAttribution } from "@/domain/models/circle";
import type { ActionResult } from "@/app/actions/types";
import { useRouter } from "@/i18n/navigation";
import { CoverImagePicker, type CoverSelection } from "@/components/circles/cover-image-picker";

type CircleFormProps = {
  circle?: Circle;
  action: (formData: FormData) => Promise<ActionResult<Circle>>;
};

type FormState = {
  error?: string;
};

const CIRCLE_CATEGORIES: CircleCategory[] = [
  "TECH",
  "DESIGN",
  "BUSINESS",
  "SPORT_WELLNESS",
  "ART_CULTURE",
  "SCIENCE_EDUCATION",
  "SOCIAL",
  "OTHER",
];

export function CircleForm({ circle, action }: CircleFormProps) {
  const t = useTranslations("Circle");
  const tCategory = useTranslations("CircleCategory");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [coverSelection, setCoverSelection] = useState<CoverSelection | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CircleCategory | "">(
    circle?.category ?? ""
  );

  // Ref pour avoir accès à la valeur du nom en temps réel (pour le picker)
  const nameRef = useRef<HTMLInputElement>(null);
  const [circleName, setCircleName] = useState(circle?.name ?? "");

  // Image affichée : sélection en cours ou image existante
  const previewImage =
    coverSelection?.type === "upload"
      ? coverSelection.previewUrl
      : coverSelection?.type === "unsplash"
        ? coverSelection.thumbUrl
        : coverSelection?.type === "remove"
          ? null
          : circle?.coverImage ?? null;

  const previewAttribution: CoverImageAttribution | null =
    coverSelection?.type === "unsplash"
      ? coverSelection.attribution
      : coverSelection?.type === "remove"
        ? null
        : circle?.coverImageAttribution ?? null;

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
    // Injecter les données cover dans le FormData
    if (coverSelection?.type === "upload") {
      formData.set("coverImageFile", coverSelection.file);
    } else if (coverSelection?.type === "unsplash") {
      formData.set("coverImageUrl", coverSelection.url);
      formData.set("coverImageAuthorName", coverSelection.attribution.name);
      formData.set("coverImageAuthorUrl", coverSelection.attribution.url);
    } else if (coverSelection?.type === "remove") {
      formData.set("removeCover", "true");
    }

    const result = await action(formData);

    if (result.success) {
      router.push(`/dashboard/circles/${result.data.slug}`);
      return {};
    }

    return { error: result.error };
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {state.error}
        </div>
      )}

      {/* Image de couverture — en premier */}
      <div className="space-y-2">
        <Label>{t("form.coverImage")}</Label>
        <CoverImagePicker
          circleName={circleName || undefined}
          category={selectedCategory || undefined}
          currentImage={previewImage}
          currentAttribution={previewAttribution}
          onSelect={setCoverSelection}
        />
        {previewAttribution && (
          <p className="text-muted-foreground text-xs">
            Photo par{" "}
            <a
              href={previewAttribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline"
            >
              {previewAttribution.name}
            </a>{" "}
            sur Unsplash
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("form.name")}</Label>
        <Input
          id="name"
          name="name"
          ref={nameRef}
          placeholder={t("form.namePlaceholder")}
          defaultValue={circle?.name ?? ""}
          required
          maxLength={100}
          onChange={(e) => setCircleName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("form.description")}</Label>
        <Textarea
          id="description"
          name="description"
          placeholder={t("form.descriptionPlaceholder")}
          defaultValue={circle?.description ?? ""}
          required
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">{t("form.category")}</Label>
        <Select
          name="category"
          defaultValue={circle?.category ?? ""}
          onValueChange={(value) => setSelectedCategory(value as CircleCategory | "")}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder={t("form.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {CIRCLE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {tCategory(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">{t("form.city")}</Label>
        <Input
          id="city"
          name="city"
          placeholder={t("form.cityPlaceholder")}
          defaultValue={circle?.city ?? ""}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility">{t("form.visibility")}</Label>
        <Select
          name="visibility"
          defaultValue={circle?.visibility ?? "PUBLIC"}
        >
          <SelectTrigger id="visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">{t("form.visibilityPublic")}</SelectItem>
            <SelectItem value="PRIVATE">
              {t("form.visibilityPrivate")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? tCommon("loading")
            : circle
              ? tCommon("save")
              : tCommon("create")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}
