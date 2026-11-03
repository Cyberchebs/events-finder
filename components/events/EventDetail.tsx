import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { StatusBadge } from "@/components/discover/StatusBadge";
import { EventPageAnalytics } from "@/components/events/EventPageAnalytics";
import { TicketTierSelector } from "@/components/events/TicketTierSelector";
import { getEventCardData, getEventCardGradient } from "@/lib/event-display";
import type { PublicEvent } from "@/types/events";

type Props = {
  event: PublicEvent;
  serverNow: string;
};

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export function EventDetail({ event, serverNow }: Props) {
  const presentation = getEventCardData(event, serverNow);
  const isPast = new Date(event.ends_at).getTime() <= new Date(serverNow).getTime();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar currentPath={`/e/${event.id}`} />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
        <Link
          className="mb-4 inline-flex text-[12px] font-bold text-ink-2 transition-colors hover:text-brand"
          href="/"
        >
          ← Back to Discover
        </Link>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className={`relative h-48 sm:h-64 md:h-80 ${getEventCardGradient(event.category)}`}>
            {event.image_url ? (
              <Image
                alt=""
                className="object-cover"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1000px"
                src={event.image_url}
                unoptimized
              />
            ) : null}
            {presentation.badge ? (
              <div className="absolute left-4 top-4">
                <StatusBadge status={presentation.badge} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-7 p-4 md:grid-cols-[minmax(0,1fr)_320px] md:p-7">
            <section>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
                {event.category}
              </p>
              <h1 className="mt-2 text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">
                {event.title}
              </h1>

              <div className="mt-5 space-y-3 text-[12.5px] font-semibold leading-5 text-ink-2">
                <p className="flex items-start gap-2">
                  <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>
                    {formatEventDate(event.starts_at)}
                    <span className="block text-[11px] font-medium text-ink-3">
                      Ends {formatEventDate(event.ends_at)}
                    </span>
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  {event.format === "online" ? (
                    <Video aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  ) : (
                    <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  )}
                  <span>
                    {event.format === "online" ? "Online event" : event.venue_address}
                    {event.format === "in_person" && event.city
                      ? ` · ${event.city}`
                      : ""}
                  </span>
                </p>
              </div>

              {event.description ? (
                <section className="mt-7 border-t border-border pt-5">
                  <h2 className="text-[16px] font-extrabold text-ink">About this event</h2>
                  <p className="mt-2 whitespace-pre-wrap text-[12.5px] font-medium leading-6 text-ink-2">
                    {event.description}
                  </p>
                </section>
              ) : null}
            </section>

            <aside className="h-fit rounded-xl border border-border bg-surface-2 p-4">
              <h2 className="text-[16px] font-extrabold text-ink">Tickets</h2>
              <TicketTierSelector
                eventId={event.id}
                isPast={isPast}
                tiers={event.ticket_types}
              />
            </aside>
          </div>
        </div>
      </main>
      <BottomTabBar currentTab="discover" />
      <EventPageAnalytics
        eventId={event.id}
        organizerId={event.organizer_id}
        isOnline={event.format === "online"}
      />
    </div>
  );
}
