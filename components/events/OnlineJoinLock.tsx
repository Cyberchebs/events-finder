"use client";

import { CircleAlert, CircleCheck, ExternalLink, LockKeyhole } from "lucide-react";

type Props = {
  eventTitle: string;
  mode: "locked" | "unlocked" | "unavailable";
  countdownLabel: string;
  joinUrl?: string | null;
  onJoin?: () => void;
};

export function OnlineJoinLock({
  eventTitle,
  mode,
  countdownLabel,
  joinUrl,
  onJoin,
}: Props) {
  const isLocked = mode === "locked";
  const isUnavailable = mode === "unavailable";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="flex w-full max-w-[440px] flex-col items-center justify-center gap-2 bg-sunken p-6 text-center">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            isLocked || isUnavailable
              ? "bg-surface text-ink-3"
              : "bg-ok-soft text-ok"
          }`}
        >
          {isLocked ? (
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          ) : isUnavailable ? (
            <CircleAlert aria-hidden="true" className="h-6 w-6" />
          ) : (
            <CircleCheck aria-hidden="true" className="h-6 w-6" />
          )}
        </span>
        <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
          Online event
        </p>
        <h1 className="text-[16.5px] font-extrabold text-ink">
          {isLocked
            ? "Your event link is locked"
            : isUnavailable
              ? "Your event link isn't available"
              : "Your event is ready"}
        </h1>
        <p className="max-w-[280px] text-[12.5px] font-medium text-ink-2">
          {eventTitle}
        </p>
        {isLocked ? (
          <>
            <p className="mt-2 max-w-[280px] text-[12.5px] font-medium text-ink-2">
              Your join link unlocks 30 minutes before the event starts.
            </p>
            <p
              aria-label={`Time until unlock: ${countdownLabel}`}
              className="mt-2 text-[30px] font-extrabold tabular-nums text-ink"
            >
              {countdownLabel}
            </p>
            <p className="text-[10.5px] font-semibold text-ink-3">
              Time remaining until access opens
            </p>
          </>
        ) : isUnavailable ? (
          <p className="mt-2 max-w-[280px] text-[12.5px] font-medium text-ink-2">
            Contact the organizer for the join link. Your ticket is still valid.
          </p>
        ) : (
          <>
            <p className="mt-2 max-w-[280px] text-[12.5px] font-medium text-ink-2">
              Your ticket is ready. Join the event using the button below.
            </p>
            {joinUrl ? (
              <a
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-[12px] font-bold text-brand-ink hover:opacity-95"
                href={joinUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Join event
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : (
              <button
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-[12px] font-bold text-brand-ink hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!onJoin}
                onClick={onJoin}
                type="button"
              >
                Join event
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
