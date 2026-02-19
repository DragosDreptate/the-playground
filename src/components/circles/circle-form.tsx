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
import type { Circle, CircleVisibility } from "@/domain/models/circle";
import type { ActionResult } from "@/app/actions/types";
import { useRouter } from "@/i18n/navigation";

type CircleFormProps = {
  circle?: Circle;
  action: (formData: FormData) => Promise<ActionResult<Circle>>;
};

type FormState = {
  error?: string;
};

export function CircleForm({ circle, action }: CircleFormProps) {
  const t = useTranslations("Circle");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
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

      <div className="space-y-2">
        <Label htmlFor="name">{t("form.name")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("form.namePlaceholder")}
          defaultValue={circle?.name ?? ""}
          required
          maxLength={100}
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
