import { getTranslations } from "next-intl/server";
import { CircleForm } from "@/components/circles/circle-form";
import { createCircleAction } from "@/app/actions/circle";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export default async function NewCirclePage() {
  const t = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          {tDashboard("title")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate font-medium">
          {t("create.title")}
        </span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("create.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("create.description")}
        </p>
      </div>
      <CircleForm action={createCircleAction} />
    </div>
  );
}
