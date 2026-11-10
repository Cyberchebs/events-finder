"use client";

import { useQuery } from "@tanstack/react-query";
import type { PublicEvent, PublicEventFeed, PublicTicketTier } from "@/types/events";

type DiscoverResponse = {
  success: true;
  data: PublicEventFeed;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTicketTier(value: unknown): value is PublicTicketTier {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.price_kobo === "number" &&
    typeof value.quantity_available === "number" &&
    typeof value.quantity_sold === "number"
  );
}

function isPublicEvent(value: unknown): value is PublicEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    (typeof value.image_url === "string" || value.image_url === null) &&
    typeof value.category === "string" &&
    (typeof value.city === "string" || value.city === null) &&
    (value.format === "in_person" || value.format === "online") &&
    (typeof value.venue_address === "string" || value.venue_address === null) &&
    (typeof value.venue_latitude === "number" || value.venue_latitude === null) &&
    (typeof value.venue_longitude === "number" || value.venue_longitude === null) &&
    typeof value.starts_at === "string" &&
    typeof value.ends_at === "string" &&
    typeof value.organizer_id === "string" &&
    Array.isArray(value.ticket_types) &&
    value.ticket_types.every(isTicketTier)
  );
}

function isDiscoverResponse(value: unknown): value is DiscoverResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    isRecord(value.data) &&
    typeof value.data.serverNow === "string" &&
    Number.isFinite(Date.parse(value.data.serverNow)) &&
    Array.isArray(value.data.events) &&
    value.data.events.every(isPublicEvent)
  );
}

async function fetchPublishedEvents(): Promise<PublicEventFeed> {
  const response = await fetch("/api/events/discover");
  const payload: unknown = await response.json();

  if (!response.ok || !isDiscoverResponse(payload)) {
    throw new Error("Events could not be loaded.");
  }

  return payload.data;
}

export function usePublishedEvents(initialData: PublicEventFeed | null) {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: fetchPublishedEvents,
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData
      ? Date.parse(initialData.serverNow)
      : undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
