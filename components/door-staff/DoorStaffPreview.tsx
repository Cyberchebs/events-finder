"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { Copy, DoorOpen, Plus, ShieldCheck, ShieldOff, X } from "lucide-react";

type Gate = {
  id: string;
  label: string;
  created: string;
  status: "active" | "revoked";
  scans: number;
};

type Props = {
  eventId: string;
  eventTitle: string;
};

const initialGates: Gate[] = [
  { id: "gate-north", label: "North entrance", created: "Created today", status: "active", scans: 76 },
  { id: "gate-courtyard", label: "Courtyard gate", created: "Created yesterday", status: "active", scans: 34 },
  { id: "gate-vip", label: "VIP entrance", created: "Created 12 Oct", status: "revoked", scans: 0 },
];

export function DoorStaffPreview({ eventId, eventTitle }: Props) {
  const [gates, setGates] = useState(initialGates);
  const [isAdding, setIsAdding] = useState(false);
  const [gateLabel, setGateLabel] = useState("");
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!previewLink) {
      return;
    }

    let active = true;
    void QRCode.toDataURL(previewLink, { margin: 1, width: 300 })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error: unknown) => {
        console.error("[DoorStaffPreview:qr] QR code rendering failed", error);
        if (active) {
          setMessage("The preview QR code could not be generated.");
        }
      });

    return () => {
      active = false;
    };
  }, [previewLink]);

  function createPreviewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = gateLabel.trim();
    if (!label) {
      return;
    }

    setGates((current) => [
      {
        id: `preview-${Date.now()}`,
        label,
        created: "Created just now",
        status: "active",
        scans: 0,
      },
      ...current,
    ]);
    setQrDataUrl(null);
    setPreviewLink(
      `${window.location.origin}/scan/${eventId}?token=preview-only`,
    );
  }

  async function copyPreviewLink() {
    if (!previewLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(previewLink);
      setMessage("Preview link copied.");
    } catch (error) {
      console.error("[DoorStaffPreview:copy] preview link could not be copied", error);
      setMessage("Could not copy the preview link. Select and copy it instead.");
    }
  }

  function closeModal() {
    setIsAdding(false);
    setGateLabel("");
    setPreviewLink(null);
    setQrDataUrl(null);
    setMessage("");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
        <Link
          className="mb-5 inline-flex items-center gap-2 text-[12px] font-bold text-ink-2 hover:text-brand"
          href={`/dashboard/${eventId}`}
        >
          <span aria-hidden="true">←</span>
          Event dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
              Gate management
            </p>
            <h1 className="mt-1 text-[23px] font-extrabold tracking-tight text-ink">
              Door staff
            </h1>
            <p className="mt-1 text-[12px] font-medium text-ink-3">{eventTitle}</p>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
            onClick={() => {
              setIsAdding(true);
              setPreviewLink(null);
              setQrDataUrl(null);
              setMessage("");
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add gate
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
            <div>
              <h2 className="text-[16px] font-extrabold text-ink">Your gates</h2>
              <p className="mt-1 text-[11px] font-semibold text-ink-3">
                Each gate has its own shareable access link.
              </p>
            </div>
            <span className="rounded-full bg-sunken px-2.5 py-1 text-[10px] font-extrabold text-ink-3">
              PREVIEW DATA
            </span>
          </div>
          <ul className="divide-y divide-border">
            {gates.map((gate) => (
              <li
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5 ${
                  gate.status === "revoked" ? "opacity-65" : ""
                }`}
                key={gate.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      gate.status === "active"
                        ? "bg-brand-soft text-brand"
                        : "bg-sunken text-ink-3"
                    }`}
                  >
                    {gate.status === "active" ? (
                      <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <ShieldOff aria-hidden="true" className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-ink">{gate.label}</p>
                    <p className="mt-1 text-[10.5px] font-semibold text-ink-3">
                      {gate.created} · {gate.scans} check-ins
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                      gate.status === "active"
                        ? "bg-ok-soft text-ok-ink"
                        : "bg-sunken text-ink-3"
                    }`}
                  >
                    {gate.status === "active" ? "ACTIVE" : "REVOKED"}
                  </span>
                  <button
                    className="rounded-md border border-border px-3 py-2 text-[10.5px] font-bold text-live hover:bg-surface-2"
                    onClick={() => {
                      setGates((current) =>
                        current.map((item) =>
                          item.id === gate.id
                            ? { ...item, status: item.status === "active" ? "revoked" : "active" }
                            : item,
                        ),
                      );
                    }}
                    type="button"
                  >
                    {gate.status === "active" ? "Revoke" : "Re-enable"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-4 pb-4 text-[10.5px] font-semibold text-ink-3 md:px-5">
            Revoked links are shown here for reference. This screen is using local preview state only.
          </p>
        </section>
      </main>

      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
          <section
            aria-labelledby="gate-modal-title"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-lg sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
                  Door staff access
                </p>
                <h2 className="mt-1 text-[18px] font-extrabold text-ink" id="gate-modal-title">
                  {previewLink ? "Gate link preview" : "Add a gate"}
                </h2>
              </div>
              <button
                aria-label="Close dialog"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                onClick={closeModal}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {previewLink ? (
              <div className="mt-5">
                <p className="text-[12px] font-semibold leading-5 text-ink-2">
                  This preview link is not a real staff credential and will not open a live scanner.
                </p>
                <div className="mt-4 flex justify-center rounded-xl border border-border bg-surface p-4">
                  {qrDataUrl ? (
                    <Image
                      alt="Preview QR code for the sample gate link"
                      className="h-48 w-48"
                      height={300}
                      src={qrDataUrl}
                      unoptimized
                      width={300}
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-sunken text-[11px] font-semibold text-ink-3">
                      Preparing preview QR
                    </div>
                  )}
                </div>
                <label className="mt-4 block text-[10.5px] font-extrabold uppercase tracking-wide text-ink-3" htmlFor="preview-gate-link">
                  Sample link
                </label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-[11px] font-medium text-ink-2"
                  id="preview-gate-link"
                  readOnly
                  value={previewLink}
                />
                {message ? (
                  <p aria-live="polite" className="mt-2 text-[11px] font-semibold text-ink-2">
                    {message}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 bg-surface px-4 text-[11px] font-bold text-ink hover:bg-surface-2"
                    onClick={() => void copyPreviewLink()}
                    type="button"
                  >
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                    Copy preview link
                  </button>
                  <button
                    className="h-10 rounded-md bg-brand px-4 text-[11px] font-bold text-brand-ink hover:opacity-95"
                    onClick={closeModal}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="mt-5" onSubmit={createPreviewLink}>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wide text-ink-3" htmlFor="gate-label">
                  Gate label
                </label>
                <input
                  autoComplete="off"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-[13px] font-medium text-ink outline-none focus:ring-2 focus:ring-brand-line"
                  id="gate-label"
                  maxLength={60}
                  onChange={(event) => setGateLabel(event.target.value)}
                  placeholder="e.g. Main entrance"
                  required
                  value={gateLabel}
                />
                <p className="mt-2 text-[11px] leading-5 text-ink-3">
                  A unique link will be created for this gate. Anyone with the link can scan tickets for this event.
                </p>
                {message ? (
                  <p aria-live="polite" className="mt-2 text-[11px] font-semibold text-ink-2">
                    {message}
                  </p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="h-10 rounded-md border border-line-2 bg-surface px-4 text-[11px] font-bold text-ink hover:bg-surface-2"
                    onClick={closeModal}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-[11px] font-bold text-brand-ink hover:opacity-95"
                    type="submit"
                  >
                    <DoorOpen aria-hidden="true" className="h-4 w-4" />
                    Generate preview
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
