"use client";

import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
import posthog from "posthog-js";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import {
  EventCard,
  type EventItem,
} from "@/components/discover/EventCard";
import { CompactResultRow } from "@/components/discover/CompactResultRow";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";
import { CategoryChips } from "@/components/discover/CategoryChips";
import { CategorySidebar } from "@/components/discover/CategorySidebar";
import { EmptyState } from "@/components/discover/EmptyState";

const MOCK_EVENTS: EventItem[] = [
  {
    id: "1",
    title: "Founders meetup",
    venue: "Yaba",
    city: "Lagos",
    category: "Business",
    gradient: "linear-gradient(135deg, #7c2d12 0%, #451a03 100%)",
    badge: "live",
    isHappeningNow: true,
  },
  {
    id: "2",
    title: "Community open mic",
    venue: "Surulere",
    city: "Lagos",
    category: "Comedy",
    gradient: "linear-gradient(135deg, #0f766e 0%, #042f2e 100%)",
    badge: "free",
    countdownText: "In 4 days",
  },
  {
    id: "3",
    title: "Afrobeat night",
    venue: "Landmark Beach",
    city: "Lagos",
    category: "Music",
    gradient: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
    countdownText: "In 2 weeks",
  },
  {
    id: "4",
    title: "Comedy jam",
    venue: "Terra Kulture",
    city: "Lagos",
    category: "Comedy",
    gradient: "linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)",
    countdownText: "In 3 weeks",
  },
  {
    id: "5",
    title: "Startup demo day",
    venue: "Ikeja",
    city: "Lagos",
    category: "Business",
    gradient: "linear-gradient(135deg, #0f766e 0%, #042f2e 100%)",
    countdownText: "In 1 month",
  },
  {
    id: "6",
    title: "Amapiano rooftop",
    venue: "Victoria Island",
    city: "Lagos",
    category: "Nightlife",
    gradient: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
    countdownText: "In 6 weeks",
  },
  {
    id: "7",
    title: "Afrobeat brunch",
    venue: "Ikoyi",
    city: "Lagos",
    category: "Nightlife",
    gradient: "linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)",
    countdownText: "In 1 month",
  },
  {
    id: "8",
    title: "Afrobeat & amapiano",
    venue: "Lekki",
    city: "Lagos",
    category: "Music",
    gradient: "linear-gradient(135deg, #047857 0%, #064e3b 100%)",
    countdownText: "In 6 weeks",
  },
];

const AVAILABLE_CITIES = ["Lagos", "Abuja", "Jos", "All"];
const CATEGORY_NAMES = ["All", "Music", "Nightlife", "Comedy", "Sports", "Business"];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCity, setSelectedCity] = useState("Lagos");

  const handleCategorySelection = (category: string) => {
    if (category !== selectedCategory) {
      posthog.capture("category_filter_selected", { category });
      setSelectedCategory(category);
    }
  };

  const handleCitySelection = (city: string) => {
    if (city !== selectedCity) {
      posthog.capture("city_filter_selected", { city });
      setSelectedCity(city);
    }
  };

  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => {
      // City filter
      if (selectedCity !== "All" && event.city !== selectedCity) {
        return false;
      }

      // Category filter
      if (
        selectedCategory !== "All" &&
        selectedCategory !== "All events" &&
        event.category !== selectedCategory
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesVenue = event.venue.toLowerCase().includes(query);
        const matchesCategory = event.category.toLowerCase().includes(query);
        return matchesTitle || matchesVenue || matchesCategory;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedCity]);

  const handleResetFilters = () => {
    handleCitySelection("Lagos");
    handleCategorySelection("All");
    setSearchQuery("");
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background text-ink flex flex-col">
      {/* Desktop Top Navbar */}
      <Navbar currentPath="/" />

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-4 md:py-6 pb-24 md:pb-12">
        {/* Mobile Header: Discover title + Bell notification button */}
        <div className="flex md:hidden items-center justify-between mb-3.5">
          <h1 className="text-[20px] font-extrabold tracking-tight text-ink">
            Discover
          </h1>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-2 hover:text-ink transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile Search and Category Chips bar */}
        <div className="block md:hidden space-y-3 mb-4">
          <DiscoverSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCity={selectedCity}
            onCityChange={handleCitySelection}
            availableCities={AVAILABLE_CITIES}
          />
          <CategoryChips
            categories={CATEGORY_NAMES}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelection}
          />
        </div>

        {/* Desktop Layout: Left Sidebar + Right Main Content */}
        <div className="flex gap-8">
          {/* Desktop Left Category Sidebar */}
          <div className="hidden md:block">
            <CategorySidebar
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelection}
            />
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Desktop Top Search and Location Row */}
            <div className="hidden md:block mb-6">
              <DiscoverSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCity={selectedCity}
                onCityChange={handleCitySelection}
                availableCities={AVAILABLE_CITIES}
              />
            </div>

            {/* Results Header or Count info */}
            {isSearchActive && filteredEvents.length > 0 && (
              <div className="mb-3 text-[11.5px] font-semibold text-ink-3">
                {filteredEvents.length} result
                {filteredEvents.length === 1 ? "" : "s"} in {selectedCity}
              </div>
            )}

            {/* Content view handling: Empty vs Dense Search Rows vs Grid */}
            {filteredEvents.length === 0 ? (
              <EmptyState
                cityName={selectedCity === "All" ? "any location" : selectedCity}
                onReset={handleResetFilters}
              />
            ) : isSearchActive ? (
              /* Compact search results view (per 02-discover.png center screen) */
              <div className="space-y-2.5 max-w-xl">
                {filteredEvents.map((event) => (
                  <CompactResultRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              /* Rich event cards grid (per 02-discover.png left screen & 12-desktop.png) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <BottomTabBar currentTab="discover" />
    </div>
  );
}