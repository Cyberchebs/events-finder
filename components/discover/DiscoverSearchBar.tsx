"use client";

import { useState, useRef, useEffect } from "react";
import { Search, MapPin, X, ChevronDown } from "lucide-react";

type Props = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  availableCities: string[];
};

export function DiscoverSearchBar({
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  availableCities,
}: Props) {
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              aria-expanded={isCityDropdownOpen}
              className="flex items-center gap-1.5 text-[11px] font-bold text-ink-2 transition-colors hover:text-ink"
              onClick={() => setIsCityDropdownOpen((open) => !open)}
              type="button"
            >
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand" />
              {selectedCity === "All" ? "All locations" : `${selectedCity}, Nigeria`}
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-ink-3" />
            </button>
            {isCityDropdownOpen ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-40 rounded-xl border border-border bg-surface py-1 shadow-lg">
                {availableCities.map((city) => (
                  <button
                    className={`flex w-full px-3 py-2 text-left text-xs transition-colors ${
                      selectedCity === city
                        ? "bg-brand-soft font-bold text-brand"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                    }`}
                    key={city}
                    onClick={() => {
                      onCityChange(city);
                      setIsCityDropdownOpen(false);
                    }}
                    type="button"
                  >
                    {city === "All" ? "All locations" : `${city}, Nigeria`}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-brand-line">
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
      </div>

      <div className="hidden md:flex items-center gap-3 w-full">
        <div className="flex h-10 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 transition-all focus-within:ring-2 focus-within:ring-brand-line">
          <Search className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            aria-label="Search events, artists or venues"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, artists or venues"
            className="w-full bg-transparent text-[13px] font-medium text-ink placeholder:text-ink-3 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-ink-3 hover:text-ink p-1"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            className="flex h-10 min-w-[150px] items-center justify-between gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-line-2"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-ink-2" />
              <span>{selectedCity === "All" ? "All Locations" : `${selectedCity}, NG`}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-ink-3" />
          </button>

          {isCityDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-border bg-surface py-1.5 shadow-lg">
              <div className="px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-3">
                City / Location
              </div>
              {availableCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    onCityChange(city);
                    setIsCityDropdownOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-xs transition-colors text-left ${
                    selectedCity === city
                      ? "bg-brand-soft font-bold text-brand"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {city === "All" ? "All Locations" : `${city}, NG`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
