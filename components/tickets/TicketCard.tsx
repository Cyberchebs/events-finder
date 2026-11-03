"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { TicketCardFace } from "@/components/tickets/TicketCardFace";

export type TicketCardData = {
  id: string;
  orderId: string;
  qrToken: string;
  status: "issued" | "used" | "void";
  scannedAt: string | null;
  tierName: string;
  tierColor: string | null;
  tierImageUrl: string | null;
  cardStyle: "solid" | "torn";
  cardFinish: "normal" | "metallic";
  cardTextColor: "black" | "white";
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    format: "in_person" | "online";
    city: string | null;
    venueAddress: string | null;
  };
};

type Props = {
  ticket: TicketCardData;
  highlighted: boolean;
};

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function getCalendarUrl(ticket: TicketCardData): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ticket.event.title,
    dates: `${new Date(ticket.event.startsAt).toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}/${new Date(ticket.event.endsAt).toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    details: `${ticket.tierName} ticket`,
  });
  if (ticket.event.venueAddress) {
    params.set("location", ticket.event.venueAddress);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function TicketCard({ ticket, highlighted }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const location =
    ticket.event.format === "online"
      ? "Online event"
      : [ticket.event.venueAddress, ticket.event.city].filter(Boolean).join(", ") ||
        "Location shared by organizer";

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(ticket.qrToken, { margin: 1, width: 300 })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error: unknown) => {
        console.error("[tickets:qr] QR code rendering failed", error);
        if (active) {
          setQrError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [ticket.qrToken]);

  return (
    <article
      className={`rounded-2xl ${
        highlighted ? "ring-2 ring-brand-line" : ""
      }`}
    >
      <TicketCardFace
        color={ticket.tierColor}
        finish={ticket.cardFinish}
        imageUrl={ticket.tierImageUrl}
        label={`${ticket.event.title} ticket`}
        qrImageUrl={qrDataUrl}
        shape={ticket.cardStyle}
        textColor={ticket.cardTextColor}
      >
        <div className="flex min-h-[150px] items-center justify-between gap-3 sm:min-h-[170px]">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[9px] font-extrabold uppercase tracking-wide">
                {ticket.tierName}
              </p>
              <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[9px] font-extrabold text-ok-ink">
                Valid
              </span>
            </div>
            <h2 className="mt-3 line-clamp-2 text-[18px] font-extrabold leading-6">
              {ticket.event.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[10.5px] font-semibold leading-4 opacity-85">
              {location}
            </p>
            <p className="mt-3 text-[10px] font-bold">
              {formatEventDate(ticket.event.startsAt)}
            </p>
            <p className="mt-2 text-[9px] font-extrabold uppercase tracking-wide opacity-75">
              One ticket · One entry
            </p>
          </div>
          <div className="ticket-card-qr-overlay flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-xl bg-ticket-white p-2 text-ticket-black shadow-sm sm:h-[104px] sm:w-[104px]">
            {qrDataUrl ? (
              <Image
                alt={`QR code for ${ticket.event.title}`}
                className="h-full w-full"
                height={300}
                src={qrDataUrl}
                unoptimized
                width={300}
              />
            ) : qrError ? (
              <p role="alert" className="text-center text-[9px] font-semibold text-live-ink">
                QR unavailable
              </p>
            ) : (
              <span className="text-center text-[9px] font-semibold text-ink-3">
                Preparing QR
              </span>
            )}
          </div>
        </div>
      </TicketCardFace>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <button
          aria-expanded={showDetails}
          className="text-[10.5px] font-bold text-brand hover:underline"
          onClick={() => setShowDetails((current) => !current)}
          type="button"
        >
          {showDetails ? "Hide details" : "Ticket details"}
        </button>
        {ticket.event.format === "online" ? (
          <Link
            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-ink-2 hover:text-brand"
            href={`/my-tickets/${ticket.id}/join`}
          >
            <Video aria-hidden="true" className="h-3.5 w-3.5" />
            Join online event
          </Link>
        ) : null}
        {ticket.event.format === "online" && process.env.NODE_ENV === "development" ? (
          <Link
            className="text-[10.5px] font-bold text-ink-2 hover:text-brand"
            href="/preview/online-join"
          >
            Preview join screen
          </Link>
        ) : null}
        <a
          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-ink-2 hover:text-brand"
          href={getCalendarUrl(ticket)}
          rel="noreferrer"
          target="_blank"
        >
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          Add to calendar
        </a>
        {ticket.event.format === "in_person" && ticket.event.venueAddress ? (
          <a
            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-ink-2 hover:text-brand"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.event.venueAddress)}`}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            Directions
          </a>
        ) : null}
      </div>

      {showDetails ? (
        <div className="mt-2 rounded-2xl border border-border bg-surface-2 p-4">
          <dl className="grid gap-3 text-[11px] sm:grid-cols-2">
            <div>
              <dt className="font-bold text-ink-3">Ticket</dt>
              <dd className="mt-1 font-semibold text-ink">{ticket.tierName}</dd>
            </div>
            <div>
              <dt className="font-bold text-ink-3">Event time</dt>
              <dd className="mt-1 font-semibold text-ink">{formatEventDate(ticket.event.startsAt)}</dd>
            </div>
            {ticket.scannedAt ? (
              <div>
                <dt className="font-bold text-ink-3">Checked in</dt>
                <dd className="mt-1 font-semibold text-ink">{formatEventDate(ticket.scannedAt)}</dd>
              </div>
            ) : null}
          </dl>
          {qrDataUrl ? (
            <div className="mt-4 flex justify-center rounded-xl border border-border bg-surface p-4">
              <Image
                alt={`Full-size QR code for ${ticket.event.title}`}
                className="h-56 w-56"
                height={300}
                src={qrDataUrl}
                unoptimized
                width={300}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
