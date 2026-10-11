import { StatusBadge } from "@/components/discover/StatusBadge";

export type EventItem = {
  id: string;
  title: string;
  venue: string;
  city: string;
  category: string;
  gradient: string;
  badge?: "live" | "free" | "sold-out";
  countdownText?: string;
  isHappeningNow?: boolean;
};

type Props = {
  event: EventItem;
  onClick?: () => void;
};

export function EventCard({ event, onClick }: Props) {
  return (
    <article
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-150 hover:border-line-2 cursor-pointer shadow-sm hover:shadow"
    >
      <div
        className="relative h-28 sm:h-32 w-full transition-transform duration-200"
        style={{ background: event.gradient }}
      >
        {event.badge && (
          <div className="absolute left-3 top-3 z-10">
            <StatusBadge status={event.badge} />
          </div>
        )}
      </div>

      <div className="flex flex-col p-3 sm:p-3.5">
        <h3 className="text-sm font-semibold leading-5 text-ink transition-colors group-hover:text-brand">
          {event.title}
        </h3>
        <p className="mt-1 text-xs font-semibold text-ink-3">
          {event.isHappeningNow ? (
            <>
              <span className="text-live font-semibold">Happening now</span>
              <span> · {event.venue}</span>
            </>
          ) : event.countdownText ? (
            <>
              <span className="text-brand font-bold">{event.countdownText}</span>
              <span> · {event.venue}</span>
            </>
          ) : (
            <span>{event.venue}</span>
          )}
        </p>
      </div>
    </article>
  );
}

