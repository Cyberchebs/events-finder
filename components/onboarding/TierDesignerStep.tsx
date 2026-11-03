"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Plus, QrCode, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import {
  completeTicketStep,
  saveTicketTiers,
} from "@/actions/onboarding";
import { uploadOnboardingImage } from "@/components/onboarding/imageUpload";
import { WizardStepFooter } from "@/components/onboarding/WizardStepFooter";
import { TicketCardFace } from "@/components/tickets/TicketCardFace";
import type { EventDraftData, TicketTierData } from "@/components/onboarding/types";

type TicketCardStyle = "solid" | "torn";
type TicketCardFinish = "normal" | "metallic";
type TicketCardTextColor = "black" | "white";

type TierForm = {
  id: string | null;
  name: string;
  price: string;
  quantity: string;
  cardColor: string;
  cardStyle: TicketCardStyle;
  cardFinish: TicketCardFinish;
  cardTextColor: TicketCardTextColor;
  imageUrl: string | null;
  imageFile: File | null;
};

type Props = {
  event: EventDraftData | null;
  organizerId: string;
  ticketTiers: TicketTierData[];
};

const swatches: { label: string; value: string; className: string }[] = [
  { label: "Violet", value: "tier-a", className: "bg-gradient-to-br from-tier-a-1 to-tier-a-2" },
  { label: "Teal", value: "tier-b", className: "bg-gradient-to-br from-tier-b-1 to-tier-b-2" },
  { label: "Coral", value: "tier-c", className: "bg-gradient-to-br from-tier-c-1 to-tier-c-2" },
  { label: "Ink", value: "ink", className: "bg-ink" },
  { label: "Yellow", value: "yellow", className: "bg-warn" },
  { label: "Red", value: "red", className: "bg-live" },
];

const cardStyles: { label: string; value: TicketCardStyle }[] = [
  { label: "3D card", value: "solid" },
  { label: "Torn ticket", value: "torn" },
];

const cardFinishes: { label: string; value: TicketCardFinish }[] = [
  { label: "Normal", value: "normal" },
  { label: "Metallic", value: "metallic" },
];

function isCustomHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function formatPrice(priceKobo: number): string {
  return (priceKobo / 100).toFixed(2).replace(/\.00$/, "");
}

function mapTicketTier(tier: TicketTierData): TierForm {
  const cardColor =
    swatches.find((swatch) => swatch.value === tier.card_color)?.value ??
    (tier.card_color && isCustomHexColor(tier.card_color) ? tier.card_color : "tier-a");
  return {
    id: tier.id,
    name: tier.name,
    price: formatPrice(tier.price_kobo),
    quantity: String(tier.quantity_available),
    cardColor,
    cardStyle: tier.card_style === "torn" ? "torn" : "solid",
    cardFinish: tier.card_finish === "metallic" ? "metallic" : "normal",
    cardTextColor: tier.card_text_color === "black" ? "black" : "white",
    imageUrl: tier.card_image_url,
    imageFile: null,
  };
}

function createTier(): TierForm {
  return {
    id: null,
    name: "",
    price: "",
    quantity: "",
    cardColor: "tier-a",
    cardStyle: "solid",
    cardFinish: "normal",
    cardTextColor: "white",
    imageUrl: null,
    imageFile: null,
  };
}

