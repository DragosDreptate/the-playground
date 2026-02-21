"use client";

import { Pencil, Ticket, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wider">
        {t("form.eventOptions")}
      </p>

      <div className="space-y-3">
        {/* Ticket price row */}
        <div className="py-1">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Ticket className="text-primary size-4" />
            </div>
            <span className="flex-1 text-sm font-medium">
              {t("form.ticketPrice")}
            </span>
            {!priceOpen ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
                onClick={() => onPriceOpenChange(true)}
              >
                <span>{t("form.free")}</span>
                <Pencil className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                onClick={() => onPriceOpenChange(false)}
              >
                {t("form.free")}
              </button>
            )}
          </div>

          {priceOpen && (
            <div className="mt-2 grid gap-3 pl-12 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="price" className="text-xs">
                  {t("form.price")}
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  placeholder={t("form.pricePlaceholder")}
                  defaultValue={defaultPrice || ""}
                  className="h-9"
                />
                <p className="text-muted-foreground text-xs">
                  {t("form.priceHint")}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency" className="text-xs">
                  {t("form.currency")}
                </Label>
                <Select name="currency" defaultValue={defaultCurrency}>
                  <SelectTrigger id="currency" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

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
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
                onClick={() => onCapacityOpenChange(true)}
              >
                <span>{t("form.unlimited")}</span>
                <Pencil className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                onClick={() => onCapacityOpenChange(false)}
              >
                {t("form.unlimited")}
              </button>
            )}
          </div>

          {capacityOpen && (
            <div className="mt-2 pl-12">
              <div className="max-w-xs space-y-1">
                <Label htmlFor="capacity" className="text-xs">
                  {t("form.capacity")}
                </Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder={t("form.capacityPlaceholder")}
                  defaultValue={defaultCapacity ?? ""}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
