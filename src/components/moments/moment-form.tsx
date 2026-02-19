"use client";

import { useActionState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Moment } from "@/domain/models/moment";
import type { ActionResult } from "@/app/actions/types";
import { useRouter } from "@/i18n/navigation";

type MomentFormProps = {
  moment?: Moment;
  circleSlug: string;
  action: (formData: FormData) => Promise<ActionResult<Moment>>;
};

type FormState = {
  error?: string;
};

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MomentForm({ moment, circleSlug, action }: MomentFormProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
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

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">{t("form.title")}</Label>
        <Input
          id="title"
          name="title"
          placeholder={t("form.titlePlaceholder")}
          defaultValue={moment?.title ?? ""}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("form.description")}</Label>
        <Textarea
          id="description"
          name="description"
          placeholder={t("form.descriptionPlaceholder")}
          defaultValue={moment?.description ?? ""}
          required
          rows={4}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">{t("form.startsAt")}</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={
              moment?.startsAt ? formatDateTimeLocal(moment.startsAt) : ""
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">{t("form.endsAt")}</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={
              moment?.endsAt ? formatDateTimeLocal(moment.endsAt) : ""
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="locationType">{t("form.locationType")}</Label>
        <Select
          name="locationType"
          defaultValue={moment?.locationType ?? "IN_PERSON"}
        >
          <SelectTrigger id="locationType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IN_PERSON">
              {t("form.locationInPerson")}
            </SelectItem>
            <SelectItem value="ONLINE">{t("form.locationOnline")}</SelectItem>
            <SelectItem value="HYBRID">{t("form.locationHybrid")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locationName">{t("form.locationName")}</Label>
          <Input
            id="locationName"
            name="locationName"
            placeholder={t("form.locationNamePlaceholder")}
            defaultValue={moment?.locationName ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationAddress">{t("form.locationAddress")}</Label>
          <Input
            id="locationAddress"
            name="locationAddress"
            placeholder={t("form.locationAddressPlaceholder")}
            defaultValue={moment?.locationAddress ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoLink">{t("form.videoLink")}</Label>
        <Input
          id="videoLink"
          name="videoLink"
          type="url"
          placeholder={t("form.videoLinkPlaceholder")}
          defaultValue={moment?.videoLink ?? ""}
        />
      </div>

      {moment && (
        <div className="space-y-2">
          <Label htmlFor="status">{t("form.status")}</Label>
          <Select name="status" defaultValue={moment.status}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
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

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            {t("form.advancedOptions")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="capacity">{t("form.capacity")}</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              placeholder={t("form.capacityPlaceholder")}
              defaultValue={moment?.capacity ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">{t("form.price")}</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                placeholder={t("form.pricePlaceholder")}
                defaultValue={moment?.price ?? ""}
              />
              <p className="text-muted-foreground text-xs">
                {t("form.priceHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t("form.currency")}</Label>
              <Select
                name="currency"
                defaultValue={moment?.currency ?? "EUR"}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? tCommon("loading")
            : moment
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
