import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, Ticket } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel";
import { DashboardStatCards } from "@/components/dashboard/DashboardStatCards";
import { getOrganizerFunnel } from "@/lib/organizer-dashboard";
import { createClient } from "@/utils/supabase/server";

type DashboardEvent = {
  id: string;
  title: string;
  status: "draft" | "published";
  starts_at: string;
  tickets_sold: number;
  capacity: number;
};

type DashboardSummary = {
  authorized: boolean;
  tickets_sold: number;
  net_earnings_kobo: number;
  events: DashboardEvent[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSummary(value: unknown): DashboardSummary | null {
  if (
    !isRecord(value) ||
    typeof value.authorized !== "boolean" ||
    typeof value.tickets_sold !== "number" ||
    typeof value.net_earnings_kobo !== "number" ||
    !Array.isArray(value.events)
  ) {
    return null;
  }

  const events: DashboardEvent[] = [];
  for (const item of value.events) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      (item.status !== "draft" && item.status !== "published") ||
      typeof item.starts_at !== "string" ||
      typeof item.tickets_sold !== "number" ||
      typeof item.capacity !== "number"
    ) {
      return null;
    }
    events.push({
      id: item.id,
      title: item.title,
      status: item.status,
      starts_at: item.starts_at,
      tickets_sold: item.tickets_sold,
      capacity: item.capacity,
    });
  }

  return {
    authorized: value.authorized,
    tickets_sold: value.tickets_sold,
    net_earnings_kobo: value.net_earnings_kobo,
    events,
  };
}

function formatNaira(amountKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatConversion(views: number, purchases: number, available: boolean): string {
  if (!available) {
    return "—";
  }
  return `${views ? ((purchases / views) * 100).toFixed(1) : "0.0"}%`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=%2Fdashboard");
  }

  const { data, error } = await supabase.rpc("get_organizer_dashboard_summary");
  if (error) {
    console.error("[dashboard] summary query failed", error);
    throw new Error("Unable to load your organizer dashboard.");
  }
  const summary = parseSummary(data);
  if (!summary) {
    console.error("[dashboard] summary returned malformed data");
    throw new Error("Unable to load your organizer dashboard.");
  }
  if (!summary.authorized) {
    redirect("/profile");
  }

  const funnel = await getOrganizerFunnel(summary.events.map((event) => event.id));
  const eventVisitorLabel = funnel.available
    ? funnel.views.toLocaleString("en-NG")
    : "—";
  const conversion = formatConversion(funnel.views, funnel.purchases, funnel.available);
  const eventSales = new Map(
    summary.events.map((event) => [event.id, event.tickets_sold] as const),
  );

  return (
    <>
      <Navbar currentPath="/dashboard" />
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
              href="/onboarding/event?new=1"
            >
              Create event
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-6">
            <DashboardStatCards
              stats={[
                {
                  label: "Tickets sold",
                  value: summary.tickets_sold.toLocaleString("en-NG"),
                  detail: "Across all your events",
                },
                {
                  label: "Your earnings",
                  value: formatNaira(summary.net_earnings_kobo),
                  detail: "After 20.3% fee",
                },
                {
                  label: "Event visitors",
                  value: eventVisitorLabel,
                  detail: funnel.available ? "Unique visitors · last 30 days" : "Analytics unavailable",
                },
                {
                  label: "Checkout conversion",
                  value: conversion,
                  detail: funnel.available ? "Visitors to purchases · last 30 days" : "Analytics unavailable",
                },
              ]}
            />

            <DashboardFunnel funnel={funnel} />

            <section className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-4 md:px-5">
                <h2 className="text-[16px] font-extrabold text-ink">Your events</h2>
                <p className="mt-1 text-[11px] font-semibold text-ink-3">
                  Published events and drafts in progress
                </p>
              </div>
              {summary.events.length ? (
                <ul className="divide-y divide-border">
                  {summary.events.map((event) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5"
                      key={event.id}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <CalendarDays aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink">{event.title}</p>
                          <p className="mt-1 text-[10.5px] font-semibold text-ink-3">
                            {formatEventDate(event.starts_at)}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink-2">
                            <Ticket aria-hidden="true" className="h-3.5 w-3.5" />
                            {(eventSales.get(event.id) ?? 0).toLocaleString("en-NG")} tickets sold
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                            event.status === "published"
                              ? "bg-ok-soft text-ok-ink"
                              : "bg-sunken text-ink-3"
                          }`}
                        >
                          {event.status === "published" ? "PUBLISHED" : "DRAFT"}
                        </span>
                        <Link
                          className="inline-flex h-9 items-center rounded-md px-3 text-[11px] font-bold text-brand hover:bg-brand-soft"
                          href={
                            event.status === "published"
                              ? `/dashboard/${event.id}`
                              : `/onboarding/event?eventId=${encodeURIComponent(event.id)}`
                          }
                        >
                          {event.status === "published" ? "View dashboard" : "Continue setup"}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-12 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-ink-3">
                    <CalendarDays aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-[13px] font-bold text-ink-2">No events yet</p>
                  <p className="mt-1 text-[11px] font-semibold text-ink-3">
                    Create your first event to start selling tickets.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <BottomTabBar currentTab="none" />
    </>
  );
}
