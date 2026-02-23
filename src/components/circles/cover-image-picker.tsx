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
import type { CircleCategory, CoverImageAttribution } from "@/domain/models/circle";
import type { UnsplashPhoto } from "@/app/api/unsplash/search/route";
import { resizeImage } from "@/lib/image-resize";

// ── Types ─────────────────────────────────────────────────────

export type CoverSelection =
  | { type: "unsplash"; url: string; thumbUrl: string; attribution: CoverImageAttribution }
  | { type: "upload"; file: File; previewUrl: string }
  | { type: "remove" };

type Props = {
  circleName?: string;
  category?: CircleCategory | null;
  currentImage?: string | null;
  currentAttribution?: CoverImageAttribution | null;
  onSelect: (data: CoverSelection) => void;
};

// ── Photos curées par catégorie ────────────────────────────────

const CURATED_PHOTOS: Record<string, UnsplashPhoto[]> = {
  SPORT_WELLNESS: [
    {
      id: "curated-1",
      url: "https://images.unsplash.com/photo-1512412046876-f386342eddb3?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1512412046876-f386342eddb3?w=200&h=200&fit=crop",
      author: { name: "Victor Freitas", profileUrl: "https://unsplash.com/@victorfreitas" },
    },
    {
      id: "curated-2",
      url: "https://images.unsplash.com/photo-1639843091936-bb5fca7b5684?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1639843091936-bb5fca7b5684?w=200&h=200&fit=crop",
      author: { name: "Karsten Winegeart", profileUrl: "https://unsplash.com/@karsten116" },
    },
    {
      id: "curated-3",
      url: "https://images.unsplash.com/photo-1485727749690-d091e8284ef3?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1485727749690-d091e8284ef3?w=200&h=200&fit=crop",
      author: { name: "Jozsef Hocza", profileUrl: "https://unsplash.com/@hocza" },
    },
    {
      id: "curated-4",
      url: "https://images.unsplash.com/photo-1552984418-e47d59632489?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1552984418-e47d59632489?w=200&h=200&fit=crop",
      author: { name: "Nicolas Hoizey", profileUrl: "https://unsplash.com/@nhoizey" },
    },
  ],
  TECH: [
    {
      id: "curated-tech-1",
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop",
      author: { name: "Alexandre Debiève", profileUrl: "https://unsplash.com/@alexandre_d" },
    },
    {
      id: "curated-tech-2",
      url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=200&h=200&fit=crop",
      author: { name: "Luca Bravo", profileUrl: "https://unsplash.com/@lucabravo" },
    },
    {
      id: "curated-tech-3",
      url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200&h=200&fit=crop",
      author: { name: "Ilya Pavlov", profileUrl: "https://unsplash.com/@ilyapavlov" },
    },
    {
      id: "curated-tech-4",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=200&fit=crop",
      author: { name: "Markus Spiske", profileUrl: "https://unsplash.com/@markusspiske" },
    },
  ],
  DESIGN: [
    {
      id: "curated-design-1",
      url: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=200&h=200&fit=crop",
      author: { name: "Balázs Kétyi", profileUrl: "https://unsplash.com/@balazsketyi" },
    },
    {
      id: "curated-design-2",
      url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop",
      author: { name: "Oleg Laptev", profileUrl: "https://unsplash.com/@snowshade" },
    },
    {
      id: "curated-design-3",
      url: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=200&h=200&fit=crop",
      author: { name: "Amélie Mourichon", profileUrl: "https://unsplash.com/@amayli" },
    },
    {
      id: "curated-design-4",
      url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=200&h=200&fit=crop",
      author: { name: "Domenico Loia", profileUrl: "https://unsplash.com/@domenicoloia" },
    },
  ],
};

const DEFAULT_CURATED: UnsplashPhoto[] = [
  {
    id: "curated-default-1",
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=800&fit=crop",
    thumbUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=200&fit=crop",
    author: { name: "Chang Duong", profileUrl: "https://unsplash.com/@chang612" },
  },
  {
    id: "curated-default-2",
    url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=800&fit=crop",
    thumbUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=200&h=200&fit=crop",
    author: { name: "Antenna", profileUrl: "https://unsplash.com/@antenna" },
  },
  {
    id: "curated-default-3",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=800&fit=crop",
    thumbUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=200&fit=crop",
    author: { name: "Annie Spratt", profileUrl: "https://unsplash.com/@anniespratt" },
  },
  {
    id: "curated-default-4",
    url: "https://images.unsplash.com/photo-1543269664-76bc3997d9ea?w=800&h=800&fit=crop",
    thumbUrl: "https://images.unsplash.com/photo-1543269664-76bc3997d9ea?w=200&h=200&fit=crop",
    author: { name: "Priscilla Du Preez", profileUrl: "https://unsplash.com/@priscilladupreez" },
  },
];

function getCuratedPhotos(category: CircleCategory | null | undefined): UnsplashPhoto[] {
  if (category && CURATED_PHOTOS[category]) return CURATED_PHOTOS[category];
  return DEFAULT_CURATED;
}

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
    <div className="grid grid-cols-4 gap-2">
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
  category,
  currentImage,
  currentAttribution,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<CoverSelection | null>(null);

  // Unsplash search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UnsplashPhoto[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const gradient = getMomentGradient(circleName ?? "");
  const curated = getCuratedPhotos(category);

  const displayedPhotos = searchResults ?? curated;

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
      try {
        const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
          setSearchTotal(data.total);
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
    setOpen(false);
  }

  function handleRemove() {
    onSelect({ type: "remove" });
    setOpen(false);
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      // Reset state on close without applying
      setPending(null);
      setQuery("");
      setSearchResults(null);
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
        onClick={() => setOpen(true)}
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
        <DialogContent className="max-w-lg">
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

              {/* Résultats ou photos curées */}
              {searchResults !== null && searchResults.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Aucun résultat pour « {query} »
                </p>
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
                      Suggestions pour votre communauté — tapez pour chercher
                    </p>
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
