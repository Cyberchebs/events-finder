import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { PublicEvent, PublicEventFeed } from "@/types/events";

const publicEventSelection =
  "id, title, description, image_url, category, city, format, venue_address, venue_latitude, venue_longitude, starts_at, ends_at, organizer_id, ticket_types(id, name, price_kobo, quantity_available, quantity_sold)";

export async function getPublishedEvents(): Promise<PublicEventFeed> {
  const supabase = await createClient();
  const serverNow = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(publicEventSelection)
    .eq("status", "published")
    .gte("ends_at", serverNow)
    .order("starts_at", { ascending: true });

  if (error) {
    throw error;
  }

  return {
    events: data ?? [],
    serverNow,
  };
}

export async function getPublishedEvent(
  eventId: string,
): Promise<PublicEvent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(publicEventSelection)
    .eq("id", eventId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
