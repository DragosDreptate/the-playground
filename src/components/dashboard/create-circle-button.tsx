import { getCachedSession } from "@/lib/auth-cache";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";

/** Bouton "Créer une Communauté" — toujours visible sur le tab Communautés. */
export async function CreateCircleButton() {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;

  const t = await getTranslations("Dashboard");

  return (
    <Button asChild size="sm" className="w-full sm:w-auto gap-1.5">
      <Link href="/dashboard/circles/new">
        <Plus className="size-3.5" />
        {t("createCircle")}
      </Link>
    </Button>
  );
}
