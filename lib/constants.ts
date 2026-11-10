export const COMMISSION_RATE = 0.203;
export const RESERVATION_HOLD_MINUTES = 10;
export const MAX_TICKET_CARD_IMAGE_MB = 50;
export const MAX_ONBOARDING_IMAGE_BYTES = MAX_TICKET_CARD_IMAGE_MB * 1024 * 1024;
export const MAX_TICKETS_PER_ORDER = 10;

export const EVENT_CATEGORIES = [
  "Music & Concerts",
  "Comedy & Performing Arts",
  "Fan Culture & Conventions",
  "Gaming & Esports",
  "Festivals & Culture",
  "Food & Drink",
  "Parties & Nightlife",
  "Sports & Fitness",
  "Tech & Business",
  "Arts, Film & Fashion",
  "Workshops & Learning",
  "Family, Faith & Causes",
] as const;
