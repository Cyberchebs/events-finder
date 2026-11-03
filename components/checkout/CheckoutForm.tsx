"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import posthog from "posthog-js";
import { MAX_TICKETS_PER_ORDER } from "@/lib/constants";
import type { PublicEvent, PublicTicketTier } from "@/types/events";

type Props = {
  event: PublicEvent;
  initialQuantity: number;
  selectedTier: PublicTicketTier | null;
  serverNow: string;
};

function formatPrice(priceKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(priceKobo / 100);
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function CheckoutForm({
  event,
  initialQuantity,
  selectedTier,
  serverNow,
}: Props) {
  const router = useRouter();
  const remaining = selectedTier
    ? Math.max(selectedTier.quantity_available - selectedTier.quantity_sold, 0)
    : 0;
  const maxQuantity = Math.min(MAX_TICKETS_PER_ORDER, remaining);
  const [quantity, setQuantity] = useState(
    Math.max(1, Math.min(initialQuantity, maxQuantity || 1)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const canContinue = Boolean(selectedTier && maxQuantity > 0);
  const totalKobo = selectedTier ? selectedTier.price_kobo * quantity : 0;
  const eventHasEnded =
    new Date(event.ends_at).getTime() <= new Date(serverNow).getTime();

  async function handleContinue() {
    if (!selectedTier || isSubmitting || eventHasEnded) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          ticket_type_id: selectedTier.id,
          quantity,
          idempotency_key: idempotencyKey.current,
        }),
      });
      const result: unknown = await response.json();

      if (!isRecord(result) || result.success !== true || !isRecord(result.data)) {
        setError(
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Checkout could not be started. Try again.",
        );
        return;
      }

      if (
        result.data.kind === "payment" &&
        typeof result.data.authorizationUrl === "string"
      ) {
        posthog.capture("checkout_started", {
          event_id: event.id,
          ticket_type_id: selectedTier.id,
          quantity,
        });
        posthog.capture("checkout_payment_initiated", {
          event_id: event.id,
          ticket_type_id: selectedTier.id,
          reservation_id: result.data.reference,
          quantity,
          amount: totalKobo / 100,
        });
        window.location.href = result.data.authorizationUrl;
        return;
      }

      if (result.data.kind === "free" && typeof result.data.orderId === "string") {
        router.push(`/my-tickets?order=${encodeURIComponent(result.data.orderId)}`);
        return;
      }

      setError("Checkout returned an unexpected response. Please try again.");
    } catch (requestError) {
      console.error("[checkout:form] checkout request failed", requestError);
      setError("We couldn't reach checkout. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-[12px] font-bold text-ink-2 transition-colors hover:text-brand"
        href={`/e/${event.id}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to event
      </Link>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-border bg-surface p-4 md:p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
            Checkout
          </p>
          <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-ink">
            Confirm your tickets
          </h1>
          <p className="mt-1 text-[12.5px] font-semibold leading-5 text-ink-2">
            {event.title}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-ink-3">
            {formatEventDate(event.starts_at)}
          </p>

          {selectedTier ? (
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-ink-3">
                    Ticket tier
                  </p>
                  <p className="mt-1 truncate text-[14px] font-extrabold text-ink">
                    {selectedTier.name}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-ink-3">
                    {remaining > 0 ? `${remaining} available` : "Sold out"}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-extrabold text-ink">
                  {selectedTier.price_kobo === 0
                    ? "Free"
                    : formatPrice(selectedTier.price_kobo)}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12.5px] font-bold text-ink">Quantity</p>
                  <p className="mt-1 text-[10.5px] font-semibold text-ink-3">
                    Maximum {MAX_TICKETS_PER_ORDER} per order
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Remove one ticket"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-line-2 bg-surface text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
                    type="button"
                  >
                    <Minus aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <span
                    aria-live="polite"
                    className="w-8 text-center text-[14px] font-extrabold tabular-nums text-ink"
                  >
                    {quantity}
                  </span>
                  <button
                    aria-label="Add one ticket"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-line-2 bg-surface text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={quantity >= maxQuantity}
                    onClick={() =>
                      setQuantity((current) => Math.min(current + 1, maxQuantity))
                    }
                    type="button"
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {remaining > 0 && remaining < MAX_TICKETS_PER_ORDER ? (
                <p className="mt-3 text-[11px] font-semibold text-warn">
                  Only {remaining} {remaining === 1 ? "ticket is" : "tickets are"} available.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-sunken p-4">
              <p className="text-[13px] font-bold text-ink">Choose a ticket tier first</p>
              <p className="mt-1 text-[11.5px] font-medium text-ink-2">
                Select an available tier from the event page to continue.
              </p>
              <Link
                className="mt-3 inline-flex text-[12px] font-bold text-brand hover:underline"
                href={`/e/${event.id}`}
              >
                Return to event
              </Link>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-surface p-4 md:p-5">
          <h2 className="text-[15px] font-extrabold text-ink">Order summary</h2>
          {selectedTier ? (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="flex items-start justify-between gap-3 text-[11.5px] font-semibold text-ink-2">
                <span className="min-w-0">{selectedTier.name} × {quantity}</span>
                <span className="shrink-0">{formatPrice(totalKobo)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-[12px] font-bold text-ink">Total</span>
                <span className="text-[15px] font-extrabold text-ink">
                  {totalKobo === 0 ? "Free" : formatPrice(totalKobo)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11.5px] font-medium text-ink-3">
              Your total will appear after you select a ticket tier.
            </p>
          )}
          <button
            className="mt-5 h-[42px] w-full rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canContinue || eventHasEnded || isSubmitting}
            onClick={handleContinue}
            type="button"
          >
            {eventHasEnded
              ? "Event ended"
              : isSubmitting
                ? "Starting checkout…"
                : selectedTier?.price_kobo === 0
                  ? "Get free tickets"
                  : "Continue to payment"}
          </button>
          {error ? (
            <p aria-live="polite" className="mt-3 text-center text-[11px] font-semibold text-ink-2">
              {error}
            </p>
          ) : null}
          <p className="mt-2 text-center text-[10.5px] font-medium leading-4 text-ink-3">
            Tickets are held when you start checkout.
          </p>
        </aside>
      </div>
    </>
  );
}
