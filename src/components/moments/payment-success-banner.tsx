import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

export async function PaymentSuccessBanner() {
  const t = await getTranslations("Moment");

  return (
    <div className="bg-primary/[0.06] mx-auto mb-4 flex max-w-3xl items-center gap-3 rounded-xl p-4">
      <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
        <CheckCircle2 className="size-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">
          {t("public.paymentSuccessTitle")}
        </p>
        <p className="text-muted-foreground text-xs">
          {t("public.paymentSuccessDescription")}
        </p>
      </div>
    </div>
  );
}
