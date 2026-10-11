"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  currentPath?: string;
};

export function Navbar({ currentPath = "/" }: Props) {
  const [authStatus, setAuthStatus] = useState<"checking" | "logged-in" | "logged-out">("checking");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session?.user ? "logged-in" : "logged-out");
      setIsSigningOut(false);
      setSignOutFailed(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutFailed(false);

    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        console.error("[Navbar:signOut] failed", error);
        setIsSigningOut(false);
        setSignOutFailed(true);
      }
    } catch (error) {
      console.error("[Navbar:signOut] failed", error);
      setIsSigningOut(false);
      setSignOutFailed(true);
    }
  };

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full border-b border-border bg-surface">
      <div className="mx-auto flex h-[54px] max-w-[1240px] items-center justify-between px-5">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-brand text-sm font-extrabold text-brand-ink">
              T
            </div>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              Tik-Booth
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-6 text-[13px]">
            <Link
              href="/"
              className={`font-semibold transition-colors ${
                currentPath === "/"
                  ? "font-bold text-ink"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              Discover
            </Link>
            <Link
              href="/my-tickets"
              className={`font-semibold transition-colors ${
                currentPath === "/my-tickets"
                  ? "font-bold text-ink"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              My tickets
            </Link>
            <Link
              href="/dashboard"
              className={`font-semibold transition-colors ${
                currentPath.startsWith("/dashboard")
                  ? "font-bold text-ink"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              Dashboard
            </Link>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {authStatus === "checking" ? (
            <span
              aria-label="Checking sign-in status"
              className="flex h-[42px] w-[112px] items-center justify-center rounded-md border border-line-2 bg-surface px-4"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3" />
            </span>
          ) : authStatus === "logged-in" ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              aria-busy={isSigningOut}
              className="flex h-[42px] w-[112px] items-center justify-center gap-2 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-surface-2 disabled:cursor-wait disabled:opacity-70"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              {isSigningOut ? "Logging out…" : "Log out"}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex h-[42px] w-[112px] items-center justify-center rounded-md border border-line-2 bg-surface px-4 text-[13px] font-bold text-ink transition-colors hover:bg-surface-2"
            >
              Log in
            </Link>
          )}
          {signOutFailed ? (
            <span role="alert" className="text-[11px] font-semibold text-live">
              Could not log out. Try again.
            </span>
          ) : null}
          <Link
            href="/onboarding/profile"
            className="flex h-[42px] items-center rounded-md bg-brand px-4 text-[13px] font-bold text-brand-ink transition-opacity hover:opacity-95"
          >
            Create event
          </Link>
        </div>
      </div>
    </header>
  );
}

