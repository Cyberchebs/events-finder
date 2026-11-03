import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel";
import { DashboardStatCards } from "@/components/dashboard/DashboardStatCards";
import { getOrganizerFunnel } from "@/lib/organizer-dashboard";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ event_id: string }>;
};

type GateCheckins = {
  label: string;
  scanned: number;
};

type EventDashboard = {
  id: string;
  title: string;
  status: "draft" | "published";
  starts_at: string;
  ends_at: string;
  tickets_sold: number;
  capacity: number;
  net_earnings_kobo: number;
  gate_checkins: GateCheckins[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDashboard(value: unknown): EventDashboard | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    (value.status !== "draft" && value.status !== "published") ||
    typeof value.starts_at !== "string" ||
    typeof value.ends_at !== "string" ||
    typeof value.tickets_sold !== "number" ||
    typeof value.capacity !== "number" ||
    typeof value.net_earnings_kobo !== "number" ||
    !Array.isArray(value.gate_checkins)
  ) {
    return null;
  }

  const gateCheckins: GateCheckins[] = [];
  for (const gate of value.gate_checkins) {
    if (
      !isRecord(gate) ||
      typeof gate.label !== "string" ||
      typeof gate.scanned !== "number"
    ) {
      return null;
    }
    gateCheckins.push({ label: gate.label, scanned: gate.scanned });
  }

  return {
    id: value.id,
    title: value.title,
    status: value.status,
    starts_at: value.starts_at,
    ends_at: value.ends_at,
    tickets_sold: value.tickets_sold,
    capacity: value.capacity,
    net_earnings_kobo: value.net_earnings_kobo,
    gate_checkins: gateCheckins,
  };
}

function formatNaira(amountKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

function formatEventDate(start: string, end: string): string {
  const format = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${format.format(new Date(start))} – ${format.format(new Date(end))}`;
}

export default async function EventDashboardPage({ params }: Props) {
  const { event_id: eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/${eventId}`)}`);
  }

  const { data, error } = await supabase.rpc("get_organizer_event_dashboard", {
    p_event_id: eventId,
  });
  if (error) {
    console.error("[dashboard/event] metrics query failed", error);
    throw new Error("Unable to load this event dashboard.");
  }
  if (data === null) {
    notFound();
  }
  const dashboard = parseDashboard(data);
  if (!dashboard) {
    console.error("[dashboard/event] metrics returned malformed data");
    throw new Error("Unable to load this event dashboard.");
  }

  const funnel = await getOrganizerFunnel([eventId]);
  const checkedIn = dashboard.gate_checkins.reduce((total, gate) => total + gate.scanned, 0);
  const conversion = funnel.available
    ? `${funnel.views ? ((funnel.purchases / funnel.views) * 100).toFixed(1) : "0.0"}%`
    : "—";

  return (
    <>
      <Navbar currentPath={`/dashboard/${eventId}`} />
      <div className="flex min-h-screen flex-col bg-background">
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
          <Link
            className="mb-5 inline-flex items-center gap-2 text-[12px] font-bold text-ink-2 hover:text-brand"
            href="/dashboard"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            All events
          </Link>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
                Event dashboard
              </p>
              <h1 className="mt-1 truncate text-[23px] font-extrabold tracking-tight text-ink">
                {dashboard.title}
              </h1>
              <p className="mt-1 text-[11px] font-semibold text-ink-3">
                {formatEventDate(dashboard.starts_at, dashboard.ends_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                  dashboard.status === "published"
                    ? "bg-ok-soft text-ok-ink"
                    : "bg-sunken text-ink-3"
                }`}
              >
                {dashboard.status === "published" ? "PUBLISHED" : "DRAFT"}
              </span>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
                href={`/dashboard/${eventId}/door-staff`}
              >
                Manage door staff
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <DashboardStatCards
              stats={[
                {
                  label: "Tickets sold",
                  value: dashboard.tickets_sold.toLocaleString("en-NG"),
                  detail: `of ${dashboard.capacity.toLocaleString("en-NG")} available`,
                },
                {
                  label: "Your earnings",
                  value: formatNaira(dashboard.net_earnings_kobo),
                  detail: "After 20.3% fee",
                },
                {
                  label: "Event visitors",
                  value: funnel.available ? funnel.views.toLocaleString("en-NG") : "—",
                  detail: funnel.available ? "Unique visitors · last 30 days" : "Analytics unavailable",
                },
                {
                  label: "Checkout conversion",
                  value: conversion,
                  detail: funnel.available ? "Visitors to purchases · last 30 days" : "Analytics unavailable",
                },
              ]}
            />

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <DashboardFunnel funnel={funnel} />
              <section className="rounded-2xl border border-border bg-surface p-4 md:p-6">
                <div>
                  <h2 className="text-[16px] font-extrabold text-ink">Gate check-ins</h2>
                  <p className="mt-1 text-[11px] font-semibold text-ink-3">
                    Scans grouped by door-staff gate
                  </p>
                </div>
                {dashboard.gate_checkins.length ? (
                  <>
                    <div className="mt-5 space-y-4">
                      {dashboard.gate_checkins.map((gate) => (
                        <div key={gate.label}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[12px] font-bold text-ink">{gate.label}</p>
                            <p className="shrink-0 text-[11px] font-extrabold tabular-nums text-ink-2">
                              {gate.scanned.toLocaleString("en-NG")} / {dashboard.tickets_sold.toLocaleString("en-NG")}
                            </p>
                          </div>
                          <div
                            aria-label={`${gate.scanned} of ${dashboard.tickets_sold} tickets checked in at ${gate.label}`}
                            className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"
                            role="img"
                          >
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{
                                width: `${dashboard.tickets_sold ? Math.min((gate.scanned / dashboard.tickets_sold) * 100, 100) : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[11px] font-semibold text-ink-3">
                      <Users aria-hidden="true" className="h-4 w-4" />
                      {checkedIn.toLocaleString("en-NG")} check-ins across {dashboard.gate_checkins.length} gates
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-xl bg-sunken px-4 py-8 text-center">
                    <Users aria-hidden="true" className="mx-auto h-5 w-5 text-ink-3" />
                    <p className="mt-2 text-[11px] font-semibold text-ink-3">
                      No ticket check-ins have been recorded yet.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
      <BottomTabBar currentTab="none" />
    </>
  );
}
