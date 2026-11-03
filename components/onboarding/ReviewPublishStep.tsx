"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { QrCode } from "lucide-react";
import posthog from "posthog-js";
import { publishOnboardingEvent } from "@/actions/onboarding";
import { TicketCardFace } from "@/components/tickets/TicketCardFace";
import { WizardStepFooter } from "@/components/onboarding/WizardStepFooter";
import type { EventDraftData, TicketTierData } from "@/components/onboarding/types";

type Props = {
  event: EventDraftData | null;
  organizerId: string;
  ticketTiers: TicketTierData[];
  isPublished: boolean;
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

export function ReviewPublishStep({
  event,
  organizerId,
  ticketTiers,
  isPublished,
}: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!event) {
      setError("We couldn't find your event draft.");
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const result = await publishOnboardingEvent(event.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      posthog.capture("organizer_onboarding_step_completed", {
        step_name: "publish",
        organizer_id: organizerId,
      });
      router.refresh();
    } catch (caughtError) {
      console.error("[onboarding:ReviewPublishStep] publish failed", caughtError);
      setError("Your event could not be published. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (!event) {
    return (
      <div>
        <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
          Event draft unavailable
        </h1>
        <p className="mt-2 text-[12.5px] font-medium leading-5 text-ink-2">
          Save your event details before you review and publish it.
        </p>
        <Link
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-brand px-5 text-[12px] font-bold text-brand-ink"
          href="/onboarding/event?new=1"
        >
          Return to event details
        </Link>
      </div>
    );
  }

  const sampleTier = ticketTiers[0];

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
        {isPublished ? "Your event is published" : "Ready to publish"}
      </h1>
      <p className="mt-1 text-[12.5px] font-medium leading-5 text-ink-2">
        {isPublished
          ? "Your event is now visible to attendees."
          : "Review your event and ticket information before publishing."}
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <section aria-label="Event preview">
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
            Public event page
          </p>
          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            {event.image_url ? (
              <Image
                alt=""
                className="h-28 w-full object-cover"
                height={320}
                sizes="(max-width: 768px) 100vw, 600px"
                src={event.image_url}
                unoptimized
                width={900}
              />
            ) : (
              <div className="h-28 bg-gradient-to-br from-tier-a-1 to-tier-a-2" />
            )}
            <div className="space-y-3 p-3">
              <div>
                <h2 className="text-[14px] font-extrabold text-ink">{event.title}</h2>
                <p className="mt-1 text-[10.5px] font-semibold text-ink-3">
                  {formatEventDate(event.starts_at)} · {event.venue_address}
                </p>
                {event.description ? (
                  <p className="mt-2 text-[11px] font-medium leading-4 text-ink-2">
                    {event.description}
                  </p>
                ) : null}
              </div>
              {ticketTiers.map((tier) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                  key={tier.id}
                >
                  <span>
                    <span className="block text-[11px] font-bold text-ink">{tier.name}</span>
                    <span className="mt-0.5 block text-[9.5px] font-semibold text-ink-3">
                      {tier.quantity_available} available
                    </span>
                  </span>
                  <span className="text-[11px] font-extrabold text-ink">
                    {formatPrice(tier.price_kobo)}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {sampleTier ? (
          <section aria-label="Sample ticket card">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
              Sample ticket
            </p>
            <TicketCardFace
              color={sampleTier.card_color}
              finish={sampleTier.card_finish === "metallic" ? "metallic" : "normal"}
              imageUrl={sampleTier.card_image_url}
              label="Sample ticket"
              shape={sampleTier.card_style === "torn" ? "torn" : "solid"}
              textColor={sampleTier.card_text_color === "black" ? "black" : "white"}
            >
              <div className="flex min-h-[120px] flex-col justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-extrabold">{event.title}</p>
                  <p className="mt-1 truncate text-[9px] font-semibold opacity-85">
                    {formatEventDate(event.starts_at)} · {sampleTier.name}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <span className="min-w-0 truncate text-[9.5px] font-extrabold">
                    {event.venue_address}
                  </span>
                  <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-lg bg-ticket-white p-1.5 text-ticket-black">
                    <QrCode aria-hidden="true" className="h-full w-full" strokeWidth={1.5} />
                  </span>
                </div>
              </div>
            </TicketCardFace>
          </section>
        ) : null}
      </div>

      {isPublished ? (
        <>
          <p className="mt-4 rounded-lg bg-ok-soft px-3 py-2.5 text-[10.5px] font-semibold leading-4 text-ok-ink" role="status">
            Your event is published. You can open its public page from the event listing.
          </p>
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink"
            href="/onboarding/event?new=1"
          >
            Create another event
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 rounded-lg bg-sunken px-3 py-2.5 text-[10.5px] font-semibold leading-4 text-ink-2">
            Publishing makes this event and its ticket tiers visible to attendees.
          </p>
          {error ? (
            <p className="mt-3 text-[11px] font-semibold text-live" role="alert">
              {error}
            </p>
          ) : null}
          <WizardStepFooter
            isPending={isPending}
            previousHref={`/onboarding/tiers?eventId=${encodeURIComponent(event.id)}`}
            submitLabel="Publish event"
          />
        </>
      )}
    </form>
  );
}
