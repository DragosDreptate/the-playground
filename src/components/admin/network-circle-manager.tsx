"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X, Plus, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  adminAddCircleToNetworkAction,
  adminRemoveCircleFromNetworkAction,
  adminSearchCirclesForNetworkAction,
} from "@/app/actions/admin";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { NetworkCircleSearchResult } from "@/domain/ports/repositories/circle-network-repository";

type Props = {
  networkId: string;
  circles: PublicCircle[];
};

export function NetworkCircleManager({ networkId, circles }: Props) {
  const t = useTranslations("Admin");
  const tCat = useTranslations("CircleCategory");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NetworkCircleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      if (value.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const result = await adminSearchCirclesForNetworkAction(networkId, value);
      if (result.success) {
        setSearchResults(result.data);
      }
      setIsSearching(false);
    },
    [networkId]
  );

  function handleAdd(circleId: string) {
    startTransition(async () => {
      await adminAddCircleToNetworkAction(networkId, circleId);
      setQuery("");
      setSearchResults([]);
      router.refresh();
    });
  }

  function handleRemove(circleId: string) {
    startTransition(async () => {
      await adminRemoveCircleFromNetworkAction(networkId, circleId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t("searchCircle")}
          className="pl-9"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSearchResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="max-w-md space-y-1 rounded-md border p-2">
          {searchResults.map((circle) => (
            <div
              key={circle.id}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{circle.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{circle.slug}</span>
                  {circle.visibility === "PRIVATE" && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0 px-1">
                      <Lock className="size-2.5" />
                      Private
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAdd(circle.id)}
                disabled={isPending}
              >
                <Plus className="size-3.5" />
                {t("addCircle")}
              </Button>
            </div>
          ))}
        </div>
      )}
      {query.length >= 2 && searchResults.length === 0 && !isSearching && (
        <p className="text-sm text-muted-foreground max-w-md px-1">
          {t("table.noResults")}
        </p>
      )}

      {/* Current circles */}
      {circles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t("noNetworks")}</p>
      ) : (
        <div className="space-y-2">
          {circles.map((circle) => (
            <div
              key={circle.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{circle.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{circle.slug}</span>
                  {circle.category && (
                    <span>· {tCat(circle.category)}</span>
                  )}
                  {circle.city && <span>· {circle.city}</span>}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isPending}
                  >
                    {t("removeCircle")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("removeCircle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Retirer {circle.name} de ce Réseau ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(circle.id)}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {t("removeCircle")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
