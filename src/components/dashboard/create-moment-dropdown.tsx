"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CircleAvatar } from "@/components/circles/circle-avatar";

type HostCircle = {
  slug: string;
  name: string;
  logo: string | null;
};

type CreateMomentDropdownProps = {
  circles: HostCircle[];
};

export function CreateMomentDropdown({ circles }: CreateMomentDropdownProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="w-full sm:w-auto gap-1.5">
          <Plus className="size-3.5" />
          {t("createMoment")}
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          {t("selectCircleDropdown")}
        </p>
        <div className="mt-0.5">
          {circles.map((circle) => (
            <button
              key={circle.slug}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/dashboard/circles/${circle.slug}/moments/new`);
              }}
              className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors"
            >
              <CircleAvatar name={circle.name} image={circle.logo} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {circle.name}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
