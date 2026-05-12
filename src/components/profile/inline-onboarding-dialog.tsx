"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { completeOnboardingAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InlineOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
};

type FormState = {
  error?: string;
};

export function InlineOnboardingDialog({
  open,
  onOpenChange,
  onCompleted,
}: InlineOnboardingDialogProps) {
  const t = useTranslations("Profile.inlineOnboarding");
  const tForm = useTranslations("Profile.form");
  const tCommon = useTranslations("Common");

  async function handleSubmit(
    _prev: FormState,
    formData: FormData,
  ): Promise<FormState> {
    const result = await completeOnboardingAction(formData);
    if (!result.success) return { error: result.error };

    onOpenChange(false);
    onCompleted();
    return {};
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {state.error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inline-firstName">{tForm("firstName")}</Label>
            <Input
              id="inline-firstName"
              name="firstName"
              placeholder={tForm("firstNamePlaceholder")}
              required
              maxLength={50}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? tCommon("loading") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
