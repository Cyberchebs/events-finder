import type { EventItem } from "@/components/discover/EventCard";

type Props = {
  event: EventItem;
  onClick?: () => void;
};

export function CompactResultRow({ event, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 sm:p-3 transition-colors hover:border-line-2 cursor-pointer"
    >
      <div
        className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-lg shadow-inner"
        style={{ background: event.gradient }}
      />
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[13px] font-extrabold tracking-tight text-ink group-hover:text-brand transition-colors">
          {event.title}
        </h4>
        <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-3">
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
    </div>
  );
}

