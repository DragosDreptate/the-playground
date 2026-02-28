"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail } from "lucide-react";
import type { NotificationPreferences } from "@/domain/models/user";
import type { ActionResult } from "@/app/actions/types";

type NotificationPreferencesFormProps = {
  preferences: NotificationPreferences;
  email: string;
  action: (formData: FormData) => Promise<ActionResult<NotificationPreferences>>;
};

type FormState = {
  error?: string;
  saved?: boolean;
};

export function NotificationPreferencesForm({
  preferences,
  email,
  action,
}: NotificationPreferencesFormProps) {
  const t = useTranslations("Profile.notifications");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPreferences>(preferences);

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
    // Inject boolean values from state (switches don't submit natively in formData)
    formData.set("notifyNewRegistration", String(prefs.notifyNewRegistration));
    formData.set("notifyNewComment", String(prefs.notifyNewComment));
    formData.set("notifyNewFollower", String(prefs.notifyNewFollower));
    formData.set("notifyNewMomentInCircle", String(prefs.notifyNewMomentInCircle));

    const result = await action(formData);

    if (result.success) {
      router.refresh();
      return { saved: true };
    }

    return { error: result.error };
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});

  return (
    <form action={formAction} className="space-y-6">
      {/* Email banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/7 px-4 py-3">
        <Mail className="text-primary size-4 shrink-0" />
        <p className="text-muted-foreground text-[13px] leading-snug">
          {t.rich("emailBanner", {
            email,
            strong: (chunks) => (
              <strong className="text-foreground font-medium">{chunks}</strong>
            ),
          })}
        </p>
      </div>

      {state.error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {state.error}
        </div>
      )}

      {state.saved && (
        <div className="bg-primary/10 text-primary rounded-md p-3 text-sm">
          {t("saved")}
        </div>
      )}

      {/* Organisateur section */}
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          {t("organizer")}
        </p>
        <div className="flex flex-col">
          <ToggleRow
            label={t("newRegistration")}
            description={t("newRegistrationDesc")}
            checked={prefs.notifyNewRegistration}
            onCheckedChange={(val) =>
              setPrefs((p) => ({ ...p, notifyNewRegistration: val }))
            }
          />
          <ToggleRow
            label={t("newFollower")}
            description={t("newFollowerDesc")}
            checked={prefs.notifyNewFollower}
            onCheckedChange={(val) =>
              setPrefs((p) => ({ ...p, notifyNewFollower: val }))
            }
            isLast
          />
        </div>
      </div>

      {/* Participant section */}
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          {t("participant")}
        </p>
        <div className="flex flex-col">
          <ToggleRow
            label={t("newComment")}
            description={t("newCommentDesc")}
            checked={prefs.notifyNewComment}
            onCheckedChange={(val) =>
              setPrefs((p) => ({ ...p, notifyNewComment: val }))
            }
          />
          <ToggleRow
            label={t("newMomentInCircle")}
            description={t("newMomentInCircleDesc")}
            checked={prefs.notifyNewMomentInCircle}
            onCheckedChange={(val) =>
              setPrefs((p) => ({ ...p, notifyNewMomentInCircle: val }))
            }
            isLast
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? tCommon("loading") : tCommon("save")}
      </Button>
    </form>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  isLast = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 ${!isLast ? "border-border border-b" : ""}`}
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-[12.5px]">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
