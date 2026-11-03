import { MapPin, TicketCheck } from "lucide-react";
import type { TicketCardData } from "@/components/tickets/TicketCard";

type Props = {
  ticket: TicketCardData;
};

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export function UsedTicketRow({ ticket }: Props) {
  const location =
    ticket.event.format === "online"
      ? "Online event"
      : [ticket.event.venueAddress, ticket.event.city].filter(Boolean).join(", ") ||
        "Location shared by organizer";

  return (
    <article className="rounded-2xl border border-dashed border-line-2 bg-surface p-4 opacity-65">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
            {ticket.status === "used" ? "Used ticket" : "Voided ticket"}
          </p>
          <h2 className="mt-1 truncate text-[14px] font-bold text-ink">
            {ticket.event.title}
          </h2>
          <p className="mt-1 text-[11px] font-semibold text-ink-3">
            {ticket.tierName} · {formatEventDate(ticket.event.startsAt)}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] font-medium leading-4 text-ink-3">
            <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{location}</span>
          </p>
          {ticket.scannedAt ? (
            <p className="mt-2 text-[10.5px] font-semibold text-ink-3">
              Checked in {formatEventDate(ticket.scannedAt)}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
          <TicketCheck aria-hidden="true" className="mr-1 inline h-3 w-3" />
          {ticket.status === "used" ? "Used" : "Void"}
        </span>
      </div>
    </article>
  );
}
