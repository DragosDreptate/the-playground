import { getTranslations } from "next-intl/server";
import { CircleForm } from "@/components/circles/circle-form";
import { createCircleAction } from "@/app/actions/circle";

export default async function NewCirclePage() {
  const t = await getTranslations("Circle");

  return (
    <div className="mx-auto max-w-lg space-y-6">
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
