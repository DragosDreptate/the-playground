"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Globe, Linkedin, Github } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";
import type { User } from "@/domain/models/user";
import type { ActionResult } from "@/app/actions/types";
import { useRouter } from "@/i18n/navigation";

const BIO_MAX_LENGTH = 160;

type ProfileFormProps = {
  user: Pick<User, "firstName" | "lastName" | "bio" | "city" | "website" | "linkedinUrl" | "twitterUrl" | "githubUrl">;
  mode: "setup" | "edit";
  action: (formData: FormData) => Promise<ActionResult<User>>;
  callbackUrl?: string;
};

type FormState = {
  error?: string;
  saved?: boolean;
};

export function ProfileForm({ user, mode, action, callbackUrl }: ProfileFormProps) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [bioLength, setBioLength] = useState(user.bio?.length ?? 0);

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
    const result = await action(formData);

    if (result.success) {
      if (mode === "setup") {
        if (callbackUrl) {
          window.location.href = callbackUrl;
        } else {
          router.push("/dashboard");
        }
        return {};
      }
      router.refresh();
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

      {/* Bio + City — only in edit mode */}
      {mode === "edit" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="bio">{t("form.bio")}</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder={t("form.bioPlaceholder")}
              defaultValue={user.bio ?? ""}
              maxLength={BIO_MAX_LENGTH}
              rows={2}
              onChange={(e) => setBioLength(e.target.value.length)}
            />
            <p className="text-muted-foreground text-xs text-right">
              {bioLength} / {BIO_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t("form.city")}</Label>
            <div className="relative">
              <MapPin className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                id="city"
                name="city"
                placeholder={t("form.cityPlaceholder")}
                defaultValue={user.city ?? ""}
                className="pl-9"
                maxLength={100}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="border-border border-t" />

          {/* Social links */}
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              {t("form.links")}
            </p>

            <div className="space-y-3">
              <div className="relative">
                <Globe className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  name="website"
                  placeholder="https://..."
                  defaultValue={user.website ?? ""}
                  className="pl-9"
                  type="url"
                />
              </div>

              <div className="relative">
                <Linkedin className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  name="linkedinUrl"
                  placeholder="https://linkedin.com/in/..."
                  defaultValue={user.linkedinUrl ?? ""}
                  className="pl-9"
                  type="url"
                />
              </div>

              <div className="relative">
                <XIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  name="twitterUrl"
                  placeholder="https://x.com/..."
                  defaultValue={user.twitterUrl ?? ""}
                  className="pl-9"
                  type="url"
                />
              </div>

              <div className="relative">
                <Github className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  name="githubUrl"
                  placeholder="https://github.com/..."
                  defaultValue={user.githubUrl ?? ""}
                  className="pl-9"
                  type="url"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className={mode === "setup" ? "w-full" : undefined}
        >
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
