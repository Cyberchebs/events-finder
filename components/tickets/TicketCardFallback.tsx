"use client";

import Image from "next/image";
import type {
  TicketCardFinish,
  TicketCardShape,
  TicketCardTextColor,
} from "@/components/tickets/TicketCardTypes";

type Props = {
  color: string | null;
  finish: TicketCardFinish;
  imageUrl: string | null;
  shape: TicketCardShape;
  textColor: TicketCardTextColor;
  visible: boolean;
};

const fallbackColorClasses: Record<string, string> = {
  "tier-a": "bg-gradient-to-br from-tier-a-1 to-tier-a-2",
  "tier-b": "bg-gradient-to-br from-tier-b-1 to-tier-b-2",
  "tier-c": "bg-gradient-to-br from-tier-c-1 to-tier-c-2",
  ink: "bg-ink",
  yellow: "bg-warn",
  red: "bg-live",
};

function isCustomHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function TicketCardFallback({
  color,
  finish,
  imageUrl,
  shape,
  textColor,
  visible,
}: Props) {
  const colorClass = color ? fallbackColorClasses[color] : fallbackColorClasses["tier-a"];
  const isCustomColor = color !== null && isCustomHexColor(color);

  return (
    <div
      aria-hidden="true"
      className={`ticket-card-fallback absolute inset-0 overflow-hidden rounded-2xl border border-ticket-white/25 ${
        shape === "torn" ? "ticket-card-face--torn" : ""
      } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        className={`absolute inset-0 ${isCustomColor ? "" : colorClass}`}
        style={isCustomColor ? { backgroundColor: color } : undefined}
      />
      {imageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover opacity-40"
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          src={imageUrl}
          unoptimized
        />
      ) : null}
      {finish === "metallic" ? (
        <span aria-hidden="true" className="ticket-card-metallic absolute inset-0" />
      ) : null}
      <span
        aria-hidden="true"
        className={`absolute inset-0 ${
          textColor === "black" ? "bg-ticket-black/5" : "bg-ticket-black/10"
        }`}
      />
    </div>
  );
}
