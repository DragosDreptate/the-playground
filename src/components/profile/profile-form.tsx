"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/domain/models/user";
import type { ActionResult } from "@/app/actions/types";
import { useRouter } from "@/i18n/navigation";

type ProfileFormProps = {
  user: Pick<User, "email" | "firstName" | "lastName">;
  mode: "setup" | "edit";
  action: (formData: FormData) => Promise<ActionResult<User>>;
};

type FormState = {
  error?: string;
  saved?: boolean;
};

export function ProfileForm({ user, mode, action }: ProfileFormProps) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
    const result = await action(formData);

    if (result.success) {
      if (mode === "setup") {
        router.push("/dashboard");
        return {};
      }
      return { saved: true };
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

      {state.saved && (
        <div className="bg-primary/10 text-primary rounded-md p-3 text-sm">
          {t("form.saved")}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t("form.email")}</Label>
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
        />
        <p className="text-muted-foreground text-xs">
          {t("form.emailHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstName">{t("form.firstName")}</Label>
        <Input
          id="firstName"
          name="firstName"
          placeholder={t("form.firstNamePlaceholder")}
          defaultValue={user.firstName ?? ""}
          required
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">{t("form.lastName")}</Label>
        <Input
          id="lastName"
          name="lastName"
          placeholder={t("form.lastNamePlaceholder")}
          defaultValue={user.lastName ?? ""}
          required
          maxLength={50}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? tCommon("loading")
            : mode === "setup"
              ? t("form.continue")
              : tCommon("save")}
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {tCommon("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
