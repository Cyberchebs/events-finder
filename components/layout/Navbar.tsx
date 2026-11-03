"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Plus, Ticket } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  currentPath?: string;
};

export function Navbar({ currentPath = "/" }: Props) {
  const [authStatus, setAuthStatus] = useState<"checking" | "logged-in" | "logged-out">("checking");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [avatarLabel, setAvatarLabel] = useState("?");

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session?.user ? "logged-in" : "logged-out");
      setAvatarLabel(
        session?.user?.email?.slice(0, 2).toLocaleUpperCase() ?? "?",
      );
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
    <header className="sticky top-0 z-40 hidden w-full border-b border-border bg-surface md:block">
      <div className="mx-auto flex h-[54px] max-w-[1240px] items-center justify-between gap-5 px-5">
        <div className="flex min-w-0 items-center gap-8">
          <Link aria-label="Tik-Booth home" href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-[27px] w-[27px] items-center justify-center rounded-lg bg-brand text-brand-ink">
              <Ticket aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">Tik-Booth</span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-6 text-[13px]">
            <Link
              aria-current={currentPath === "/" ? "page" : undefined}
              href="/"
              className={`font-semibold transition-colors ${
                currentPath === "/"
                  ? "font-bold text-brand"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              Discover
            </Link>
            <Link
              aria-current={currentPath === "/my-tickets" ? "page" : undefined}
              href="/my-tickets"
              className={`font-semibold transition-colors ${
                currentPath === "/my-tickets"
                  ? "font-bold text-brand"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              My tickets
            </Link>
            <Link
              aria-current={currentPath.startsWith("/dashboard") ? "page" : undefined}
              href="/dashboard"
              className={`font-semibold transition-colors ${
                currentPath.startsWith("/dashboard")
                  ? "font-bold text-brand"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {authStatus === "checking" ? (
            <span
              aria-label="Checking sign-in status"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3" />
            </span>
          ) : authStatus === "logged-in" ? (
            <div className="flex items-center gap-2">
              <Link
                aria-label="Open profile"
                aria-current={currentPath === "/profile" ? "page" : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-[11px] font-extrabold text-brand transition-colors hover:bg-surface-2"
                href="/profile"
              >
                {avatarLabel}
              </Link>
              <button
                aria-label={isSigningOut ? "Logging out" : "Log out"}
                aria-busy={isSigningOut}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-wait disabled:opacity-70"
                disabled={isSigningOut}
                onClick={handleSignOut}
                title="Log out"
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center justify-center rounded-lg border border-line-2 bg-surface px-4 text-[12px] font-bold text-ink transition-colors hover:bg-surface-2"
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
            href="/onboarding/event?new=1"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-[12px] font-bold text-brand-ink transition-opacity hover:opacity-95"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create event
          </Link>
        </div>
      </div>
    </header>
  );
}
