import { getTranslations } from "next-intl/server";
import { NetworkForm } from "@/components/admin/network-form";

export default async function AdminCreateNetworkPage() {
  const t = await getTranslations("Admin");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{t("networks")}</p>
        <h1 className="text-2xl font-bold">{t("createNetwork")}</h1>
      </div>
      <NetworkForm mode="create" />
    </div>
  );
}
