type Stat = {
  label: string;
  value: string;
  detail: string;
};

type Props = {
  stats: Stat[];
};

export function DashboardStatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <article
          className="rounded-2xl border border-border bg-surface-2 p-3.5"
          key={stat.label}
        >
          <p className="text-[11px] font-bold text-ink-3">{stat.label}</p>
          <p className="mt-2 text-[23px] font-extrabold tracking-tight text-ink">
            {stat.value}
          </p>
          <p className="mt-1 text-[10.5px] font-semibold text-ink-3">{stat.detail}</p>
        </article>
      ))}
    </div>
  );
}
