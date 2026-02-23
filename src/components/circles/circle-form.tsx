"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { AlignLeft, MapPin, Globe, Lock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [circleName, setCircleName] = useState(circle?.name ?? "");

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
    <form action={formAction} className="mx-auto max-w-5xl">
      {state.error && (
        <div className="bg-destructive/10 text-destructive mb-6 rounded-md p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">

        {/* ── Colonne gauche : cover (sticky) ── */}
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[340px] lg:sticky lg:top-6">
          <div className="flex flex-col gap-3">
            <CoverImagePicker
              circleName={circleName || undefined}
              category={selectedCategory || undefined}
              currentImage={previewImage}
              currentAttribution={previewAttribution}
              onSelect={setCoverSelection}
            />
            {previewAttribution && (
              <p className="text-muted-foreground px-1 text-xs">
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
        </div>

        {/* ── Colonne droite : champs ── */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">

          {/* Nom — heading-style */}
          <input
            name="name"
            placeholder={t("form.namePlaceholder")}
            defaultValue={circle?.name ?? ""}
            required
            maxLength={100}
            onChange={(e) => setCircleName(e.target.value)}
            className="placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-3xl font-bold tracking-tight outline-none lg:text-4xl"
          />

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Thématique */}
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Tag className="text-primary size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-medium">{t("form.category")}</p>
              <Select
                name="category"
                defaultValue={circle?.category ?? ""}
                onValueChange={(value) => setSelectedCategory(value as CircleCategory | "")}
              >
                <SelectTrigger>
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
          </div>

          {/* Ville */}
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <MapPin className="text-primary size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-medium">{t("form.city")}</p>
              <Input
                name="city"
                placeholder={t("form.cityPlaceholder")}
                defaultValue={circle?.city ?? ""}
                maxLength={100}
              />
            </div>
          </div>

          {/* Visibilité */}
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              {(circle?.visibility ?? "PUBLIC") === "PUBLIC" ? (
                <Globe className="text-primary size-4" />
              ) : (
                <Lock className="text-primary size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-medium">{t("form.visibility")}</p>
              <Select
                name="visibility"
                defaultValue={circle?.visibility ?? "PUBLIC"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">{t("form.visibilityPublic")}</SelectItem>
                  <SelectItem value="PRIVATE">{t("form.visibilityPrivate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Description */}
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <AlignLeft className="text-primary size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-sm font-medium">{t("form.description")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("form.descriptionPlaceholder")}
                </p>
              </div>
              <Textarea
                name="description"
                placeholder={t("form.descriptionPlaceholder")}
                defaultValue={circle?.description ?? ""}
                required
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
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
        </div>
      </div>
    </form>
  );
}
