"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { AlignLeft, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { MomentFormRadar } from "./moment-form-radar";
import {
  MomentAttachmentsEditor,
  type MomentAttachmentsEditorHandle,
} from "./moment-attachments-editor";
import type { MomentAttachment } from "@/domain/models/moment-attachment";

type MomentFormProps = {
  moment?: Moment;
  circleSlug: string;
  circleName: string;
  circleDescription?: string;
  circleCoverImage?: string | null;
  stripeConnectActive?: boolean;
  priceLocked?: boolean;
  initialAttachments?: MomentAttachment[];
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

export function MomentForm({ moment, circleSlug, circleName, circleDescription, circleCoverImage, stripeConnectActive = false, priceLocked = false, initialAttachments = [], action }: MomentFormProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const isPast = moment?.status === "PAST";
  const router = useRouter();
  const attachmentsEditorRef = useRef<MomentAttachmentsEditorHandle>(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

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

  // --- Title / description / location state (needed for radar) ---
  const [titleValue, setTitleValue] = useState(moment?.title ?? "");
  const [descriptionValue, setDescriptionValue] = useState(moment?.description ?? "");
  const [locationNameValue, setLocationNameValue] = useState(moment?.locationName ?? "");
  const [locationAddressValue, setLocationAddressValue] = useState(moment?.locationAddress ?? "");

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
  const [priceOpen, setPriceOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);

  // --- Mutual exclusion: price vs approval ---
  const [currentPriceCents, setCurrentPriceCents] = useState(moment?.price ?? 0);
  const [approvalEnabled, setApprovalEnabled] = useState(moment?.requiresApproval ?? false);
  const hasPaidPrice = currentPriceCents > 0;
  const handlePriceCentsChange = useCallback((cents: number) => setCurrentPriceCents(cents), []);

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
      posthog.capture("moment_created", {
        moment_id: result.data.id,
        moment_slug: result.data.slug,
        circle_slug: circleSlug,
        is_edit: !!moment,
        location_type: result.data.locationType,
        has_capacity: result.data.capacity !== null,
        is_paid: result.data.price > 0,
      });

      // Flush staged attachments (create mode: files were staged client-side
      // because the moment didn't exist yet). We await this so the user lands
      // on the moment page with all attachments already persisted.
      // `isUploadingAttachments` flips the submit button label so the user
      // sees "Envoi des documents..." instead of a generic loading state
      // during the upload phase.
      if (!moment && attachmentsEditorRef.current?.hasStagedFiles()) {
        setIsUploadingAttachments(true);
        try {
          await attachmentsEditorRef.current.flushStaged(result.data.id);
        } finally {
          setIsUploadingAttachments(false);
        }
      }

      router.push(
        `/dashboard/circles/${circleSlug}/moments/${result.data.slug}`
      );
      return {};
    }

    const translatedError = result.code && t.has(`errors.${result.code}`)
      ? t(`errors.${result.code}`)
      : result.error;
    return { error: translatedError };
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.error]);

  const circleGradient = getMomentGradient(circleName);

  // --- Computed hidden values ---
  const startsAtValue = startDate ? combineDateAndTime(startDate, startTime) : "";
  const endsAtValue = endDate ? combineDateAndTime(endDate, endTime) : "";

  // Mirrors the check in MomentFormDateCard — blocks submit before server round-trip
  const isEndBeforeStart = !!(
    startsAtValue &&
    endsAtValue &&
    endsAtValue <= startsAtValue
  );

  return (
    <form action={formAction} className="mx-auto max-w-5xl">
      {/* Error banner */}
      {state.error && (
        <div ref={errorRef} className="bg-destructive/10 text-destructive mb-6 rounded-md p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left column — Cover + Circle info */}
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[340px] lg:sticky lg:top-6">
          <div className="flex flex-col gap-3">
            <CoverImagePicker
              circleName={circleName}
              contextQuery={titleValue || undefined}
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
              {circleCoverImage ? (
                <img
                  src={circleCoverImage}
                  alt={circleName}
                  className="mt-0.5 size-9 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="mt-0.5 size-9 shrink-0 rounded-lg"
                  style={{ background: circleGradient }}
                />
              )}
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
          {/* Status select (edit mode, PUBLISHED/CANCELLED only — DRAFT uses publish button) */}
          {moment && moment.status !== "DRAFT" && (
            <div className="flex justify-end">
              <Select
                name="status"
                defaultValue={moment.status === "PAST" ? undefined : moment.status}
                disabled={moment.status === "PAST"}
              >
                <SelectTrigger className="w-auto">
                  <SelectValue
                    placeholder={moment.status === "PAST" ? t("status.past") : undefined}
                  />
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
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
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
            disabled={isPast}
          />
          {isPast && (
            <p className="text-muted-foreground pl-12 text-xs">
              {t("form.pastDateReadOnly")}
            </p>
          )}

          {/* Location row */}
          <MomentFormLocationRow
            open={locationOpen}
            onOpenChange={setLocationOpen}
            locationType={locationType}
            onLocationTypeChange={setLocationType}
            defaultLocationName={moment?.locationName ?? ""}
            defaultLocationAddress={moment?.locationAddress ?? ""}
            defaultVideoLink={moment?.videoLink ?? ""}
            onLocationNameChange={setLocationNameValue}
            onLocationAddressChange={setLocationAddressValue}
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
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                required
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Separator */}
          <div className="border-border border-t" />

          {/* Radar de planification */}
          <MomentFormRadar
            title={titleValue}
            description={descriptionValue}
            locationName={locationNameValue}
            locationAddress={locationAddressValue}
            startsAt={startsAtValue}
          />

          {/* Separator */}
          <div className="border-border border-t" />

          {/* Options section (price + capacity) */}
          <MomentFormOptionsSection
            priceOpen={priceOpen}
            onPriceOpenChange={setPriceOpen}
            defaultPrice={moment?.price ?? 0}
            defaultCurrency={moment?.currency ?? "EUR"}
            stripeConnectActive={stripeConnectActive}
            priceLocked={priceLocked}
            defaultRefundable={moment?.refundable ?? true}
            capacityOpen={capacityOpen}
            onCapacityOpenChange={setCapacityOpen}
            defaultCapacity={moment?.capacity}
            approvalEnabled={approvalEnabled}
            onPriceCentsChange={handlePriceCentsChange}
          />

          {/* Attachments editor — works in both create and edit modes.
              Create mode: files are staged client-side and uploaded after the
              moment is created (see handleSubmit above). Edit mode: upload
              happens immediately via server action. */}
          <MomentAttachmentsEditor
            ref={attachmentsEditorRef}
            momentId={moment?.id ?? null}
            initialAttachments={initialAttachments}
          />

          {/* Validation des inscriptions */}
          <div className={cn("flex items-center gap-3", hasPaidPrice && "opacity-50")}>
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck className="text-primary size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="requiresApproval" className={cn("text-sm font-medium", !hasPaidPrice && "cursor-pointer")}>
                {t("form.requiresApproval")}
              </label>
              <p className="text-muted-foreground text-xs">
                {hasPaidPrice
                  ? t("form.approvalDisabledByPrice")
                  : t("form.requiresApprovalDescription")}
              </p>
            </div>
            {hasPaidPrice ? (
              <Lock className="text-muted-foreground size-4 shrink-0" />
            ) : (
              <Switch
                id="requiresApproval"
                name="requiresApproval"
                checked={approvalEnabled}
                onCheckedChange={setApprovalEnabled}
              />
            )}
          </div>

          {/* Submit / Cancel */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending || isEndBeforeStart || !startDate || !endDate} className="flex-1">
              {isUploadingAttachments
                ? t("form.uploadingAttachments")
                : isPending
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
