"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { AlignLeft, MapPin, Globe, Lock, Tag, ShieldCheck, CreditCard, ExternalLink, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Circle, CircleVisibility, CircleCategory, CoverImageAttribution } from "@/domain/models/circle";
import type { ConnectAccountStatus } from "@/domain/ports/services/payment-service";
import type { ActionResult } from "@/app/actions/types";
import { useRouter } from "@/i18n/navigation";
import { CoverImagePicker, type CoverSelection } from "@/components/circles/cover-image-picker";
import { onboardStripeConnectAction, getStripeLoginLinkAction, cancelStripeConnectAction } from "@/app/actions/stripe";

type StripeConnectProps = {
  circleId: string;
  circleSlug: string;
  hasAccount: boolean;
  status: ConnectAccountStatus | null;
};

type CircleFormProps = {
  circle?: Circle;
  action: (formData: FormData) => Promise<ActionResult<Circle>>;
  stripeConnect?: StripeConnectProps;
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

export function CircleForm({ circle, action, stripeConnect }: CircleFormProps) {
  const t = useTranslations("Circle");
  const tCategory = useTranslations("CircleCategory");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [coverSelection, setCoverSelection] = useState<CoverSelection | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CircleCategory | "">(
    circle?.category ?? ""
  );
  const [circleName, setCircleName] = useState(circle?.name ?? "");
  const [descriptionValue, setDescriptionValue] = useState(circle?.description ?? "");
  const [cityValue, setCityValue] = useState(circle?.city ?? "");
  const [websiteValue, setWebsiteValue] = useState(circle?.website ?? "");
  const [customCategoryValue, setCustomCategoryValue] = useState(circle?.customCategory ?? "");
  const [localError, setLocalError] = useState<string | undefined>();

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
    // Validation client : customCategory obligatoire quand la catégorie est "Autre"
    if (selectedCategory === "OTHER") {
      const customCategoryValue = (formData.get("customCategory") as string | null)?.trim();
      if (!customCategoryValue) {
        return { error: t("form.customCategoryRequired") };
      }
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
      posthog.capture("circle_created", {
        circle_id: result.data.id,
        circle_slug: result.data.slug,
        visibility: result.data.visibility,
        is_edit: !!circle,
      });
      router.push(`/dashboard/circles/${result.data.slug}`);
      return {};
    }

    return { error: result.error };
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});

  // Sync l'erreur de l'action vers l'état local (pour pouvoir la vider indépendamment)
  useEffect(() => {
    setLocalError(state.error);
  }, [state.error]);

  return (
    <form action={formAction} className="mx-auto max-w-5xl">
      {localError && (
        <div className="bg-destructive/10 text-destructive mb-6 rounded-md p-3 text-sm">
          {localError}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">

        {/* ── Colonne gauche : cover (sticky) ── */}
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[340px] lg:sticky lg:top-6">
          <div className="flex flex-col gap-3">
            <CoverImagePicker
              circleName={circleName || undefined}
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
            value={circleName}
            required
            maxLength={100}
            onChange={(e) => setCircleName(e.target.value)}
            className="placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-3xl font-bold tracking-tight outline-none lg:text-4xl"
          />

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Thématique / Ville / Visibilité — compact inline */}
          <div className="flex flex-col gap-3">

            {/* Thématique */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Tag className="text-primary size-4" />
              </div>
              <span className="w-28 shrink-0 text-sm font-medium">{t("form.category")}</span>
              <div className="min-w-0 flex-1">
                <Select
                  name="category"
                  defaultValue={circle?.category ?? ""}
                  onValueChange={(value) => {
                    setSelectedCategory(value as CircleCategory | "");
                    setLocalError(undefined);
                  }}
                >
                  <SelectTrigger className="h-9">
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

            {/* Thématique libre — visible uniquement si "Autre" est sélectionné */}
            {selectedCategory === "OTHER" && (
              <div className="flex items-center gap-3">
                <div className="size-9 shrink-0" />
                <span className="w-28 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Input
                    name="customCategory"
                    placeholder={t("form.customCategoryPlaceholder")}
                    value={customCategoryValue}
                    onChange={(e) => setCustomCategoryValue(e.target.value)}
                    required
                    maxLength={30}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* Ville */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <MapPin className="text-primary size-4" />
              </div>
              <span className="w-28 shrink-0 text-sm font-medium">{t("form.city")}</span>
              <div className="min-w-0 flex-1">
                <Input
                  name="city"
                  placeholder={t("form.cityPlaceholder")}
                  value={cityValue}
                  onChange={(e) => setCityValue(e.target.value)}
                  maxLength={100}
                  className="h-9"
                />
              </div>
            </div>

            {/* Site web */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Globe className="text-primary size-4" />
              </div>
              <span className="w-28 shrink-0 text-sm font-medium">{t("form.website")}</span>
              <div className="min-w-0 flex-1">
                <Input
                  name="website"
                  type="url"
                  placeholder={t("form.websitePlaceholder")}
                  value={websiteValue}
                  onChange={(e) => setWebsiteValue(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Visibilité */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                {(circle?.visibility ?? "PUBLIC") === "PUBLIC" ? (
                  <Globe className="text-primary size-4" />
                ) : (
                  <Lock className="text-primary size-4" />
                )}
              </div>
              <span className="w-28 shrink-0 text-sm font-medium">{t("form.visibility")}</span>
              <div className="min-w-0 flex-1">
                <Select
                  name="visibility"
                  defaultValue={circle?.visibility ?? "PUBLIC"}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">{t("form.visibilityPublic")}</SelectItem>
                    <SelectItem value="PRIVATE">{t("form.visibilityPrivate")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                required
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-border border-t" />

          {/* Validation des inscriptions */}
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck className="text-primary size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="requiresApproval" className="text-sm font-medium cursor-pointer">
                {t("form.requiresApproval")}
              </label>
              <p className="text-muted-foreground text-xs">
                {t("form.requiresApprovalDescription")}
              </p>
            </div>
            <Switch
              id="requiresApproval"
              name="requiresApproval"
              defaultChecked={circle?.requiresApproval ?? false}
            />
          </div>

          {/* Paiements Stripe — visible uniquement en mode édition avec props */}
          {stripeConnect && (
            <StripeConnectInline {...stripeConnect} />
          )}

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

// --- Stripe Connect inline section ---

function StripeConnectInline({
  circleId,
  circleSlug,
  hasAccount,
  status,
}: StripeConnectProps) {
  const t = useTranslations("Circle");
  const [isPending, startTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = isPending || isRedirecting;

  const isActive = hasAccount && status === "active";
  const needsAction = hasAccount && !isActive;

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const returnUrl = `${window.location.origin}/dashboard/circles/${circleSlug}/edit`;
      const result = await onboardStripeConnectAction(circleId, returnUrl);
      if (result.success) {
        setIsRedirecting(true);
        window.location.href = result.data.onboardingUrl;
      } else {
        setError(result.error);
      }
    });
  }

  function handleViewDashboard() {
    setError(null);
    startTransition(async () => {
      const result = await getStripeLoginLinkAction(circleId);
      if (result.success) {
        window.open(result.data.url, "_blank");
      } else {
        setError(result.error);
      }
    });
  }

  const actionButton = !hasAccount ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={handleActivate}
      disabled={busy}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
      {t("stripeConnect.activate")}
    </Button>
  ) : needsAction ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={handleActivate}
      disabled={busy}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {t("stripeConnect.resume")}
    </Button>
  ) : isActive ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={handleViewDashboard}
      disabled={busy}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
      {t("stripeConnect.viewDashboard")}
    </Button>
  ) : null;

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-green-500/10" : "bg-primary/10"}`}>
        <CreditCard className={`size-4 ${isActive ? "text-green-500" : "text-primary"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("stripeConnect.title")}</p>
            {!hasAccount && (
              <p className="text-muted-foreground text-xs">
                {t("stripeConnect.description")}
              </p>
            )}
            {needsAction && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{t("stripeConnect.pending")}</span>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground mt-1 text-xs underline underline-offset-2 transition-colors"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await cancelStripeConnectAction(circleId);
                      if (result.success) {
                        window.location.reload();
                      } else {
                        setError(result.error);
                      }
                    });
                  }}
                >
                  {t("stripeConnect.cancel")}
                </button>
              </div>
            )}
            {isActive && (
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>{t("stripeConnect.active")}</span>
              </div>
            )}
          </div>
          {/* Desktop: button aligned right */}
          <div className="hidden sm:block">
            {actionButton}
          </div>
        </div>
        {/* Mobile: button below text */}
        <div className="mt-2 sm:hidden">
          {actionButton}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
