export const COMMISSION_RATE = 0.203;
export const RESERVATION_HOLD_MINUTES = 10;
export const MAX_TICKET_CARD_IMAGE_MB = 50;
export const MAX_ONBOARDING_IMAGE_BYTES = MAX_TICKET_CARD_IMAGE_MB * 1024 * 1024;
export const MAX_TICKETS_PER_ORDER = 10;

export const EVENT_CATEGORIES = [
  "Music",
  "Sports",
  "Comedy",
  "Nightlife",
  "Business",
] as const;

export const EVENT_CITIES = ["Lagos", "Abuja", "Jos"] as const;
