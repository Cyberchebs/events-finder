"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LoaderCircle, MapPin, X } from "lucide-react";
import { parseGeoapifyLocation, type NigeriaLocation } from "@/lib/locations";

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onPlaceSelect?: (place: NigeriaLocation | null) => void;
  selectedPlace?: NigeriaLocation | null;
  selectionRequired?: boolean;
};

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

export function LocationAutocomplete({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  onPlaceSelect,
  selectedPlace = null,
  selectionRequired = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<NigeriaLocation[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const query = value.trim();
  const isLocationSelected =
    selectedLabel === query || selectedPlace?.label === query;
  const visibleSuggestions = isLocationSelected || query.length < 3
    ? []
    : suggestions;
  const visibleError = errorMessage ??
    (!GEOAPIFY_API_KEY && query.length >= 3 && !isLocationSelected
      ? "Location suggestions are not configured yet. Please try again later."
      : null);

  useEffect(() => {
    const query = value.trim();
    if (
      query.length < 3 ||
      selectedLabel === query ||
      selectedPlace?.label === query ||
      !GEOAPIFY_API_KEY
    ) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
        url.searchParams.set("text", query);
        url.searchParams.set("filter", "countrycode:ng");
        url.searchParams.set("lang", "en");
        url.searchParams.set("limit", "5");
        url.searchParams.set("format", "json");
        url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Geoapify returned ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("results" in payload) ||
          !Array.isArray(payload.results)
        ) {
          throw new Error("Geoapify returned an unexpected response.");
        }

        const places = payload.results
          .map(parseGeoapifyLocation)
          .filter((place): place is NigeriaLocation => place !== null);
        setSuggestions(places);
        setActiveIndex(-1);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[LocationAutocomplete] location search failed", error);
        setSuggestions([]);
        setErrorMessage("Location suggestions could not be loaded. Try again.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedLabel, selectedPlace, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choosePlace(place: NigeriaLocation) {
    setSelectedLabel(place.label);
    onValueChange(place.label);
    onPlaceSelect?.(place);
    setSuggestions([]);
    setIsFocused(false);
    setActiveIndex(-1);
    setErrorMessage(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsFocused(false);
      return;
    }
    if (suggestions.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choosePlace(suggestions[activeIndex]);
    }
  }

  const listboxId = `${id}-suggestions`;

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-brand-line">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
        <input
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isFocused && suggestions.length > 0}
          aria-label={label}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-ink-3 focus:outline-none"
          id={id}
          onChange={(event) => {
            setSelectedLabel(null);
            onValueChange(event.target.value);
            onPlaceSelect?.(null);
            setIsLoading(false);
            setSuggestions([]);
            setErrorMessage(null);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          type="search"
          value={value}
        />
        {isLoading && !isLocationSelected ? (
          <LoaderCircle aria-label="Searching locations" className="h-4 w-4 shrink-0 animate-spin text-ink-3" />
        ) : value ? (
          <button
            aria-label={`Clear ${label.toLocaleLowerCase()}`}
            className="p-1 text-ink-3 transition-colors hover:text-ink"
            onClick={() => {
              setSelectedLabel(null);
              onValueChange("");
              onPlaceSelect?.(null);
              setIsLoading(false);
              setSuggestions([]);
              setErrorMessage(null);
            }}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isFocused && visibleSuggestions.length > 0 ? (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
          id={listboxId}
          role="listbox"
        >
          {visibleSuggestions.map((place, index) => (
            <li key={`${place.latitude}:${place.longitude}:${place.label}`}>
              <button
                aria-selected={activeIndex === index}
                className={`w-full px-3 py-2.5 text-left text-[12px] font-semibold transition-colors ${
                  activeIndex === index
                    ? "bg-brand-soft text-brand"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
                id={`${listboxId}-${index}`}
                onClick={() => choosePlace(place)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {isFocused && visibleError ? (
        <p className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border bg-surface p-3 text-[11px] font-medium text-ink-2 shadow-lg" role="status">
          {visibleError}
        </p>
      ) : null}

      {isFocused &&
      !isLoading &&
      !visibleError &&
      value.trim().length >= 3 &&
      visibleSuggestions.length === 0 ? (
        <p className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border bg-surface p-3 text-[11px] font-medium text-ink-3 shadow-lg" role="status">
          No matching Nigerian locations found.
        </p>
      ) : null}

      {selectionRequired && value && !selectedPlace ? (
        <p className="mt-1 text-[10px] font-medium leading-4 text-ink-3">
          Choose a Nigerian place from the suggestions to verify the venue.
        </p>
      ) : null}
    </div>
  );
}
