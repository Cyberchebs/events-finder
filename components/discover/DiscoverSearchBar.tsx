"use client";

import { Search, X } from "lucide-react";
import { LocationAutocomplete } from "@/components/location/LocationAutocomplete";

type Props = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locationQuery: string;
  onLocationChange: (location: string) => void;
};

export function DiscoverSearchBar({
  searchQuery,
  onSearchChange,
  locationQuery,
  onLocationChange,
}: Props) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.9fr)]">
      <div className="order-2 flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-brand-line md:order-1 md:rounded-lg md:px-3.5">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-3" />
        <input
          aria-label="Search events, artists or venues"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-ink-3 focus:outline-none"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search events, artists or venues"
          type="search"
          value={searchQuery}
        />
        {searchQuery ? (
          <button
            aria-label="Clear search"
            className="p-1 text-ink-2 hover:text-ink"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="relative order-1 min-w-0 md:order-2">
        <LocationAutocomplete
          id="discover-location"
          label="Search Nigerian locations"
          onValueChange={onLocationChange}
          placeholder="Search any location in Nigeria"
          value={locationQuery}
        />
      </div>
    </div>
  );
}
