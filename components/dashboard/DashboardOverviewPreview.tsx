"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Pencil, Ticket } from "lucide-react";
import { PHASE_FIVE_PREVIEW_EVENT, PHASE_FIVE_PREVIEW_EVENT_ID } from "@/lib/phase-five-preview";
import { DashboardStatCards } from "@/components/dashboard/DashboardStatCards";

type EventRow = {
  id: string;
  title: string;
  date: string;
  tickets: number;
  status: "Published" | "Draft";
};

const initialEvents: EventRow[] = [
  {
    id: PHASE_FIVE_PREVIEW_EVENT_ID,
    title: PHASE_FIVE_PREVIEW_EVENT.title,
    date: PHASE_FIVE_PREVIEW_EVENT.date,
    tickets: 128,
    status: "Published",
  },
  {
    id: "00000000-0000-4000-8000-000000000018",
    title: "Sunday Rooftop Sessions",
    date: "Sunday, 8 November · 4:00 PM",
    tickets: 0,
    status: "Draft",
  },
];

export function DashboardOverviewPreview() {
  const [events, setEvents] = useState(initialEvents);
  const [notice, setNotice] = useState("");

  function togglePublished(eventId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? { ...event, status: event.status === "Published" ? "Draft" : "Published" }
          : event,
      ),
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
              Organizer workspace
            </p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">
              Your dashboard
            </h1>
            <p className="mt-1 text-[12px] font-medium text-ink-3">
              Track sales and keep your events moving.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
            href="/onboarding/event"
          >
            Create event
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-6">
          <DashboardStatCards
            stats={[
              { label: "Tickets sold", value: "248", detail: "Across all your events" },
              { label: "Your earnings", value: "₦1,486,000", detail: "After 20.3% fee" },
              { label: "Event visitors", value: "1,290", detail: "Across all your events" },
              { label: "Checkout conversion", value: "10.5%", detail: "Visitors to paid tickets" },
            ]}
          />

          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
              <div>
                <h2 className="text-[16px] font-extrabold text-ink">Your events</h2>
                <p className="mt-1 text-[11px] font-semibold text-ink-3">
                  Published events and drafts in progress
                </p>
              </div>
              <span className="rounded-full bg-sunken px-2.5 py-1 text-[10px] font-extrabold text-ink-3">
                SAMPLE DATA
              </span>
            </div>
            {notice ? (
              <p aria-live="polite" className="border-b border-border bg-sunken px-4 py-2.5 text-[11px] font-semibold text-ink-2">
                {notice}
              </p>
            ) : null}
            <ul className="divide-y divide-border">
              {events.map((event) => (
                <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5" key={event.id}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink">{event.title}</p>
                      <p className="mt-1 text-[10.5px] font-semibold text-ink-3">{event.date}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink-2">
                        <Ticket aria-hidden="true" className="h-3.5 w-3.5" />
                        {event.tickets} tickets sold
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                        event.status === "Published"
                          ? "bg-ok-soft text-ok-ink"
                          : "bg-sunken text-ink-3"
                      }`}
                    >
                      {event.status}
                    </span>
                    <button
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[11px] font-bold text-ink hover:bg-surface-2"
                      onClick={() => setNotice(`Edit preview selected for “${event.title}”.`)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      className="h-9 rounded-md border border-line-2 bg-surface px-3 text-[11px] font-bold text-ink-2 hover:bg-surface-2"
                      onClick={() => togglePublished(event.id)}
                      type="button"
                    >
                      {event.status === "Published" ? "Unpublish" : "Publish"}
                    </button>
                    {event.status === "Published" ? (
                      <Link
                        className="inline-flex h-9 items-center rounded-md px-3 text-[11px] font-bold text-brand hover:bg-brand-soft"
                        href={`/dashboard/${event.id}`}
                      >
                        View dashboard
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex h-9 items-center rounded-md px-3 text-[11px] font-bold text-brand hover:bg-brand-soft"
                        href="/onboarding/event"
                      >
                        Continue setup
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="px-4 pb-4 text-[10.5px] font-semibold text-ink-3 md:px-5">
              Preview only — event actions and dashboard figures are not connected to saved data.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
