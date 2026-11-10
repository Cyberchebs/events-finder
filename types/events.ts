import type { Database } from "@/types/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type TicketTypeRow = Database["public"]["Tables"]["ticket_types"]["Row"];

export type PublicTicketTier = Pick<
  TicketTypeRow,
  "id" | "name" | "price_kobo" | "quantity_available" | "quantity_sold"
>;

export type PublicEvent = Pick<
  EventRow,
  | "id"
  | "title"
  | "description"
  | "image_url"
  | "category"
  | "city"
  | "format"
  | "venue_address"
  | "venue_latitude"
  | "venue_longitude"
  | "starts_at"
  | "ends_at"
  | "organizer_id"
> & {
  ticket_types: PublicTicketTier[];
};

export type PublicEventFeed = {
  events: PublicEvent[];
  serverNow: string;
};

export type EventCardData = PublicEvent & {
  badge: "live" | "free" | "sold-out" | null;
  countdownText: string | null;
  locationLabel: string;
};
