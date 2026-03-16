"use client";

import { Check, Lock, Pencil, Ticket, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MomentFormOptionsSectionProps = {
  // Price
  priceOpen: boolean;
  onPriceOpenChange: (open: boolean) => void;
  defaultPrice?: number;
  defaultCurrency?: string;
  // Capacity
  capacityOpen: boolean;
  onCapacityOpenChange: (open: boolean) => void;
  defaultCapacity?: number | null;
};

export function MomentFormOptionsSection({
  priceOpen,
  onPriceOpenChange,
  defaultPrice = 0,
  defaultCurrency = "EUR",
  capacityOpen,
  onCapacityOpenChange,
  defaultCapacity = null,
}: MomentFormOptionsSectionProps) {
  const t = useTranslations("Moment");
  const [capacityValue, setCapacityValue] = useState<string>(
    defaultCapacity?.toString() ?? ""
  );

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wider">
        {t("form.eventOptions")}
      </p>

      <div className="space-y-3">
        {/* Ticket price row — coming soon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed py-1 opacity-50 select-none">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Ticket className="text-primary size-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium">
                    {t("form.ticketPrice")}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <span>{t("form.free")}</span>
                    <Lock className="size-3.5" />
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("form.priceSoon")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Capacity row */}
        <div className="py-1">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Users className="text-primary size-4" />
            </div>
            <span className="flex-1 text-sm font-medium">
              {t("form.capacityLabel")}
            </span>
            {!capacityOpen ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-sm transition-colors"
                onClick={() => onCapacityOpenChange(true)}
              >
                <span>
                  {capacityValue || t("form.unlimited")}
                </span>
                <Pencil className="size-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder={t("form.capacityPlaceholder")}
                  aria-label={t("form.capacityLabel")}
                  value={capacityValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    const num = parseInt(val, 10);
                    setCapacityValue(val === "" ? "" : String(Math.max(1, num)));
                  }}
                  className="h-7 w-20 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onCapacityOpenChange(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 cursor-pointer transition-colors"
                  onClick={() => onCapacityOpenChange(false)}
                  title={t("form.capacityConfirm")}
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => {
                    setCapacityValue("");
                    onCapacityOpenChange(false);
                  }}
                  title={t("form.unlimited")}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
