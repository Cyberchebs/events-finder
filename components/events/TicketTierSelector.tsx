"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_TICKETS_PER_ORDER } from "@/lib/constants";
import type { PublicTicketTier } from "@/types/events";

type Props = {
  eventId: string;
  isPast: boolean;
  tiers: PublicTicketTier[];
};

function formatPrice(priceKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(priceKobo / 100);
}

export function TicketTierSelector({ eventId, isPast, tiers }: Props) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const selectedTier = tiers.find((tier) => tier.id === selectedTierId);
  const selectedRemaining = selectedTier
    ? Math.max(selectedTier.quantity_available - selectedTier.quantity_sold, 0)
    : 0;
  const selectionIsAvailable = Boolean(selectedTier && selectedRemaining > 0 && !isPast);
  const checkoutHref = selectionIsAvailable && selectedTier
    ? `/checkout/${eventId}?ticket_type_id=${encodeURIComponent(selectedTier.id)}&quantity=1`
    : null;

  return (
    <>
      {tiers.length > 0 ? (
        <div className="mt-3 space-y-2.5" role="radiogroup" aria-label="Choose a ticket tier">
          {tiers.map((tier) => {
            const remaining = Math.max(tier.quantity_available - tier.quantity_sold, 0);
            const isSelected = tier.id === selectedTierId;
            const unavailable = remaining === 0 || isPast;

            return (
              <button
                aria-checked={isSelected}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-line ${
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-surface hover:border-line-2"
                } ${unavailable ? "cursor-not-allowed opacity-55" : ""}`}
                disabled={unavailable}
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                role="radio"
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-bold text-ink">
                    {tier.name}
                  </span>
                  <span className="mt-1 block text-[10.5px] font-semibold text-ink-3">
                    {remaining > 0 ? `${remaining} available` : "Sold out"}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-extrabold text-ink">
                  {tier.price_kobo === 0 ? "Free" : formatPrice(tier.price_kobo)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-sunken px-3 py-3 text-[11.5px] font-semibold text-ink-3">
          No tickets are available for this event.
        </p>
      )}

      {checkoutHref ? (
        <Link
          className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink transition-opacity hover:opacity-95"
          href={checkoutHref}
        >
          Continue with {selectedTier?.name}
        </Link>
      ) : (
        <button
          className="mt-4 h-11 w-full cursor-not-allowed rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink opacity-60"
          disabled
          type="button"
        >
          {isPast ? "Event ended" : selectedTier ? "Sold out" : "Choose a ticket"}
        </button>
      )}
      <p className="mt-2 text-center text-[10.5px] font-medium leading-4 text-ink-3">
        Up to {MAX_TICKETS_PER_ORDER} tickets per order.
      </p>
    </>
  );
}
