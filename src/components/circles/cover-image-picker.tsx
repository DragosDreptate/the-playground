"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Search, Upload, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMomentGradient } from "@/lib/gradient";
import type { CoverImageAttribution } from "@/domain/models/circle";
import type { UnsplashPhoto } from "@/app/api/unsplash/search/route";
import { resizeImage } from "@/lib/image-resize";

// ── Types ─────────────────────────────────────────────────────

export type CoverSelection =
  | { type: "unsplash"; url: string; thumbUrl: string; attribution: CoverImageAttribution }
  | { type: "upload"; file: File; previewUrl: string }
  | { type: "remove" };

type Props = {
  circleName?: string;
  currentImage?: string | null;
  currentAttribution?: CoverImageAttribution | null;
  onSelect: (data: CoverSelection) => void;
};


// ── Photo Grid ─────────────────────────────────────────────────

function PhotoGrid({
  photos,
  selectedId,
  onSelect,
}: {
  photos: UnsplashPhoto[];
  selectedId: string | null;
  onSelect: (photo: UnsplashPhoto) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {photos.map((photo) => {
        const isSelected = selectedId === photo.id;
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onSelect(photo)}
            className={`group relative aspect-square overflow-hidden rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl}
              alt={`Photo par ${photo.author.name}`}
              className="size-full object-cover"
              loading="lazy"
            />
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                <div className="flex size-6 items-center justify-center rounded-full bg-primary">
                  <Check className="size-3.5 text-white" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function CoverImagePicker({
  circleName,
  currentImage,
  currentAttribution,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<CoverSelection | null>(null);

  // Default random photos (fetched once on first open, cached)
  const [defaultPhotos, setDefaultPhotos] = useState<UnsplashPhoto[] | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);

  // Unsplash search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UnsplashPhoto[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const gradient = getMomentGradient(circleName ?? "");

  const displayedPhotos = searchResults ?? defaultPhotos ?? [];

  // Debounced Unsplash search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSearchResults(null);
      setSearchTotal(0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchPage(1);
      try {
        const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(value.trim())}&page=1`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
          setSearchTotal(data.total);
          setSearchTotalPages(data.totalPages);
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function handleGoToPage(page: number) {
    if (!query || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(query.trim())}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results);
        setSearchPage(page);
        setSearchTotalPages(data.totalPages);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleUnsplashSelect(photo: UnsplashPhoto) {
    setSelectedUnsplashId(photo.id);
    setPending({
      type: "unsplash",
      url: photo.url,
      thumbUrl: photo.thumbUrl,
      attribution: { name: photo.author.name, url: photo.author.profileUrl },
    });
    // Clear upload selection
    setUploadFile(null);
    setUploadPreview(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`Fichier trop volumineux (max ${MAX_MB} Mo)`);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Format non supporté (JPG, PNG ou WebP uniquement)");
      return;
    }

    const resized = await resizeImage(file, { maxSize: 800 });
    const resizedFile = new File([resized], file.name, { type: "image/webp" });
    const previewUrl = URL.createObjectURL(resized);

    setUploadFile(resizedFile);
    setUploadPreview(previewUrl);
    setPending({ type: "upload", file: resizedFile, previewUrl });
    // Clear Unsplash selection
    setSelectedUnsplashId(null);
  }

  function handleApply() {
    if (pending) {
      onSelect(pending);
    }
    handleOpenChange(false);
  }

  function handleRemove() {
    onSelect({ type: "remove" });
    handleOpenChange(false);
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (value) {
      // Fetch random photos on first open
      if (defaultPhotos === null && !isLoadingDefaults) {
        setIsLoadingDefaults(true);
        fetch("/api/unsplash/random")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.results) setDefaultPhotos(data.results as UnsplashPhoto[]);
          })
          .catch(() => {
            // Échec silencieux — la recherche reste disponible
          })
          .finally(() => setIsLoadingDefaults(false));
      }
    } else {
      // Reset search state on close (keep defaultPhotos cached)
      setPending(null);
      setQuery("");
      setSearchResults(null);
      setSearchTotal(0);
      setSearchTotalPages(0);
      setSearchPage(1);
      setSelectedUnsplashId(null);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadError(null);
    }
  }

  // Current preview image (selected or existing)
  const previewImage =
    pending?.type === "upload"
      ? pending.previewUrl
      : pending?.type === "unsplash"
        ? pending.thumbUrl
        : pending?.type === "remove"
          ? null
          : currentImage;

  return (
    <>
      {/* Zone de couverture cliquable */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="group relative w-full overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ aspectRatio: "1 / 1" }}
        aria-label="Modifier l'image de couverture"
      >
        {previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImage}
            alt="Image de couverture"
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full" style={{ background: gradient }} />
        )}

        {/* Overlay au survol */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
          <div className="flex translate-y-1 items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-black opacity-0 shadow transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <Camera className="size-4" />
            Modifier la couverture
          </div>
        </div>
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={[
          // Mobile : w-screen = 100vw (toujours viewport, même avec le bug iOS Safari fixed→absolute)
          "top-0 left-0 w-screen h-dvh max-w-none translate-x-0 translate-y-0 rounded-none overflow-x-hidden overflow-y-auto",
          // Desktop sm+ : dialog centré normal
          "sm:top-[50%] sm:left-[50%] sm:w-auto sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:overflow-hidden",
        ].join(" ")}>
          <DialogHeader>
            <DialogTitle>Image de couverture</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="photos">
            <TabsList className="w-full">
              <TabsTrigger value="photos" className="flex-1">
                Photos
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                Importer
              </TabsTrigger>
            </TabsList>

            {/* ── Onglet Photos ── */}
            <TabsContent value="photos" className="mt-4 space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="running, yoga, design…"
                  className="pl-9"
                />
                {isSearching && (
                  <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
                )}
              </div>

              {/* Résultats, skeleton ou photos par défaut */}
              {searchResults !== null && searchResults.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Aucun résultat pour « {query} »
                </p>
              ) : isLoadingDefaults && searchResults === null ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted aspect-square animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {searchResults !== null && (
                    <p className="text-muted-foreground text-xs">
                      {searchTotal} résultat{searchTotal !== 1 ? "s" : ""}
                    </p>
                  )}
                  <PhotoGrid
                    photos={displayedPhotos}
                    selectedId={selectedUnsplashId}
                    onSelect={handleUnsplashSelect}
                  />
                  {searchResults === null && (
                    <p className="text-muted-foreground text-xs">
                      Photos Unsplash · tapez pour chercher
                    </p>
                  )}
                  {searchResults !== null && searchTotalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGoToPage(searchPage - 1)}
                        disabled={searchPage <= 1 || isLoadingMore}
                      >
                        ← Précédent
                      </Button>
                      <span className="text-muted-foreground text-xs">
                        {isLoadingMore ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          `${searchPage} / ${searchTotalPages}`
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGoToPage(searchPage + 1)}
                        disabled={searchPage >= searchTotalPages || isLoadingMore}
                      >
                        Suivant →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── Onglet Importer ── */}
            <TabsContent value="upload" className="mt-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadPreview ? (
                <div className="relative overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview}
                    alt="Aperçu"
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: 200 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFile(null);
                      setUploadPreview(null);
                      setPending(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                    aria-label="Supprimer l'aperçu"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border hover:border-primary/50 flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors"
                >
                  <Upload className="text-muted-foreground size-8" />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium">Cliquez pour importer</p>
                    <p className="text-muted-foreground text-xs">JPG, PNG ou WebP · max 5 Mo</p>
                  </div>
                </button>
              )}

              {uploadFile && !uploadPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Changer d'image
                </Button>
              )}

              {uploadError && (
                <p className="text-destructive text-sm">{uploadError}</p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-row items-center justify-between">
            {currentImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-muted-foreground"
              >
                Supprimer la couverture
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                disabled={!pending}
              >
                Appliquer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
