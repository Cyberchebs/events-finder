"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Copy, DoorOpen, Plus, ShieldCheck, ShieldOff, X } from "lucide-react";
import {
  createDoorStaffAccess,
  revokeDoorStaffAccess,
} from "@/actions/door-staff";

type Gate = {
  id: string;
  label: string;
  createdAt: string;
  revokedAt: string | null;
};

type Props = {
  eventId: string;
  eventTitle: string;
  gates: Gate[];
};

export function DoorStaffManager({ eventId, eventTitle, gates }: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [gateLabel, setGateLabel] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!generatedLink) {
      return;
    }

    let active = true;
    void QRCode.toDataURL(generatedLink, { margin: 1, width: 300 })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error: unknown) => {
        console.error("[DoorStaffManager:qr] QR code rendering failed", error);
        if (active) {
          setMessage("The gate was created, but its QR code could not be generated.");
        }
      });

    return () => {
      active = false;
    };
  }, [generatedLink]);

  async function createGate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await createDoorStaffAccess(eventId, gateLabel);
      if (!result.success) {
        setMessage(result.error);
        return;
      }

      const link = `${window.location.origin}/scan/${eventId}?token=${encodeURIComponent(result.data.token)}`;
      setGeneratedLink(link);
      router.refresh();
    } catch (error) {
      console.error("[DoorStaffManager:createGate] request failed", error);
      setMessage("We couldn't create this gate link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!generatedLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedLink);
      setMessage("Gate link copied. Share it only with trusted door staff.");
    } catch (error) {
      console.error("[DoorStaffManager:copyLink] clipboard write failed", error);
      setMessage("Could not copy the link. Select and copy it instead.");
    }
  }

  async function revokeGate(accessId: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = await revokeDoorStaffAccess(eventId, accessId);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage("Gate link revoked.");
      router.refresh();
    } catch (error) {
      console.error("[DoorStaffManager:revokeGate] request failed", error);
      setMessage("We couldn't revoke this gate link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    setIsAdding(false);
    setGeneratedLink(null);
    setQrDataUrl(null);
    setGateLabel("");
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
              setMessage("");
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add gate
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-4 md:px-5">
            <h2 className="text-[16px] font-extrabold text-ink">Your gates</h2>
            <p className="mt-1 text-[11px] font-semibold text-ink-3">
              Each gate has its own revocable access link.
            </p>
          </div>
          {gates.length ? (
            <ul className="divide-y divide-border">
              {gates.map((gate) => {
                const active = !gate.revokedAt;
                return (
                  <li
                    className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5 ${active ? "" : "opacity-55"}`}
                    key={gate.id}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-brand-soft text-brand" : "bg-sunken text-ink-3"}`}
                      >
                        {active ? (
                          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <ShieldOff aria-hidden="true" className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-ink">{gate.label}</p>
                        <p className="mt-1 text-[10.5px] font-semibold text-ink-3">
                          Created {new Date(gate.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${active ? "bg-ok-soft text-ok-ink" : "bg-sunken text-ink-3"}`}
                      >
                        {active ? "ACTIVE" : "REVOKED"}
                      </span>
                      {active ? (
                        <button
                          className="rounded-md border border-border px-3 py-2 text-[10.5px] font-bold text-live hover:bg-surface-2 disabled:opacity-60"
                          disabled={busy}
                          onClick={() => void revokeGate(gate.id)}
                          type="button"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-ink-3">
                <DoorOpen aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-ink-2">No gates yet</p>
              <p className="mt-1 text-[11px] font-semibold text-ink-3">
                Add a gate to create a private check-in link for door staff.
              </p>
            </div>
          )}
        </section>

        <p aria-live="polite" className="mt-3 min-h-5 text-[11px] font-semibold text-ink-3">
          {message}
        </p>
      </main>

      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4">
          <section
            aria-labelledby="gate-modal-title"
            aria-modal="true"
            className="my-auto w-full max-w-[440px] rounded-2xl border border-border bg-surface p-5 shadow-lg sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="gate-modal-title" className="text-[18px] font-extrabold text-ink">
                  {generatedLink ? "Gate link ready" : "Add a gate"}
                </h2>
                <p className="mt-1 text-[11px] font-semibold text-ink-3">
                  {generatedLink
                    ? `${gateLabel || "Share this link"} · ${eventTitle}`
                    : "Create a separate access link for this entrance."}
                </p>
              </div>
              <button
                aria-label="Close"
                className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2"
                onClick={closeModal}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {generatedLink ? (
              <div className="mt-5">
                <div className="rounded-xl border border-border bg-surface-2 p-3 text-center">
                  {qrDataUrl ? (
                    <Image
                      alt="QR code for the door-staff access link"
                      className="mx-auto rounded-lg bg-surface p-2"
                      height={220}
                      src={qrDataUrl}
                      unoptimized
                      width={220}
                    />
                  ) : (
                    <p className="py-16 text-[11px] font-semibold text-ink-3">
                      Preparing secure link QR…
                    </p>
                  )}
                  <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
                    Scan to open the check-in screen
                  </p>
                </div>
                <label className="mt-4 block text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
                  Shareable link — shown once
                  <input
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-[11px] font-medium text-ink"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    value={generatedLink}
                  />
                </label>
                <button
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95"
                  onClick={() => void copyLink()}
                  type="button"
                >
                  <Copy aria-hidden="true" className="h-4 w-4" />
                  Copy secure link
                </button>
                <p className="mt-3 text-[10.5px] font-semibold leading-4 text-ink-3">
                  Anyone with this link can check in tickets for this event. Share it only with trusted staff.
                </p>
              </div>
            ) : (
              <form className="mt-5" onSubmit={(event) => void createGate(event)}>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
                  Gate name
                  <input
                    autoFocus
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-[13px] font-medium text-ink outline-none focus:ring-2 focus:ring-brand-line"
                    maxLength={60}
                    onChange={(event) => setGateLabel(event.currentTarget.value)}
                    placeholder="e.g. North entrance"
                    required
                    value={gateLabel}
                  />
                </label>
                <p aria-live="polite" className="mt-2 min-h-5 text-[11px] font-semibold text-ink-2">
                  {message}
                </p>
                <button
                  className="mt-3 h-10 w-full rounded-md bg-brand px-4 text-[12px] font-bold text-brand-ink hover:opacity-95 disabled:opacity-60"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? "Creating link…" : "Create gate link"}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
