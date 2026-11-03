import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Users } from "lucide-react";
import { PHASE_FIVE_PREVIEW_EVENT } from "@/lib/phase-five-preview";
import { DashboardFunnelPreview } from "@/components/dashboard/DashboardFunnelPreview";
import { DashboardStatCards } from "@/components/dashboard/DashboardStatCards";

type Props = {
  eventId: string;
};

const gateScans = [
  { label: "North entrance", scanned: 76, total: 92 },
  { label: "Courtyard gate", scanned: 34, total: 36 },
];

export function EventDashboardPreview({ eventId }: Props) {
  return (
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
              {PHASE_FIVE_PREVIEW_EVENT.title}
            </h1>
            <p className="mt-1 text-[11px] font-semibold text-ink-3">
              {PHASE_FIVE_PREVIEW_EVENT.date} · {PHASE_FIVE_PREVIEW_EVENT.location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[10px] font-extrabold text-ok-ink">
              PUBLISHED
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
              { label: "Tickets sold", value: "128", detail: "of 240 available" },
              { label: "Your earnings", value: "₦746,880", detail: "After 20.3% fee" },
              { label: "Event visitors", value: "482", detail: "Since publishing" },
              { label: "Checkout conversion", value: "26.6%", detail: "Visitors to paid tickets" },
            ]}
          />

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <DashboardFunnelPreview />

            <section className="rounded-2xl border border-border bg-surface p-4 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-extrabold text-ink">Gate check-ins</h2>
                  <p className="mt-1 text-[11px] font-semibold text-ink-3">
                    Scans grouped by door-staff gate
                  </p>
                </div>
                <span className="rounded-full bg-sunken px-2.5 py-1 text-[10px] font-extrabold text-ink-3">
                  SAMPLE DATA
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {gateScans.map((gate) => (
                  <div key={gate.label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12px] font-bold text-ink">{gate.label}</p>
                      <p className="shrink-0 text-[11px] font-extrabold tabular-nums text-ink-2">
                        {gate.scanned} / {gate.total}
                      </p>
                    </div>
                    <div
                      aria-label={`${gate.scanned} of ${gate.total} tickets scanned at ${gate.label}`}
                      className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"
                      role="img"
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(gate.scanned / gate.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[11px] font-semibold text-ink-3">
                <Users aria-hidden="true" className="h-4 w-4" />
                110 check-ins across 2 gates
              </div>
            </section>
          </div>
          <p className="text-[10.5px] font-semibold text-ink-3">
            Preview only — dashboard figures are sample data, not live sales or check-ins.
          </p>
        </div>
      </main>
    </div>
  );
}
