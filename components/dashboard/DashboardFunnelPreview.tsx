const stages = [
  { label: "Event views", count: 482, height: "h-24" },
  { label: "Checkout started", count: 197, height: "h-10" },
  { label: "Tickets sold", count: 128, height: "h-[26px]" },
];

export function DashboardFunnelPreview() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-extrabold text-ink">Checkout funnel</h2>
          <p className="mt-1 text-[11px] font-semibold text-ink-3">
            How attendees move from discovery to purchase
          </p>
        </div>
        <span className="rounded-full bg-sunken px-2.5 py-1 text-[10px] font-extrabold text-ink-3">
          SAMPLE DATA
        </span>
      </div>
      <div className="mt-6 grid grid-cols-3 items-end gap-2.5">
        {stages.map((stage, index) => (
          <div className="flex min-w-0 flex-col items-center" key={stage.label}>
            <span className="mb-2 text-[11px] font-extrabold tabular-nums text-ink">
              {stage.count}
            </span>
            <div
              aria-hidden="true"
              className={`w-full rounded-t-lg ${
                index === stages.length - 1
                  ? `bg-brand ${stage.height}`
                  : `border border-brand-line bg-brand-soft ${stage.height}`
              }`}
            />
            <span className="mt-2 text-center text-[10px] font-bold leading-4 text-ink-3">
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
