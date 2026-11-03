"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleCheck, Clock3, TicketX } from "lucide-react";

type Props = {
  eventId: string;
  reference: string;
  serverNow: string;
};

type CheckoutStatusData = {
  state: "pending" | "failed" | "confirmed" | "expired";
  expiresAt: string;
  orderId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStatus(value: unknown): CheckoutStatusData | null {
  if (!isRecord(value) || !isRecord(value.data)) {
    return null;
  }

  const { state, expires_at: expiresAt, order_id: orderId } = value.data;
  if (
    (state !== "pending" &&
      state !== "failed" &&
      state !== "confirmed" &&
      state !== "expired") ||
    typeof expiresAt !== "string" ||
    (orderId !== null && typeof orderId !== "string")
  ) {
    return null;
  }

  return { state, expiresAt, orderId };
}

export function CheckoutStatus({ eventId, reference, serverNow }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<CheckoutStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date(serverNow).getTime());

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const pageStartedAt = Date.now();

    async function poll() {
      try {
        const response = await fetch(
          `/api/checkout/status?reference=${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            router.replace(
              `/login?next=${encodeURIComponent(`/checkout/${eventId}?reference=${reference}`)}`,
            );
            return;
          }
          if (active) {
            setError(
              isRecord(payload) && typeof payload.error === "string"
                ? payload.error
                : "Payment status is temporarily unavailable.",
            );
          }
          if (response.status === 404) {
            return;
          }
        } else {
          const nextStatus = parseStatus(payload);
          if (!nextStatus) {
            throw new Error("Checkout status response was invalid.");
          }
          if (active) {
            setStatus(nextStatus);
            setError(null);
            if (nextStatus.state === "confirmed" && nextStatus.orderId) {
              router.replace(`/my-tickets?order=${encodeURIComponent(nextStatus.orderId)}`);
              return;
            }
            if (nextStatus.state === "expired") {
              return;
            }
          }
        }
      } catch (pollError) {
        console.error("[checkout:status] status request failed", pollError);
        if (active) {
          setError("Payment status is temporarily unavailable. Checking again shortly.");
        }
      }

      if (active) {
        timeout = setTimeout(poll, 2500);
      }
    }

    void poll();
    const clock = setInterval(() => {
      if (active) {
        setNow(new Date(serverNow).getTime() + Date.now() - pageStartedAt);
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(clock);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [eventId, reference, router, serverNow]);

  const secondsRemaining = status
    ? Math.max(0, Math.ceil((new Date(status.expiresAt).getTime() - now) / 1000))
    : null;

  return (
    <>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-[12px] font-bold text-ink-2 transition-colors hover:text-brand"
        href={`/e/${eventId}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to event
      </Link>

      <section className="mx-auto max-w-[560px] rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
        {status?.state === "confirmed" ? (
          <>
            <CircleCheck aria-hidden="true" className="mx-auto h-10 w-10 text-ok" />
            <h1 className="mt-4 text-[22px] font-extrabold text-ink">Payment confirmed</h1>
            <p className="mt-2 text-[13px] font-medium leading-6 text-ink-2">
              Your tickets are ready. We&apos;re opening your ticket wallet.
            </p>
          </>
        ) : status?.state === "expired" ? (
          <>
            <TicketX aria-hidden="true" className="mx-auto h-10 w-10 text-ink-3" />
            <h1 className="mt-4 text-[22px] font-extrabold text-ink">Checkout expired</h1>
            <p className="mt-2 text-[13px] font-medium leading-6 text-ink-2">
              This reservation was released after Paystack confirmed that payment did not complete.
            </p>
            <Link
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink"
              href={`/e/${eventId}`}
            >
              Choose tickets again
            </Link>
          </>
        ) : status?.state === "failed" ? (
          <>
            <TicketX aria-hidden="true" className="mx-auto h-10 w-10 text-ink-3" />
            <h1 className="mt-4 text-[22px] font-extrabold text-ink">Payment attempt failed</h1>
            <p className="mt-2 text-[13px] font-medium leading-6 text-ink-2">
              Your reservation is still held while the server checks the final Paystack status.
            </p>
            {secondsRemaining !== null ? (
              <p className="mt-4 text-[11px] font-semibold text-ink-3">
                {secondsRemaining > 0
                  ? `Reservation hold: ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`
                  : "The hold has ended. Inventory will be released only after Paystack confirms terminal non-success."}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Clock3 aria-hidden="true" className="mx-auto h-10 w-10 text-brand" />
            <h1 className="mt-4 text-[22px] font-extrabold text-ink">Verifying your payment</h1>
            <p className="mt-2 text-[13px] font-medium leading-6 text-ink-2">
              This page updates when our server receives payment confirmation. A return from
              Paystack alone does not issue tickets.
            </p>
            {secondsRemaining !== null ? (
              <p className="mt-4 text-[11px] font-semibold text-ink-3">
                {secondsRemaining > 0
                  ? `Reservation hold: ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`
                  : "Payment is still being checked; inventory remains reserved while Paystack reports a pending transaction."}
              </p>
            ) : null}
          </>
        )}

        {error ? (
          <p aria-live="polite" className="mt-4 text-[11px] font-semibold text-ink-2">
            {error}
          </p>
        ) : null}
        <p className="mt-4 truncate text-[10px] font-medium text-ink-3">
          Reference: {reference}
        </p>
      </section>
    </>
  );
}
