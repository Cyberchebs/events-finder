"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleCheck,
  ScanLine,
  ShieldAlert,
  Ticket,
  WifiOff,
} from "lucide-react";

type Props = {
  eventId: string;
  eventTitle: string;
  gateLabel: string;
  token: string;
  initialCheckedIn: number;
  totalTickets: number;
};

type ScanResult =
  | {
      result: "success";
      tierName: string;
      scannedAt: string;
      scannedGateLabel: string;
    }
  | {
      result: "already_used";
      tierName: string;
      scannedAt: string;
      scannedGateLabel: string;
    }
  | { result: "invalid" };

type Phase = "landing" | "scanning" | "result" | "access_denied" | "error";
type ResultKind = ScanResult["result"] | "offline";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScanResult(value: unknown): ScanResult | null {
  if (!isRecord(value) || typeof value.result !== "string") {
    return null;
  }
  if (value.result === "invalid") {
    return { result: "invalid" };
  }
  if (
    (value.result === "success" || value.result === "already_used") &&
    typeof value.tierName === "string" &&
    typeof value.scannedAt === "string" &&
    typeof value.scannedGateLabel === "string"
  ) {
    return {
      result: value.result,
      tierName: value.tierName,
      scannedAt: value.scannedAt,
      scannedGateLabel: value.scannedGateLabel,
    };
  }
  return null;
}

