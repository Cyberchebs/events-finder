import { type OrganizerFunnel } from "@/lib/organizer-dashboard";

type Props = {
  funnel: OrganizerFunnel;
};

export function DashboardFunnel({ funnel }: Props) {
  const stages = [
    { label: "Event views", count: funnel.views },
    { label: "Checkout started", count: funnel.checkouts },
    { label: "Tickets purchased", count: funnel.purchases },
  ];
  const maxCount = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 md:p-6">
      <div>
        <h2 className="text-[16px] font-extrabold text-ink">Checkout funnel</h2>
        <p className="mt-1 text-[11px] font-semibold text-ink-3">
          Unique users over the last 30 days
        </p>
      </div>
      {funnel.available ? (
        <div className="mt-6 grid grid-cols-3 items-end gap-2.5">
          {stages.map((stage, index) => {
            const height = Math.max(12, Math.round((stage.count / maxCount) * 96));
            return (
              <div className="flex min-w-0 flex-col items-center" key={stage.label}>
                <span className="mb-2 text-[11px] font-extrabold tabular-nums text-ink">
                  {stage.count.toLocaleString("en-NG")}
                </span>
                <div
                  aria-hidden="true"
                  className={`w-full rounded-t-lg ${
                    index === stages.length - 1
                      ? "bg-brand"
                      : "border border-brand-line bg-brand-soft"
                  }`}
                  style={{ height }}
                />
                <span className="mt-2 text-center text-[10px] font-bold leading-4 text-ink-3">
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-sunken px-4 py-6 text-center text-[11px] font-semibold text-ink-2">
          Funnel analytics are temporarily unavailable.
        </p>
      )}
    </section>
  );
}
