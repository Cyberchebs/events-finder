import { CalendarX } from "lucide-react";

type Props = {
  cityName?: string;
  onReset?: () => void;
};

export function EmptyState({ cityName = "this location", onReset }: Props) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-5 py-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sunken text-ink-2">
        <CalendarX className="h-7 w-7" strokeWidth={2} />
      </div>
      <h3 className="text-[15px] sm:text-[16px] font-extrabold tracking-tight text-ink">
        Nothing in {cityName} yet
      </h3>
      <p className="mt-2 max-w-[240px] text-[12.5px] font-medium leading-5 text-ink-2">
        Try another city, or be the first to host something here.
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-full border border-border bg-surface px-4 py-2.5 text-[12px] font-extrabold tracking-tight text-ink hover:bg-surface-2 hover:border-line-2 transition-colors"
        >
          Change location
        </button>
      )}
    </div>
  );
}

