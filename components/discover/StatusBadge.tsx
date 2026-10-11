type StatusBadgeProps = {
  status: "live" | "free" | "sold-out";
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  if (status === "live") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-live-soft px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-live-ink backdrop-blur-sm ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse motion-reduce:animate-none" />
        Live
      </span>
    );
  }

  if (status === "free") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-ok-soft px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ok-ink backdrop-blur-sm ${className}`}
      >
        Free
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-2 ${className}`}
    >
      Sold out
    </span>
  );
}

