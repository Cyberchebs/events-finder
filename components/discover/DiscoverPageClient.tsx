"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { EventCard } from "@/components/discover/EventCard";
import { CompactResultRow } from "@/components/discover/CompactResultRow";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";
import { CategoryChips } from "@/components/discover/CategoryChips";
import { EmptyState } from "@/components/discover/EmptyState";
import { usePublishedEvents } from "@/components/discover/usePublishedEvents";
import { EVENT_CATEGORIES, EVENT_CITIES } from "@/lib/constants";
import { getEventCardData } from "@/lib/event-display";
import type { PublicEventFeed } from "@/types/events";

type Props = {
  initialFeed: PublicEventFeed | null;
};

const AVAILABLE_CITIES = [...EVENT_CITIES, "All"];
const CATEGORY_NAMES = ["All", ...EVENT_CATEGORIES];

export function DiscoverPageClient({ initialFeed }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCity, setSelectedCity] = useState("Lagos");
  const { data, error, isPending, refetch } = usePublishedEvents(initialFeed);

  const filteredEvents = useMemo(() => {
    if (!data) {
      return [];
    }
    const query = searchQuery.trim().toLocaleLowerCase();

    return data.events
      .filter((event) => {
        if (selectedCity !== "All" && event.city !== selectedCity) {
          return false;
        }
        if (selectedCategory !== "All" && event.category !== selectedCategory) {
          return false;
        }
        if (!query) {
          return true;
        }

        return [
          event.title,
          event.description ?? "",
          event.venue_address ?? "",
          event.city ?? "",
          event.category,
        ].some((field) => field.toLocaleLowerCase().includes(query));
      })
      .map((event) => getEventCardData(event, data.serverNow));
  }, [data, searchQuery, selectedCategory, selectedCity]);

  const handleCategorySelection = (category: string) => {
    if (category !== selectedCategory) {
      setSelectedCategory(category);
    }
  };

  const handleCitySelection = (city: string) => {
    if (city !== selectedCity) {
      setSelectedCity(city);
    }
  };

  const handleResetFilters = () => {
    handleCitySelection("Lagos");
    handleCategorySelection("All");
    setSearchQuery("");
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background text-ink">
      <Navbar currentPath="/" />

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
        <header className="mb-5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink-3 md:text-[10px]">
            Good times are closer than you think
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink md:text-[24px]">
            <span className="md:hidden">Find your good time.</span>
            <span className="hidden md:inline">Your city. Your people. Your next plan.</span>
          </h1>
          <p className="mt-1 text-[12px] font-medium text-ink-2 md:text-[13px]">
            Discover unforgettable experiences, from the Island to the Mainland.
          </p>
        </header>

        <div className="mb-5 space-y-3">
          <DiscoverSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCity={selectedCity}
            onCityChange={handleCitySelection}
            availableCities={AVAILABLE_CITIES}
          />
          <div className="md:pt-1">
            <CategoryChips
              categories={CATEGORY_NAMES}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelection}
            />
          </div>
        </div>

        <section>
          {!isSearchActive && !isPending && !error ? (
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-extrabold tracking-tight text-ink md:text-[19px]">
                Events around {selectedCity === "All" ? "you" : selectedCity}
              </h2>
              <span className="text-[11px] font-bold text-brand">
                {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
          ) : null}

          {isPending ? (
            <p className="py-12 text-center text-[12.5px] font-semibold text-ink-3" role="status">
              Loading events…
            </p>
          ) : error ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
              <p className="text-[13px] font-semibold text-ink-2" role="alert">
                Events could not be loaded. Check your connection and try again.
              </p>
              <button
                className="rounded-lg border border-line-2 bg-surface px-4 py-2 text-[12px] font-bold text-ink transition-colors hover:bg-surface-2"
                onClick={() => void refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              cityName={selectedCity === "All" ? "any location" : selectedCity}
              onReset={handleResetFilters}
            />
          ) : isSearchActive ? (
            <>
              <p className="mb-3 text-[11.5px] font-semibold text-ink-3">
                {filteredEvents.length} result
                {filteredEvents.length === 1 ? "" : "s"} in{" "}
                {selectedCity === "All" ? "all locations" : selectedCity}
              </p>
              <div className="max-w-3xl space-y-2.5">
                {filteredEvents.map((event) => (
                  <CompactResultRow event={event} key={event.id} />
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomTabBar currentTab="discover" />
    </div>
  );
}
