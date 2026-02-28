"use client";

import { useState, useMemo } from "react";
import { MapPin, ChevronDown, ExternalLink, X } from "lucide-react";
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

type VideoPlatform = "meet" | "zoom" | "teams";

function detectVideoPlatform(url: string): VideoPlatform | null {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("meet.google.com")) return "meet";
    if (hostname.includes("zoom.us")) return "zoom";
    if (
      hostname.includes("teams.microsoft.com") ||
      hostname.includes("teams.live.com")
    )
      return "teams";
    return null;
  } catch {
    return null;
  }
}

const PLATFORM_SHORTCUTS: {
  id: VideoPlatform;
  label: string;
  url: string;
}[] = [
  {
    id: "meet",
    label: "Google Meet",
    url: "https://meet.google.com/new",
  },
  {
    id: "zoom",
    label: "Zoom",
    url: "https://zoom.us/meeting/schedule",
  },
  {
    id: "teams",
    label: "Teams",
    url: "https://teams.microsoft.com/l/meeting/new",
  },
];

function PlatformIcon({
  platform,
  size = 14,
}: {
  platform: VideoPlatform | null;
  size?: number;
}) {
  if (platform === "meet") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size, height: size, flexShrink: 0 }}
        aria-hidden="true"
      >
        <rect x="3" y="7" width="13" height="10" rx="2" stroke="#00AC47" strokeWidth="1.5" fill="none" />
        <path d="M16 10.5L21 8V16L16 13.5V10.5Z" fill="#00AC47" />
      </svg>
    );
  }
  if (platform === "zoom") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size, height: size, flexShrink: 0 }}
        aria-hidden="true"
      >
        <rect x="2" y="7" width="14" height="10" rx="2" fill="#2D8CFF" />
        <path d="M16 10.5L21 8V16L16 13.5V10.5Z" fill="#2D8CFF" />
      </svg>
    );
  }
  if (platform === "teams") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size, height: size, flexShrink: 0 }}
        aria-hidden="true"
      >
        <rect x="3" y="9" width="9" height="7" rx="1.5" fill="#5B5EA6" />
        <circle cx="17" cy="8" r="2.5" fill="#5B5EA6" opacity="0.7" />
        <rect x="13" y="11" width="6" height="5" rx="1" fill="#5B5EA6" opacity="0.5" />
      </svg>
    );
  }
  return null;
}

type MomentFormLocationRowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationType: LocationType;
  onLocationTypeChange: (type: LocationType) => void;
  defaultLocationName?: string;
  defaultLocationAddress?: string;
  defaultVideoLink?: string;
  onLocationNameChange?: (value: string) => void;
  onLocationAddressChange?: (value: string) => void;
};

export function MomentFormLocationRow({
  open,
  onOpenChange,
  locationType,
  onLocationTypeChange,
  defaultLocationName = "",
  defaultLocationAddress = "",
  defaultVideoLink = "",
  onLocationNameChange,
  onLocationAddressChange,
}: MomentFormLocationRowProps) {
  const t = useTranslations("Moment");

  const showPhysical = locationType === "IN_PERSON" || locationType === "HYBRID";
  const showVirtual = locationType === "ONLINE" || locationType === "HYBRID";

  // Controlled state for address (autocomplete BAN)
  const [locationAddress, setLocationAddress] = useState(defaultLocationAddress);
  const addressAutocomplete = usePlaceAutocomplete();

  // Controlled state for video link (needed for platform detection)
  const [videoLink, setVideoLink] = useState(defaultVideoLink);
  const detectedPlatform = useMemo(
    () => detectVideoPlatform(videoLink),
    [videoLink]
  );

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
                  onChange={(e) => onLocationNameChange?.(e.target.value)}
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
                  onChange={(v) => { setLocationAddress(v); onLocationAddressChange?.(v); }}
                  suggestions={addressAutocomplete.suggestions}
                  isLoading={addressAutocomplete.isLoading}
                  onQueryChange={addressAutocomplete.suggest}
                  onSelect={(s) => {
                    setLocationAddress(s.fullAddress);
                    onLocationAddressChange?.(s.fullAddress);
                    addressAutocomplete.clear();
                  }}
                  onClear={addressAutocomplete.clear}
                />
              </div>
            </div>
          )}

          {/* Virtual link field */}
          {showVirtual && (
            <div className="space-y-2">
              <Label htmlFor="videoLink" className="text-xs">
                {t("form.videoLink")}
              </Label>

              {/* Platform shortcut buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PLATFORM_SHORTCUTS.map((platform) => (
                  <a
                    key={platform.id}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground border-border hover:border-primary/50 hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs font-medium transition-colors"
                  >
                    <PlatformIcon platform={platform.id} size={13} />
                    {platform.label}
                    <ExternalLink className="size-2.5 opacity-50" />
                  </a>
                ))}
              </div>

              {/* Separator */}
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <div className="bg-border h-px flex-1" />
                <span>{t("form.videoLinkOr")}</span>
                <div className="bg-border h-px flex-1" />
              </div>

              {/* Input with platform icon when detected */}
              <div className="relative">
                {detectedPlatform && (
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">
                    <PlatformIcon platform={detectedPlatform} size={15} />
                  </span>
                )}
                <Input
                  id="videoLink"
                  name="videoLink"
                  type="url"
                  placeholder={t("form.videoLinkPlaceholder")}
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  className={`h-9 transition-all ${detectedPlatform ? "pr-8 pl-8" : ""}`}
                />
                {videoLink && (
                  <button
                    type="button"
                    onClick={() => setVideoLink("")}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 transition-colors"
                    aria-label="Effacer le lien"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
