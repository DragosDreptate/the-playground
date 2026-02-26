"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Moment, LocationType } from "@/domain/models/moment";
import type { ActionResult } from "@/app/actions/types";
import { Link, useRouter } from "@/i18n/navigation";
import { combineDateAndTime, extractTime, snapToSlot } from "@/lib/time-options";
import { getMomentGradient } from "@/lib/gradient";
import { CoverImagePicker, type CoverSelection } from "@/components/circles/cover-image-picker";
import type { CoverImageAttribution } from "@/domain/models/moment";
import { MomentFormDateCard } from "./moment-form-date-card";
import { MomentFormLocationRow } from "./moment-form-location-row";
import { MomentFormOptionsSection } from "./moment-form-options-section";

type MomentFormProps = {
  moment?: Moment;
  circleSlug: string;
  circleName: string;
  circleDescription?: string;
  action: (formData: FormData) => Promise<ActionResult<Moment>>;
};

type FormState = {
  error?: string;
};

function getDefaultStartDate(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function getDefaultEndDate(start: Date): Date {
  const d = new Date(start);
  d.setHours(d.getHours() + 1);
  return d;
}

export function MomentForm({ moment, circleSlug, circleName, circleDescription, action }: MomentFormProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  // --- Date/time state ---
  const defaultStart = moment?.startsAt ?? getDefaultStartDate();
  const defaultEnd = moment?.endsAt ?? getDefaultEndDate(defaultStart);

  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [startTime, setStartTime] = useState(
    moment?.startsAt ? snapToSlot(extractTime(moment.startsAt)) : snapToSlot(extractTime(defaultStart))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEnd);
  const [endTime, setEndTime] = useState(
    moment?.endsAt ? snapToSlot(extractTime(moment.endsAt)) : snapToSlot(extractTime(defaultEnd))
  );

  // --- Cover state ---
  const [coverSelection, setCoverSelection] = useState<CoverSelection | null>(null);

  const previewImage =
    coverSelection?.type === "upload"
      ? coverSelection.previewUrl
      : coverSelection?.type === "unsplash"
        ? coverSelection.thumbUrl
        : coverSelection?.type === "remove"
          ? null
          : moment?.coverImage ?? null;

  const previewAttribution: CoverImageAttribution | null =
    coverSelection?.type === "unsplash"
      ? coverSelection.attribution
      : coverSelection?.type === "remove"
        ? null
        : moment?.coverImageAttribution ?? null;

  // --- Section state ---
  const [locationOpen, setLocationOpen] = useState(
    !!(moment?.locationName || moment?.locationAddress || moment?.videoLink)
  );
  const [locationType, setLocationType] = useState<LocationType>(
    moment?.locationType ?? "IN_PERSON"
  );
  const [priceOpen, setPriceOpen] = useState(!!(moment?.price && moment.price > 0));
  const [capacityOpen, setCapacityOpen] = useState(moment?.capacity != null);

  // --- Form submission ---
  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
    if (startsAtValue && endsAtValue && endsAtValue <= startsAtValue) {
      return { error: t("form.endBeforeStart") };
    }

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
      router.push(
        `/dashboard/circles/${circleSlug}/moments/${result.data.slug}`
      );
      return {};
    }

    return { error: result.error };
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});

  const circleGradient = getMomentGradient(circleName);

  // --- Computed hidden values ---
  const startsAtValue = startDate ? combineDateAndTime(startDate, startTime) : "";
  const endsAtValue = endDate ? combineDateAndTime(endDate, endTime) : "";

  return (
    <form action={formAction} className="mx-auto max-w-5xl">
      {/* Error banner */}
      {state.error && (
        <div className="bg-destructive/10 text-destructive mb-6 rounded-md p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left column — Cover + Circle info */}
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[340px] lg:sticky lg:top-6">
          <div className="flex flex-col gap-3">
            <CoverImagePicker
              circleName={circleName}
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

            {/* Circle — identique à la vue Escale */}
            <Link
              href={`/dashboard/circles/${circleSlug}`}
              className="group flex items-start gap-3 px-1"
            >
              <div
                className="mt-0.5 size-9 shrink-0 rounded-lg"
                style={{ background: circleGradient }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug group-hover:underline">
                  {circleName}
                </p>
                {circleDescription && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-3 text-xs leading-relaxed">
                    {circleDescription}
                  </p>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Right column — Form fields */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">
          {/* Status select (edit mode only) */}
          {moment && (
            <div className="flex justify-end">
              <Select name="status" defaultValue={moment.status}>
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">
                    {t("status.published")}
                  </SelectItem>
                  <SelectItem value="CANCELLED">
                    {t("status.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title — heading-style input */}
          <input
            name="title"
            placeholder={t("form.eventName")}
            defaultValue={moment?.title ?? ""}
            required
            maxLength={200}
            className="placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-3xl font-bold tracking-tight outline-none lg:text-4xl"
          />

          {/* Hidden inputs for date/time */}
          <input type="hidden" name="startsAt" value={startsAtValue} />
          <input type="hidden" name="endsAt" value={endsAtValue} />

          {/* Date/time card */}
          <MomentFormDateCard
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            onStartDateChange={setStartDate}
            onStartTimeChange={setStartTime}
            onEndDateChange={setEndDate}
            onEndTimeChange={setEndTime}
          />

          {/* Location row */}
          <MomentFormLocationRow
            open={locationOpen}
            onOpenChange={setLocationOpen}
            locationType={locationType}
            onLocationTypeChange={setLocationType}
            defaultLocationName={moment?.locationName ?? ""}
            defaultLocationAddress={moment?.locationAddress ?? ""}
            defaultVideoLink={moment?.videoLink ?? ""}
          />

          {/* Separator */}
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
                  {t("form.addDescription")}
                </p>
              </div>
              <Textarea
                id="description"
                name="description"
                placeholder={t("form.descriptionPlaceholder")}
                defaultValue={moment?.description ?? ""}
                required
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Separator */}
          <div className="border-border border-t" />

          {/* Options section (price + capacity) */}
          <MomentFormOptionsSection
            priceOpen={priceOpen}
            onPriceOpenChange={setPriceOpen}
            defaultPrice={moment?.price ?? 0}
            defaultCurrency={moment?.currency ?? "EUR"}
            capacityOpen={capacityOpen}
            onCapacityOpenChange={setCapacityOpen}
            defaultCapacity={moment?.capacity}
          />

          {/* Submit / Cancel */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending
                ? tCommon("loading")
                : moment
                  ? tCommon("save")
                  : t("form.createMoment")}
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