export function CheckinScanner({
  eventId,
  eventTitle,
  gateLabel,
  token,
  initialCheckedIn,
  totalTickets,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const submittingRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("landing");
  const [resultKind, setResultKind] = useState<ResultKind>("invalid");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [message, setMessage] = useState("");

  const submitScan = useCallback(async (qrToken: string) => {
    try {
      const response = await fetch("/api/checkin/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-door-staff-token": token,
        },
        body: JSON.stringify({ event_id: eventId, qr_token: qrToken }),
        referrerPolicy: "no-referrer",
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        setMessage("The server returned an unreadable response. Try scanning again.");
        setPhase("error");
        return;
      }

      if (response.status === 401) {
        setPhase("access_denied");
        return;
      }
      if (response.status === 429 || !response.ok) {
        setMessage(
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "We couldn't complete this scan. Try again.",
        );
        setPhase("error");
        return;
      }

      const data = isRecord(payload) ? parseScanResult(payload.data) : null;
      if (!data) {
        setMessage("The scan response was incomplete. Try scanning again.");
        setPhase("error");
        return;
      }

      setScanResult(data);
      setResultKind(data.result);
      if (data.result === "success") {
        setCheckedIn((current) => Math.min(current + 1, totalTickets));
      }
      setPhase("result");
    } catch (error) {
      console.error("[CheckinScanner:submitScan] scan request failed", error);
      setResultKind("offline");
      setMessage("Reconnect to the internet before scanning again.");
      setPhase("result");
    }
  }, [eventId, token, totalTickets]);

  useEffect(() => {
    if (phase !== "scanning") {
      return;
    }

    let disposed = false;
    let controls: import("@zxing/browser").IScannerControls | null = null;

    async function startCamera() {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (disposed || !videoRef.current) {
          return;
        }

        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (decoded, _error, scannerControls) => {
            if (!decoded || submittingRef.current || disposed) {
              return;
            }
            submittingRef.current = true;
            scannerControls.stop();
            void submitScan(decoded.getText());
          },
        );
        if (disposed) {
          controls.stop();
        }
      } catch (error) {
        if (!disposed) {
          console.error("[CheckinScanner:camera] camera could not be started", error);
          setMessage("Allow camera access and make sure this page is open over a secure connection.");
        }
      }
    }

    void startCamera();
    return () => {
      disposed = true;
      controls?.stop();
    };
  }, [phase, submitScan]);

  if (phase === "access_denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <section className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sunken text-ink-3">
            <ShieldAlert aria-hidden="true" className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-[22px] font-extrabold text-ink">Access link revoked</h1>
          <p className="mt-2 text-[12px] font-semibold text-ink-2">
            Ask the event organizer for a current door-staff link.
          </p>
        </section>
      </main>
    );
  }

  if (phase === "landing") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <div className="mb-5 flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
            <Ticket aria-hidden="true" className="h-4 w-4" />
          </span>
          Tik-Booth
        </div>
        <section className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
              Door staff
            </p>
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[10px] font-bold text-brand">
              Scanning access only
            </span>
          </div>
          <h1 className="mt-5 text-[22px] font-extrabold tracking-tight text-ink">
            {eventTitle}
          </h1>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <ScanLine aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-ink">{gateLabel}</p>
                <p className="mt-1 text-[10px] font-medium text-ink-3">
                  Your assigned entrance
                </p>
              </div>
            </div>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-[22px] font-extrabold text-ink">{checkedIn}</span>
              <span className="text-[10px] font-semibold text-ink-2">
                of {totalTickets} tickets checked in at this event
              </span>
            </p>
            <p className="mt-2 text-[12px] font-medium leading-5 text-ink-2">
              Scan each guest&apos;s ticket QR code. Admit only after a valid result.
            </p>
          </div>
          <button
            className="mt-5 h-11 w-full rounded-lg bg-brand px-4 text-[12px] font-bold text-brand-ink transition-opacity hover:opacity-95"
            onClick={() => {
              setMessage("");
              setPhase("scanning");
            }}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <ScanLine aria-hidden="true" className="h-4 w-4" />
              Start scanning
            </span>
          </button>
          <p className="mt-3 text-center text-[10px] font-medium text-ink-3">
            An internet connection is required to verify tickets.
          </p>
        </section>
        <p className="mt-6 text-center text-[10px] font-medium text-ink-3">
          Ticket verification only. Organizer details stay private.
        </p>
      </main>
    );
  }

  if (phase === "scanning") {
    return (
      <main className="flex min-h-screen flex-col bg-ink text-background">
        <header className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 px-5 py-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-background/70">{gateLabel}</p>
            <h1 className="mt-1 text-[13px] font-bold text-background">{eventTitle}</h1>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-right text-ink">
            <p className="text-[20px] font-extrabold tabular-nums">
              {checkedIn} / {totalTickets}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-ink-3">valid scans</p>
          </div>
        </header>
        <section className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-4">
          <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-sunken">
            <video
              aria-label="Live ticket QR scanner camera"
              autoPlay
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              ref={videoRef}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-background/85" />
            {!message ? (
              <p className="absolute bottom-4 max-w-[calc(100%-2rem)] rounded-xl bg-ink/80 px-4 py-2 text-center text-[10px] font-semibold text-background">
                Align the ticket QR code inside the guide. Wait for a valid result before admitting the guest.
              </p>
            ) : null}
          </div>
          {message ? (
            <p aria-live="polite" className="mt-3 text-[11px] font-semibold text-background">{message}</p>
          ) : null}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-ink">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="text-[10.5px] font-semibold leading-4 text-ink-2">
              Every scan is verified online. If the connection drops, no ticket is admitted.
            </p>
          </div>
          <button
            className="mt-3 h-10 rounded-lg border border-background/25 px-4 text-[11px] font-bold text-background transition-colors hover:bg-background/10"
            onClick={() => setPhase("landing")}
            type="button"
          >
            Stop scanning
          </button>
        </section>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <section className="w-full max-w-[440px] rounded-2xl border border-border bg-sunken p-6 text-center sm:p-8">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink-3 text-brand-ink">
            <WifiOff aria-hidden="true" className="h-10 w-10" />
          </span>
          <h1 className="mt-5 text-[22px] font-extrabold text-ink">Scan could not be completed</h1>
          <p className="mt-2 text-[12px] font-bold text-ink-2">{message}</p>
          <button
            className="mt-6 h-11 w-full rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
            onClick={() => {
              submittingRef.current = false;
              setPhase("scanning");
            }}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  const isValid = resultKind === "success";
  const isAlreadyUsed = resultKind === "already_used";
  const title =
    resultKind === "success"
      ? "Ticket valid"
      : resultKind === "already_used"
        ? "Already checked in"
        : resultKind === "offline"
          ? "No connection"
          : "Not a valid ticket";
  const detail =
    scanResult && scanResult.result !== "invalid"
      ? resultKind === "success"
        ? scanResult.tierName
        : `Scanned ${new Date(scanResult.scannedAt).toLocaleTimeString()} · ${scanResult.scannedGateLabel}`
      : resultKind === "offline"
        ? message
        : "This QR code could not be verified.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section
        className={`w-full max-w-[440px] rounded-2xl border border-border p-6 text-center sm:p-8 ${isValid ? "bg-ok-soft" : isAlreadyUsed ? "bg-live-soft" : "bg-sunken"}`}
      >
        <span
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${isValid ? "bg-ok text-brand-ink" : isAlreadyUsed ? "bg-live text-brand-ink" : "bg-ink-3 text-brand-ink"}`}
        >
          {isValid ? (
            <CircleCheck aria-hidden="true" className="h-10 w-10" />
          ) : (
            <ShieldAlert aria-hidden="true" className="h-10 w-10" />
          )}
        </span>
        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
          {gateLabel} · Check-in result
        </p>
        <h1 className="mt-2 text-[22px] font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-[12px] font-bold text-ink-2">{detail}</p>
        <button
          className="mt-6 h-11 w-full rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
          onClick={() => {
            submittingRef.current = false;
            setScanResult(null);
            setMessage("");
            setPhase("scanning");
          }}
          type="button"
        >
          Scan next
        </button>
      </section>
    </main>
  );
}
