"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const steps = [
  { label: "Profile", href: "/onboarding/profile" },
  { label: "Payout", href: "/onboarding/payout" },
  { label: "Event", href: "/onboarding/event" },
  { label: "Tickets", href: "/onboarding/tiers" },
  { label: "Publish", href: "/onboarding/publish" },
] as const;

type Props = {
  step: number;
  maxAccessibleStep: number;
  eventId?: string;
  isRepeatEvent?: boolean;
  newEvent?: boolean;
  children: ReactNode;
};

export function WizardShell({
  step,
  maxAccessibleStep,
  eventId,
  isRepeatEvent = false,
  newEvent = false,
  children,
}: Props) {
  const currentStep = steps[step - 1];
  const supportCopy = isRepeatEvent
    ? "Your host profile and payout details are already set. Finish the details for this event."
    : "A few simple steps bring your first event to life.";

  if (!currentStep) {
    throw new Error(`Invalid organizer onboarding step: ${step}`);
  }

  return (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 md:py-9">
      <header className="mb-5 md:mb-6">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
          Bring your people together
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink md:text-[24px]">
          Let&apos;s get you ready to host.
        </h1>
        <p className="mt-1 text-[12px] font-medium text-ink-2 md:text-[13px]">
          {isRepeatEvent ? "Your next event starts here." : "Five simple steps to your first event on Tik-Booth."}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8">
        <aside>
          <div className="rounded-2xl border border-border bg-surface p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 text-[10px] font-bold text-ink-3">
              <span className="text-brand">Step {step} of 5</span>
              <span>GET READY TO HOST</span>
            </div>
            <div
              aria-label={`Step ${step} of 5`}
              aria-valuemax={5}
              aria-valuemin={1}
              aria-valuenow={step}
              className="mb-5 h-1 overflow-hidden rounded-full bg-brand-soft"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>

            <ol className="hidden space-y-4 md:block">
              {steps.map((item, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < step;
                const isCurrent = stepNumber === step;
                const canAccessStep =
                  stepNumber <= maxAccessibleStep &&
                  (!isRepeatEvent || stepNumber >= 3);
                const href =
                  stepNumber >= 3 && eventId
                    ? `${item.href}?eventId=${encodeURIComponent(eventId)}`
                    : stepNumber === 3 && newEvent
                      ? `${item.href}?new=1`
                      : item.href;
                const indicator = (
                  <>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                        isComplete
                          ? "bg-brand text-brand-ink"
                          : isCurrent
                            ? "bg-brand text-brand-ink"
                            : "bg-sunken text-ink-3"
                      }`}
                    >
                      {isComplete ? "✓" : stepNumber}
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-[12px] font-bold ${isCurrent ? "text-brand" : "text-ink"}`}>
                        {item.label === "Profile" ? "Organizer profile" : item.label === "Event" ? "First event" : item.label === "Tickets" ? "Ticket tiers" : item.label === "Publish" ? "Review and publish" : "Payout setup"}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-ink-3">
                        {isComplete ? "Complete" : isCurrent ? "You're here" : "Up next"}
                      </span>
                    </span>
                  </>
                );

                return (
                  <li key={item.label}>
                    {canAccessStep ? (
                      <Link
                        aria-current={isCurrent ? "step" : undefined}
                        className="flex items-center gap-3"
                        href={href}
                      >
                        {indicator}
                      </Link>
                    ) : (
                      <span aria-disabled="true" className="flex items-center gap-3">
                        {indicator}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            <ol className="grid grid-cols-5 gap-1 md:hidden">
              {steps.map((item, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < step;
                const isCurrent = stepNumber === step;
                const canAccessStep =
                  stepNumber <= maxAccessibleStep &&
                  (!isRepeatEvent || stepNumber >= 3);
                const href =
                  stepNumber >= 3 && eventId
                    ? `${item.href}?eventId=${encodeURIComponent(eventId)}`
                    : stepNumber === 3 && newEvent
                      ? `${item.href}?new=1`
                      : item.href;
                const content = (
                  <>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-extrabold ${
                        isComplete || isCurrent
                          ? "bg-brand text-brand-ink"
                          : "bg-sunken text-ink-3"
                      }`}
                    >
                      {isComplete ? "✓" : stepNumber}
                    </span>
                    <span className={`truncate text-[9px] font-bold ${isCurrent ? "text-brand" : "text-ink-3"}`}>
                      {item.label}
                    </span>
                  </>
                );

                return (
                  <li className="flex min-w-0 flex-col items-center gap-1.5" key={item.label}>
                    {canAccessStep ? (
                      <Link aria-current={isCurrent ? "step" : undefined} className="flex min-w-0 flex-col items-center gap-1.5" href={href}>
                        {content}
                      </Link>
                    ) : (
                      <span aria-disabled="true" className="flex min-w-0 flex-col items-center gap-1.5">
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="mt-4 px-2 text-[11px] font-semibold leading-5 text-ink-3">
            {supportCopy}
          </p>
        </aside>

        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5 md:p-6">
          {children}
        </div>
      </div>
    </section>
  );
}
