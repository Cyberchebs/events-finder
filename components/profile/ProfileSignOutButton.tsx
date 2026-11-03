"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function ProfileSignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setIsPending(true);
    setError(null);
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) {
        console.error("[ProfileSignOutButton] sign-out failed", signOutError);
        setError("Could not log out. Try again.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (caughtError) {
      console.error("[ProfileSignOutButton] sign-out failed", caughtError);
      setError("Could not log out. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        aria-busy={isPending}
        className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-[12px] font-bold text-live transition-colors hover:bg-live-soft disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={() => void signOut()}
        type="button"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        {isPending ? "Logging out…" : "Log out"}
      </button>
      {error ? (
        <p aria-live="polite" className="mt-1 text-[10px] font-semibold text-live" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
