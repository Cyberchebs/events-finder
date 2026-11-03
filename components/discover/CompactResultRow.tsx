import Image from "next/image";
import Link from "next/link";
import { getEventCardGradient } from "@/lib/event-display";
import type { EventCardData } from "@/types/events";

type Props = {
  event: EventCardData;
};

export function CompactResultRow({ event }: Props) {
  return (
    <Link
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 transition-colors hover:border-line-2 sm:p-3"
      href={`/e/${event.id}`}
    >
      <div
        className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg sm:h-11 sm:w-11 ${getEventCardGradient(event.category)}`}
      >
        {event.image_url ? (
          <Image alt="" className="object-cover" fill sizes="44px" src={event.image_url} unoptimized />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[13px] font-extrabold tracking-tight text-ink group-hover:text-brand transition-colors">
          {event.title}
        </h4>
        <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-3">
          {event.badge === "live" ? (
            <span className="font-semibold text-live">Happening now · </span>
          ) : event.countdownText ? (
            <span className="font-bold text-brand">{event.countdownText} · </span>
          ) : null}
          <span>{event.locationLabel}</span>
        </p>
      </div>
    </Link>
  );
}
