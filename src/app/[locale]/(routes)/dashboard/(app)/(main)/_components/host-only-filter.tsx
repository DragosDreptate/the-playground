"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Crown, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function HostOnlyFilter({
  active,
  activeTab,
}: {
  active: boolean;
  activeTab: "moments" | "circles";
}) {
  const t = useTranslations("Dashboard");
  const router = useRouter();

  function handleChange(value: string) {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (value === "host") params.set("host", "true");
    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={active ? "host" : "all"} onValueChange={handleChange}>
      <SelectTrigger className="h-[38px] w-1/2 rounded-full border-border bg-transparent text-sm text-foreground shadow-none focus:ring-0 focus-visible:border-border focus-visible:ring-0 [&_svg]:text-foreground sm:h-8 sm:w-fit sm:min-w-[120px] dark:bg-transparent">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {t("filterAll")}
          </span>
        </SelectItem>
        <SelectItem value="host">
          <span className="flex items-center gap-1.5">
            <Crown className="size-3.5" />
            {t("filterHostOnly")}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
