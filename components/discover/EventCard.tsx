import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/discover/StatusBadge";
import { getEventCardGradient } from "@/lib/event-display";
import type { EventCardData } from "@/types/events";

type Props = {
  event: EventCardData;
};

export function EventCard({ event }: Props) {
  const availableTiers = event.ticket_types.filter(
    (tier) => tier.quantity_sold < tier.quantity_available,
  );
  const lowestPrice = availableTiers.length
    ? Math.min(...availableTiers.map((tier) => tier.price_kobo))
    : null;
  const priceLabel =
    event.badge === "sold-out"
      ? "Sold out"
      : lowestPrice === null
        ? "Tickets unavailable"
      : lowestPrice === 0
        ? "Free entry"
        : `From ${new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(lowestPrice / 100)}`;
  const dateLabel = new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(event.starts_at));

  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-colors hover:border-line-2"
      href={`/e/${event.id}`}
    >
      <article className="flex h-full flex-col">
        <div className={`relative h-40 w-full sm:h-44 ${getEventCardGradient(event.category)}`}>
          {event.image_url ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              src={event.image_url}
              unoptimized
            />
          ) : null}
          {event.badge ? (
            <div className="absolute left-3 top-3 z-10">
              <StatusBadge status={event.badge} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand">
            {dateLabel}{event.countdownText ? ` · ${event.countdownText}` : ""}
          </p>
          <h3 className="mt-2 text-[16px] font-extrabold leading-5 text-ink transition-colors group-hover:text-brand">
            {event.title}
          </h3>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold leading-4 text-ink-3">
            <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{event.locationLabel}</span>
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-[12px] font-extrabold text-ink">{priceLabel}</span>
            <span className="text-[11px] font-bold text-brand transition-colors group-hover:text-ink">
              View event →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
