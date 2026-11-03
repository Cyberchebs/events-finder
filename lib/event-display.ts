import type { EventCardData, PublicEvent } from "@/types/events";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const LAGOS_TIME_ZONE = "Africa/Lagos";

export function getEventCardData(
  event: PublicEvent,
  serverNow: string,
): EventCardData {
  const now = new Date(serverNow).getTime();
  const startsAt = new Date(event.starts_at).getTime();
  const endsAt = new Date(event.ends_at).getTime();
  const availableTiers = event.ticket_types.filter(
    (tier) => tier.quantity_sold < tier.quantity_available,
  );
  const isLive = startsAt <= now && endsAt > now;
  const isSoldOut = event.ticket_types.length > 0 && availableTiers.length === 0;
  const hasFreeTickets = availableTiers.some((tier) => tier.price_kobo === 0);

  let badge: EventCardData["badge"] = null;
  if (isLive) {
    badge = "live";
  } else if (isSoldOut) {
    badge = "sold-out";
  } else if (hasFreeTickets) {
    badge = "free";
  }

  const delta = startsAt - now;
  const countdownText =
    badge === null && delta > 0 ? getCountdownText(startsAt, now) : null;
  const locationLabel =
    event.format === "online"
      ? "Online"
      : [event.venue_address, event.city].filter(Boolean).join(" · ");

  return {
    ...event,
    badge,
    countdownText,
    locationLabel,
  };
}

export function getEventCardGradient(category: string): string {
  const categoryGradients: Record<string, string> = {
    Music: "bg-gradient-to-br from-tier-a-1 to-tier-a-2",
    Sports: "bg-gradient-to-br from-tier-b-1 to-tier-b-2",
    Comedy: "bg-gradient-to-br from-tier-c-1 to-tier-c-2",
    Nightlife: "bg-gradient-to-br from-tier-a-1 to-tier-a-2",
    Business: "bg-gradient-to-br from-tier-b-1 to-tier-b-2",
  };

  return categoryGradients[category] ?? "bg-gradient-to-br from-tier-a-1 to-tier-a-2";
}

function getCountdownText(startsAt: number, now: number): string {
  const daysUntilStart =
    getLagosCalendarDay(startsAt) - getLagosCalendarDay(now);
  if (daysUntilStart < 1) {
    return "Today";
  }
  if (daysUntilStart === 1) {
    return "Tomorrow";
  }
  if (daysUntilStart < 7) {
    return `In ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}`;
  }
  if (daysUntilStart < 35) {
    const weeks = Math.ceil(daysUntilStart / 7);
    return `In ${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  const months = Math.max(1, Math.ceil(daysUntilStart / 30));
  return `In ${months} month${months === 1 ? "" : "s"}`;
}

function getLagosCalendarDay(timestamp: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LAGOS_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(timestamp));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MILLISECONDS);
}
