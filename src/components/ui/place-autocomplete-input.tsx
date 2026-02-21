"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceSuggestionItem } from "@/hooks/use-place-autocomplete";

type PlaceAutocompleteInputProps = {
  suggestions: PlaceSuggestionItem[];
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (suggestion: PlaceSuggestionItem) => void;
  onClear: () => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
};

export function PlaceAutocompleteInput({
  suggestions,
  isLoading,
  onQueryChange,
  onSelect,
  onClear,
  value,
  onChange,
  placeholder,
  id,
  name,
  className,
}: PlaceAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSuggestions = suggestions.length > 0;

  // Show dropdown when we have suggestions
  useEffect(() => {
    if (hasSuggestions) {
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [hasSuggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onClear();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClear]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);
      onQueryChange(val);
    },
    [onChange, onQueryChange]
  );

  const handleSelect = useCallback(
    (suggestion: PlaceSuggestionItem) => {
      onSelect(suggestion);
      setIsOpen(false);
      setActiveIndex(-1);
      // Keep focus on input
      inputRef.current?.focus();
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || !hasSuggestions) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSelect(suggestions[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          onClear();
          break;
      }
    },
    [isOpen, hasSuggestions, suggestions, activeIndex, handleSelect, onClear]
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const listboxId = id ? `${id}-listbox` : "place-listbox";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hasSuggestions) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            isLoading && "pr-8",
            className
          )}
        />
        {isLoading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {isOpen && hasSuggestions && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                // Prevent input blur
                e.preventDefault();
              }}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                index === activeIndex && "bg-accent text-accent-foreground"
              )}
            >
              <MapPin className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{suggestion.name}</p>
                {suggestion.fullAddress && (
                  <p className="text-muted-foreground truncate text-xs">
                    {suggestion.fullAddress}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
