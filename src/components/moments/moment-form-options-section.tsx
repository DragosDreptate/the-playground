"use client";

import { Check, Lock, Pencil, RefreshCw, Ticket, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  stripeConnectActive?: boolean;
  // Refundable
  defaultRefundable?: boolean;
  // Capacity
  capacityOpen: boolean;
  onCapacityOpenChange: (open: boolean) => void;
  defaultCapacity?: number | null;
};

function formatPriceEur(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function estimateNet(cents: number): string {
  const net = cents - Math.round(cents * 0.029 + 30);
  return formatPriceEur(Math.max(0, net));
}

export function MomentFormOptionsSection({
  priceOpen,
  onPriceOpenChange,
  defaultPrice = 0,
  defaultCurrency = "EUR",
  stripeConnectActive = false,
  defaultRefundable = true,
  capacityOpen,
  onCapacityOpenChange,
  defaultCapacity = null,
}: MomentFormOptionsSectionProps) {
  const t = useTranslations("Moment");
  const [capacityValue, setCapacityValue] = useState<string>(
    defaultCapacity?.toString() ?? ""
  );
  const [priceValue, setPriceValue] = useState<string>(
    defaultPrice > 0 ? String(defaultPrice / 100) : ""
  );

  const priceCents = Math.round((parseFloat(priceValue) || 0) * 100);
  const hasPaidPrice = priceCents > 0;

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wider">
        {t("form.eventOptions")}
      </p>

      <div className="space-y-3">
        {/* Hidden input for actual price in cents */}
        <input type="hidden" name="price" value={priceCents} />

        {/* Ticket price row */}
        {!stripeConnectActive ? (
          // Stripe not active — show disabled row with tooltip
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
                <p>{t("form.priceRequiresStripe")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          // Stripe active — editable price
          <div>
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
                    className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-sm transition-colors"
                    onClick={() => onPriceOpenChange(true)}
                  >
                    <span>
                      {hasPaidPrice
                        ? `${formatPriceEur(priceCents)} ${defaultCurrency}`
                        : t("form.free")}
                    </span>
                    <Pencil className="size-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0.50"
                      step="0.01"
                      placeholder="0"
                      aria-label={t("form.ticketPrice")}
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      className="h-7 w-20 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onPriceOpenChange(false);
                        }
                      }}
                      autoFocus
                    />
                    <span className="text-muted-foreground text-xs font-medium">
                      {defaultCurrency}
                    </span>
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 cursor-pointer transition-colors"
                      onClick={() => onPriceOpenChange(false)}
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      onClick={() => {
                        setPriceValue("");
                        onPriceOpenChange(false);
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Net estimation — visible when price > 0 */}
            {hasPaidPrice && (
              <p className="text-muted-foreground mt-1 pl-12 text-xs">
                {t("form.priceEstimation", {
                  net: estimateNet(priceCents),
                  currency: defaultCurrency,
                })}
              </p>
            )}
          </div>
        )}

        {/* Refundable toggle — visible only when price > 0, confirmed (not editing), and Stripe active */}
        {stripeConnectActive && hasPaidPrice && !priceOpen && (
          <div className="flex items-center gap-3 py-1">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <RefreshCw className="text-primary size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="refundable" className="text-sm font-medium cursor-pointer">
                {t("form.refundable")}
              </label>
              <p className="text-muted-foreground text-xs">
                {t("form.refundableDescription")}
              </p>
            </div>
            <Switch
              id="refundable"
              name="refundable"
              defaultChecked={defaultRefundable}
            />
          </div>
        )}

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
