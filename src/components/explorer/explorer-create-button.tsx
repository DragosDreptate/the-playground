"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function ExplorerCreateButton() {
  const { data: session } = useSession();
  const t = useTranslations("Dashboard");

  if (!session?.user) return null;

  return (
    <Button asChild size="sm" className="shrink-0">
      <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
    </Button>
  );
}
