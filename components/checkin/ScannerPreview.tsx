"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CircleCheck,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  TicketCheck,
  WifiOff,
} from "lucide-react";
import { PHASE_FIVE_PREVIEW_EVENT } from "@/lib/phase-five-preview";

type ScanState = "landing" | "scanning" | "valid" | "already_used" | "invalid" | "offline";

type Props = {
  eventId: string;
};

const resultCopy: Record<Exclude<ScanState, "landing" | "scanning">, { title: string; detail: string }> = {
  valid: { title: "Ticket valid", detail: "Ada Okafor · General admission" },
  already_used: { title: "Already checked in", detail: "Scanned 6 minutes ago · North entrance" },
  invalid: { title: "Not a valid ticket", detail: "This QR code could not be verified." },
  offline: { title: "No connection", detail: "Reconnect to the internet before scanning again." },
};

export function ScannerPreview({ eventId }: Props) {
  const [scanState, setScanState] = useState<ScanState>("landing");

  if (scanState === "landing") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <section className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 text-center shadow-lg sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <TicketCheck aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
            Door staff access
          </p>
          <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-ink">
            {PHASE_FIVE_PREVIEW_EVENT.title}
          </h1>
          <p className="mt-2 text-[12px] font-medium text-ink-3">
            {PHASE_FIVE_PREVIEW_EVENT.date}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-left">
            <ScanLine aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-3">Your gate</p>
              <p className="mt-0.5 text-[12px] font-bold text-ink">
                {PHASE_FIVE_PREVIEW_EVENT.gateLabel}
              </p>
            </div>
          </div>
          <button
            className="mt-6 h-11 w-full rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
            onClick={() => setScanState("scanning")}
            type="button"
          >
            Start scanning
          </button>
          <p className="mt-4 text-[10.5px] font-semibold text-ink-3">
            Preview only · no sign-in required for door staff
          </p>
        </section>
      </main>
    );
  }

  if (scanState === "scanning") {
    return (
      <main className="flex min-h-screen flex-col bg-background px-4 py-5">
        <header className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">Check-in preview</p>
            <h1 className="mt-1 text-[16px] font-extrabold text-ink">{PHASE_FIVE_PREVIEW_EVENT.gateLabel}</h1>
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-right">
            <p className="text-[16px] font-extrabold tabular-nums text-ink">84 / 128</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-ink-3">checked in</p>
          </div>
        </header>

        <section className="mx-auto mt-5 flex w-full max-w-[560px] flex-1 flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-sunken">
            <div aria-hidden="true" className="absolute inset-8 rounded-2xl border-2 border-brand-line">
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-brand" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-brand" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-brand" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-brand" />
            </div>
            <div className="flex flex-col items-center gap-3 text-ink-3">
              <Camera aria-hidden="true" className="h-9 w-9" />
              <p className="text-[11px] font-semibold">Camera preview appears here</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              <p className="text-[10.5px] font-semibold leading-4 text-ink-3">
                UI preview only. A real scan will contact the server and will never be accepted offline.
              </p>
            </div>
            <p className="mb-2 mt-3 text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
              Simulate a result
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-md border border-line-2 bg-surface px-2 py-2 text-[10px] font-bold text-ink hover:bg-surface-2" onClick={() => setScanState("valid")} type="button">
                Valid ticket
              </button>
              <button className="rounded-md border border-line-2 bg-surface px-2 py-2 text-[10px] font-bold text-ink hover:bg-surface-2" onClick={() => setScanState("already_used")} type="button">
                Already used
              </button>
              <button className="rounded-md border border-line-2 bg-surface px-2 py-2 text-[10px] font-bold text-ink hover:bg-surface-2" onClick={() => setScanState("invalid")} type="button">
                Invalid ticket
              </button>
              <button className="rounded-md border border-line-2 bg-surface px-2 py-2 text-[10px] font-bold text-ink hover:bg-surface-2" onClick={() => setScanState("offline")} type="button">
                No connection
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const result = resultCopy[scanState];
  const isValid = scanState === "valid";
  const isAlreadyUsed = scanState === "already_used";
  const resultIcon = isValid ? (
    <CircleCheck aria-hidden="true" className="h-10 w-10" />
  ) : isAlreadyUsed ? (
    <ShieldAlert aria-hidden="true" className="h-10 w-10" />
  ) : scanState === "offline" ? (
    <WifiOff aria-hidden="true" className="h-10 w-10" />
  ) : (
    <ShieldAlert aria-hidden="true" className="h-10 w-10" />
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section
        className={`w-full max-w-[440px] rounded-2xl border border-border p-6 text-center sm:p-8 ${
          isValid ? "bg-ok-soft" : isAlreadyUsed ? "bg-live-soft" : "bg-sunken"
        }`}
      >
        <span
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            isValid ? "bg-ok text-brand-ink" : isAlreadyUsed ? "bg-live text-brand-ink" : "bg-ink-3 text-brand-ink"
          }`}
        >
          {resultIcon}
        </span>
        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
          {PHASE_FIVE_PREVIEW_EVENT.gateLabel} · Preview result
        </p>
        <h1 className="mt-2 text-[22px] font-extrabold text-ink">{result.title}</h1>
        <p className="mt-2 text-[12px] font-bold text-ink-2">{result.detail}</p>
        {isValid ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[10px] font-extrabold text-ok-ink">
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
            Admit attendee
          </p>
        ) : null}
        <button
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
          onClick={() => setScanState("scanning")}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Scan next
        </button>
        <p className="mt-4 text-[10.5px] font-semibold text-ink-3">
          Sample result only · Event {eventId.slice(0, 8)}
        </p>
      </section>
    </main>
  );
}