export function TierDesignerStep({ event, organizerId, ticketTiers }: Props) {
  const router = useRouter();
  const [tiers, setTiers] = useState<TierForm[]>(
    ticketTiers.length > 0 ? ticketTiers.map(mapTicketTier) : [{ ...createTier(), name: "Regular" }],
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTier(index: number, updates: Partial<TierForm>) {
    setTiers((current) =>
      current.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...updates } : tier,
      ),
    );
  }

  function addTier() {
    if (tiers.length < 20) {
      setTiers((current) => [...current, createTier()]);
    }
  }

  function removeTier(index: number) {
    if (tiers.length > 1) {
      setTiers((current) => current.filter((_, tierIndex) => tierIndex !== index));
    }
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      if (!event) {
        setError("Save your event details before adding ticket tiers.");
        return;
      }

      const saveResult = await saveTicketTiers(
        event.id,
        tiers.map(({ id, name, price, quantity, cardColor, cardStyle, cardFinish, cardTextColor }) => ({
          id,
          name,
          price,
          quantity,
          cardColor,
          cardStyle,
          cardFinish,
          cardTextColor,
        })),
      );

      if (!saveResult.success) {
        setError(saveResult.error);
        return;
      }

      for (const [index, tier] of tiers.entries()) {
        if (!tier.imageFile) {
          continue;
        }

        const ticketTypeId = saveResult.data.ticketTypeIds[index];
        if (!ticketTypeId) {
          setError("We couldn't associate a card image with its ticket tier. Save again to retry.");
          return;
        }

        const uploadResult = await uploadOnboardingImage(
          tier.imageFile,
          "ticket-card",
          ticketTypeId,
        );
        if (!uploadResult.success) {
          setError(uploadResult.error);
          return;
        }
      }

      const completeResult = await completeTicketStep(event.id);
      if (!completeResult.success) {
        setError(completeResult.error);
        return;
      }

      posthog.capture("organizer_onboarding_step_completed", {
        step_name: "tickets",
        organizer_id: organizerId,
      });
      router.push(`/onboarding/publish?eventId=${encodeURIComponent(event.id)}`);
    } catch (caughtError) {
      console.error("[onboarding:TierDesignerStep] submit failed", caughtError);
      setError("We couldn't save your ticket tiers. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const previewTier = tiers[0];

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
        Ticket tiers
      </h1>
      <p className="mt-1 text-[12.5px] font-medium leading-5 text-ink-2">
        Each tier gets its own card design — that&apos;s what attendees see in their wallet.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_150px]">
        <div className="min-w-0">
          {tiers.map((tier, index) => (
            <section
              aria-label={`Ticket tier ${index + 1}`}
              className="mb-4 rounded-xl border border-border p-3"
              key={tier.id ?? `new-tier-${index}`}
            >
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`tier-name-${index}`}>
                  Ticket tier name
                </label>
                <input
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
                  id={`tier-name-${index}`}
                  maxLength={80}
                  onChange={(change) => updateTier(index, { name: change.currentTarget.value })}
                  placeholder="Ticket tier name"
                  required
                  value={tier.name}
                />
                {tiers.length > 1 ? (
                  <button
                    aria-label={`Remove ${tier.name || "ticket"} tier`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-ink-3 transition-colors hover:border-line-2"
                    onClick={() => removeTier(index)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold text-ink-3">
                  Price in naira
                  <input
                    className="h-10 min-w-0 rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
                    inputMode="decimal"
                    min="0"
                    onChange={(change) => updateTier(index, { price: change.currentTarget.value })}
                    placeholder="0"
                    required
                    step="0.01"
                    type="number"
                    value={tier.price}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold text-ink-3">
                  Quantity
                  <input
                    className="h-10 min-w-0 rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
                    inputMode="numeric"
                    min="1"
                    onChange={(change) => updateTier(index, { quantity: change.currentTarget.value })}
                    placeholder="Available tickets"
                    required
                    step="1"
                    type="number"
                    value={tier.quantity}
                  />
                </label>
              </div>

              <p className="mt-4 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
                Card color
              </p>
              <div
                aria-label={`Ticket card color for tier ${index + 1}`}
                className="mt-2 flex items-center gap-2.5"
                role="group"
              >
                {swatches.map((swatch) => (
                  <button
                    aria-label={swatch.label}
                    aria-pressed={tier.cardColor === swatch.value}
                    className={`h-7 w-7 rounded-full ${swatch.className} ${
                      tier.cardColor === swatch.value
                        ? "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                        : ""
                    }`}
                    key={swatch.value}
                    onClick={() => updateTier(index, { cardColor: swatch.value })}
                    type="button"
                  />
                ))}
                <label
                  className={`relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-line-2 ${
                    isCustomHexColor(tier.cardColor)
                      ? "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                      : "bg-surface"
                  }`}
                  style={
                    isCustomHexColor(tier.cardColor)
                      ? { backgroundColor: tier.cardColor }
                      : undefined
                  }
                >
                  <span className="sr-only">Choose a custom card color</span>
                  <input
                    aria-label={`Custom card color for tier ${index + 1}`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(change) =>
                      updateTier(index, { cardColor: change.currentTarget.value })
                    }
                    type="color"
                  />
                  {!isCustomHexColor(tier.cardColor) ? (
                    <span aria-hidden="true" className="text-[14px] font-medium text-ink-3">
                      +
                    </span>
                  ) : null}
                </label>
              </div>

              <p className="mt-4 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
                Card shape
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {cardStyles.map((option) => (
                  <button
                    aria-pressed={tier.cardStyle === option.value}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors ${
                      tier.cardStyle === option.value
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-surface text-ink-2 hover:bg-surface-2"
                    }`}
                    key={option.value}
                    onClick={() => updateTier(index, { cardStyle: option.value })}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
                Finish
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {cardFinishes.map((option) => (
                  <button
                    aria-pressed={tier.cardFinish === option.value}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors ${
                      tier.cardFinish === option.value
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-surface text-ink-2 hover:bg-surface-2"
                    }`}
                    key={option.value}
                    onClick={() => updateTier(index, { cardFinish: option.value })}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
                Text color
              </p>
              <div className="mt-2 flex gap-2">
                {(["black", "white"] as const).map((textColor) => (
                  <button
                    aria-pressed={tier.cardTextColor === textColor}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold capitalize transition-colors ${
                      tier.cardTextColor === textColor
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-surface text-ink-2 hover:bg-surface-2"
                    }`}
                    key={textColor}
                    onClick={() => updateTier(index, { cardTextColor: textColor })}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full border border-line-2 ${
                        textColor === "black" ? "bg-ticket-black" : "bg-ticket-white"
                      }`}
                    />
                    {textColor}
                  </button>
                ))}
              </div>

              <label className="relative mt-4 flex min-h-[62px] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-dashed border-line-2 bg-surface text-center text-[9.5px] font-semibold text-ink-3 transition-colors hover:bg-surface-2">
                {tier.imageUrl && !tier.imageFile ? (
                  <Image
                    alt={`Current ${tier.name} ticket card image`}
                    className="h-[62px] w-full object-cover"
                    height={120}
                    src={tier.imageUrl}
                    unoptimized
                    width={300}
                  />
                ) : (
                  <>
                    <ImagePlus aria-hidden="true" className="h-4 w-4" />
                    Card image — optional, up to 50MB
                  </>
                )}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(change) =>
                    updateTier(index, {
                      imageFile: change.currentTarget.files?.[0] ?? null,
                    })
                  }
                  type="file"
                />
              </label>
              {tier.imageFile ? (
                <p className="mt-1 truncate text-[9.5px] font-semibold text-ink-3">
                  {tier.imageFile.name}
                </p>
              ) : null}
            </section>
          ))}

          <button
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-[11px] font-bold text-ink transition-colors hover:border-line-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={tiers.length >= 20}
            onClick={addTier}
            type="button"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Add another tier
          </button>
        </div>

        <aside className="mx-auto w-full max-w-[240px] lg:mx-0">
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-ink-3">
            Live preview
          </p>
          <TicketCardFace
            color={previewTier?.cardColor ?? "tier-a"}
            finish={previewTier?.cardFinish ?? "normal"}
            imageUrl={previewTier?.imageUrl ?? null}
            label="Sample ticket"
            shape={previewTier?.cardStyle ?? "solid"}
            textColor={previewTier?.cardTextColor ?? "white"}
          >
            <div className="flex min-h-[120px] flex-col justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-extrabold">
                  {event?.title || "Your event"}
                </p>
                <p className="mt-1 truncate text-[9px] font-semibold opacity-85">
                  {previewTier?.name || "Ticket tier"}
                </p>
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] font-extrabold">
                  {previewTier?.name || "Ticket tier"}
                </span>
                <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-lg bg-ticket-white p-1.5 text-ticket-black">
                  <QrCode aria-hidden="true" className="h-full w-full" strokeWidth={1.5} />
                </span>
              </div>
            </div>
          </TicketCardFace>
          <p className="mt-2 text-center text-[9.5px] font-semibold leading-4 text-ink-3">
            Sample card only. No ticket or QR code has been issued.
          </p>
        </aside>
      </div>

      {error ? (
        <p className="mt-3 text-[11px] font-semibold text-live" role="alert">
          {error}
        </p>
      ) : null}

      <WizardStepFooter
        isPending={isPending}
        previousHref={
          event
            ? `/onboarding/event?eventId=${encodeURIComponent(event.id)}`
            : "/onboarding/event?new=1"
        }
        submitLabel="Save and continue"
      />
    </form>
  );
}
