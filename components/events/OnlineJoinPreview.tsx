"use client";

import { useState } from "react";
import { OnlineJoinLock } from "@/components/events/OnlineJoinLock";

type PreviewMode = "locked" | "unlocked";

export function OnlineJoinPreview() {
  const [mode, setMode] = useState<PreviewMode>("locked");
  const [message, setMessage] = useState("");

  function showJoinPreview() {
    setMessage("Preview only — this mock screen does not open a real organizer link.");
  }

  return (
    <>
      <header className="mx-auto mb-5 flex w-full max-w-[440px] items-center justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
          UI preview
        </p>
        <div aria-label="Preview state" className="flex gap-2" role="group">
          <button
            aria-pressed={mode === "locked"}
            className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
              mode === "locked" ? "bg-brand text-brand-ink" : "bg-surface text-ink-2"
            }`}
            onClick={() => {
              setMode("locked");
              setMessage("");
            }}
            type="button"
          >
            Locked
          </button>
          <button
            aria-pressed={mode === "unlocked"}
            className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
              mode === "unlocked" ? "bg-brand text-brand-ink" : "bg-surface text-ink-2"
            }`}
            onClick={() => {
              setMode("unlocked");
              setMessage("");
            }}
            type="button"
          >
            Unlocked
          </button>
        </div>
      </header>
      <OnlineJoinLock
        countdownLabel="02:14:08"
        eventTitle="The Future of Design Summit"
        mode={mode}
        onJoin={mode === "unlocked" ? showJoinPreview : undefined}
      />
      {message ? (
        <p aria-live="polite" className="mx-auto mt-3 max-w-[440px] text-center text-[11px] font-semibold text-ink-3">
          {message}
        </p>
      ) : null}
    </>
  );
}
