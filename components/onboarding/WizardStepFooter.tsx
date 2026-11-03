import Link from "next/link";

type Props = {
  previousHref?: string;
  submitLabel: string;
  isPending: boolean;
  disabled?: boolean;
};

export function WizardStepFooter({
  previousHref,
  submitLabel,
  isPending,
  disabled = false,
}: Props) {
  return (
    <div className="mt-6 flex min-h-11 items-center justify-between gap-3 border-t border-border pt-4">
      {previousHref ? (
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-line-2 bg-surface px-4 text-[12px] font-bold text-ink transition-colors hover:bg-surface-2"
          href={previousHref}
        >
          Back
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-[12px] font-bold text-ink-3 opacity-60"
        >
          Back
        </span>
      )}

      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-5 text-[12px] font-bold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        disabled={disabled || isPending}
        type="submit"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
