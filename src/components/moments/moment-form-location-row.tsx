"use client";

import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceAutocompleteInput } from "@/components/ui/place-autocomplete-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePlaceAutocomplete } from "@/hooks/use-place-autocomplete";
import type { LocationType } from "@/domain/models/moment";

type MomentFormLocationRowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationType: LocationType;
  onLocationTypeChange: (type: LocationType) => void;
  defaultLocationName?: string;
  defaultLocationAddress?: string;
  defaultVideoLink?: string;
};

export function MomentFormLocationRow({
  open,
  onOpenChange,
  locationType,
  onLocationTypeChange,
  defaultLocationName = "",
  defaultLocationAddress = "",
  defaultVideoLink = "",
}: MomentFormLocationRowProps) {
  const t = useTranslations("Moment");

  const showPhysical = locationType === "IN_PERSON" || locationType === "HYBRID";
  const showVirtual = locationType === "ONLINE" || locationType === "HYBRID";

  // Controlled state for address (autocomplete BAN)
  const [locationAddress, setLocationAddress] = useState(defaultLocationAddress);
  const addressAutocomplete = usePlaceAutocomplete();

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      {/* Hidden input always in DOM — guarantees locationType is submitted */}
      <input type="hidden" name="locationType" value={locationType} />

      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors"
        >
          {/* Icon box */}
          <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <MapPin className="text-primary size-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t("form.addLocation")}</p>
            <p className="text-muted-foreground text-xs">
              {t("form.addLocationHint")}
            </p>
          </div>
          <ChevronDown
            className={`text-muted-foreground size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
        <div className="space-y-3 pt-2 pl-12">
          {/* Location type select */}
          <div className="space-y-1">
            <Label htmlFor="locationTypeSelect" className="text-xs">
              {t("form.locationType")}
            </Label>
            <Select
              value={locationType}
              onValueChange={(v) => onLocationTypeChange(v as LocationType)}
            >
              <SelectTrigger id="locationTypeSelect" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PERSON">
                  {t("form.locationInPerson")}
                </SelectItem>
                <SelectItem value="ONLINE">
                  {t("form.locationOnline")}
                </SelectItem>
                <SelectItem value="HYBRID">
                  {t("form.locationHybrid")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Physical venue fields */}
          {showPhysical && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="locationName" className="text-xs">
                  {t("form.locationName")}
                </Label>
                <Input
                  id="locationName"
                  name="locationName"
                  placeholder={t("form.locationNamePlaceholder")}
                  defaultValue={defaultLocationName}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="locationAddress" className="text-xs">
                  {t("form.locationAddress")}
                </Label>
                <PlaceAutocompleteInput
                  id="locationAddress"
                  name="locationAddress"
                  placeholder={t("form.locationAddressPlaceholder")}
                  value={locationAddress}
                  onChange={setLocationAddress}
                  suggestions={addressAutocomplete.suggestions}
                  isLoading={addressAutocomplete.isLoading}
                  onQueryChange={addressAutocomplete.suggest}
                  onSelect={(s) => {
                    setLocationAddress(s.fullAddress);
                    addressAutocomplete.clear();
                  }}
                  onClear={addressAutocomplete.clear}
                />
              </div>
            </div>
          )}

          {/* Virtual link field */}
          {showVirtual && (
            <div className="space-y-1">
              <Label htmlFor="videoLink" className="text-xs">
                {t("form.videoLink")}
              </Label>
              <Input
                id="videoLink"
                name="videoLink"
                type="url"
                placeholder={t("form.videoLinkPlaceholder")}
                defaultValue={defaultVideoLink}
                className="h-9"
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
