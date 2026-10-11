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
    <div className="relative w-full">
      {/* Mobile view: unified pill search bar */}
      <div className="flex md:hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3 h-10 shadow-sm focus-within:ring-2 focus-within:ring-brand-line">
        <Search className="h-4 w-4 shrink-0 text-ink-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events"
          className="flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-ink-3 focus:outline-none"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="p-1 text-ink-2 hover:text-ink"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink shrink-0 hover:border-line-2 transition-colors"
              >
                <MapPin className="h-3 w-3 text-ink-2" />
                <span>{selectedCity}</span>
              </button>

              {isCityDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-36 rounded-xl border border-border bg-surface py-1 shadow-lg">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-3">
                    Select city
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
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Desktop view: separate search input and location dropdown */}
      <div className="hidden md:flex items-center gap-3 w-full">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 h-11 focus-within:ring-2 focus-within:ring-brand-line transition-all">
          <Search className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events"
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

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 h-11 min-w-[150px] text-[13px] font-medium text-ink hover:border-line-2 transition-colors"
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

