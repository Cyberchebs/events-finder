"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Globe, Mail, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = {
  callbackError: boolean;
  nextPath: string;
};

export function LoginForm({ callbackError, nextPath }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    callbackError ? "We couldn't complete sign-in. Please try again." : null,
  );

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setIsGoogleLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (oauthError) {
        setError("Google sign-in is unavailable right now. Please try again.");
      }
    } catch (error) {
      console.error("[login:google] sign-in failed", error);
      setError("Google sign-in is unavailable right now. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (signUpError) {
          setError("We couldn't create your account. Check your details and try again.");
          return;
        }

        if (data.user && !data.session) {
          setMessage("Check your inbox for a confirmation email to finish creating your account.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError("Email or password is incorrect.");
          return;
        }
      }

      router.push(nextPath);
    } catch (error) {
      console.error("[login:email] authentication failed", error);
      setError("We couldn't complete that request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto grid w-full max-w-[1080px] items-center gap-8 md:grid-cols-[minmax(0,1fr)_440px] md:gap-12">
        <section className="hidden md:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-[10px] font-extrabold text-brand">
            <Ticket aria-hidden="true" className="h-3.5 w-3.5" />
            Built for the good times
          </div>
          <h2 className="max-w-[460px] text-[30px] font-extrabold leading-tight tracking-tight text-ink">
            Your city. Your people. Your next plan.
          </h2>
          <p className="mt-3 max-w-[440px] text-[13px] font-medium leading-6 text-ink-2">
            From nights out to new experiences, find events worth showing up for.
          </p>
          <div className="mt-7 max-w-[440px] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex h-[210px] items-end bg-gradient-to-br from-tier-a-1 to-tier-a-2 p-5">
              <div className="rounded-xl border border-brand-line bg-surface/95 px-4 py-3">
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-brand">
                  Discover something good
                </p>
                <p className="mt-1 text-[16px] font-extrabold text-ink">
                  Make room for a new memory.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4 text-[11px] font-semibold text-ink-2">
              <MapPin aria-hidden="true" className="h-4 w-4 text-brand" />
              Local events, easy tickets, all in one place.
            </div>
          </div>
        </section>

        <div className="w-full rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-ink">
              <Ticket aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-[16px] font-extrabold tracking-tight text-ink">Tik-Booth</span>
          </div>

          <div className="mb-6">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand">
              Your good time starts here
            </p>
            <h1 className="mt-1 text-[23px] font-extrabold tracking-tight text-ink">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-[12px] font-medium text-ink-2">
              Log in or sign up for the best of Lagos and beyond.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-[12px] font-bold text-ink transition-colors hover:bg-surface-2"
            disabled={isGoogleLoading || isSubmitting}
          >
            <Globe className="h-4 w-4" />
            {isGoogleLoading ? "Connecting…" : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] font-bold text-ink-3">
            <span className="h-px flex-1 bg-border" />
            or continue with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">
              Email
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-line">
              <Mail className="h-4 w-4 text-ink-3" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
              placeholder="At least 6 characters"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-live-soft bg-live-soft px-3 py-2 text-[12px] font-medium text-live-ink">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-lg border border-ok-soft bg-ok-soft px-3 py-2 text-[12px] font-medium text-ok-ink">
              {message}
            </p>
          ) : null}

          <div className="grid grid-cols-2 rounded-xl border border-border bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setMessage(null);
              }}
              className={`rounded-lg px-3 py-2 text-[12px] font-bold ${mode === "signin" ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setMessage(null);
              }}
              className={`rounded-lg px-3 py-2 text-[12px] font-bold ${mode === "signup" ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}
            >
              Sign up
            </button>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[13px] font-bold text-brand-ink transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || isGoogleLoading}
          >
            {isSubmitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-[11px] leading-5 text-ink-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-brand" />
            <p>
              Everyone signs up the same way. You can become an organizer any time after you join.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
