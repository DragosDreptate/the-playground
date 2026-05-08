"use client";

import { useActionState, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { CircleVenue } from "@/domain/models/circle-venue";
import {
  createCircleVenueAction,
  deleteCircleVenueAction,
  updateCircleVenueAction,
} from "@/app/actions/circle-venue";
import type { ActionResult } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlaceAutocompleteInput } from "@/components/ui/place-autocomplete-input";
import { usePlaceAutocomplete } from "@/hooks/use-place-autocomplete";

type CircleVenueManagerProps = {
  circleId: string;
  circleSlug: string;
  venues: CircleVenue[];
};

type FormState = {
  error?: string;
};

type VenueDialogProps = {
  circleId: string;
  circleSlug: string;
  venue?: CircleVenue;
  trigger: ReactNode;
};

function VenueDialog({ circleId, circleSlug, venue, trigger }: VenueDialogProps) {
  const t = useTranslations("Circle.venues");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(venue?.address ?? "");
  const autocomplete = usePlaceAutocomplete();

  async function handleSubmit(
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> {
    formData.set("address", address);
    const result = venue
      ? await updateCircleVenueAction(circleId, circleSlug, venue.id, formData)
      : await createCircleVenueAction(circleId, circleSlug, formData);

    if (result.success) {
      setOpen(false);
      router.refresh();
      return {};
    }

    return { error: result.error };
  }

  const [state, formAction, isPending] = useActionState(handleSubmit, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {venue ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={venue ? `venue-name-${venue.id}` : "venue-name"}>
              {t("name")}
            </Label>
            <Input
              id={venue ? `venue-name-${venue.id}` : "venue-name"}
              name="name"
              defaultValue={venue?.name ?? ""}
              required
              maxLength={120}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={venue ? `venue-address-${venue.id}` : "venue-address"}>
              {t("address")}
            </Label>
            <PlaceAutocompleteInput
              id={venue ? `venue-address-${venue.id}` : "venue-address"}
              name="address"
              value={address}
              onChange={setAddress}
              placeholder={t("addressPlaceholder")}
              suggestions={autocomplete.suggestions}
              isLoading={autocomplete.isLoading}
              onQueryChange={autocomplete.suggest}
              onSelect={(suggestion) => {
                setAddress(suggestion.fullAddress);
                autocomplete.clear();
                autocomplete.resetSession();
              }}
              onClear={autocomplete.clear}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteVenueDialog({
  circleId,
  circleSlug,
  venue,
}: {
  circleId: string;
  circleSlug: string;
  venue: CircleVenue;
}) {
  const t = useTranslations("Circle.venues");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      setError(null);
      const result = await deleteCircleVenueAction(circleId, circleSlug, venue.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("delete")}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle", { name: venue.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? tCommon("loading") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CircleVenueManager({
  circleId,
  circleSlug,
  venues,
}: CircleVenueManagerProps) {
  const t = useTranslations("Circle.venues");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("description")}</p>
        </div>
        <VenueDialog
          circleId={circleId}
          circleSlug={circleSlug}
          trigger={
            <Button>
              <Plus className="size-4" />
              {t("create")}
            </Button>
          }
        />
      </div>

      {venues.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border p-8 text-center">
          <MapPin className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="divide-border overflow-hidden rounded-lg border">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="flex items-center gap-3 p-4"
            >
              <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <MapPin className="text-primary size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{venue.name}</p>
                <p className="text-muted-foreground truncate text-sm">{venue.address}</p>
              </div>
              <VenueDialog
                circleId={circleId}
                circleSlug={circleSlug}
                venue={venue}
                trigger={
                  <Button variant="outline" size="icon" aria-label={t("edit")}>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <DeleteVenueDialog
                circleId={circleId}
                circleSlug={circleSlug}
                venue={venue}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
