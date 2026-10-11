"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Globe, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
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
      posthog.capture("google_sign_in_started");

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
        posthog.capture("account_signup_submitted");

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
        posthog.capture("email_sign_in_submitted");

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError("Email or password is incorrect.");
          return;
        }

        posthog.capture("email_sign_in_succeeded");
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(20,18,32,0.06),0_8px_24px_rgba(20,18,32,0.06)] sm:p-7">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand text-lg font-extrabold text-brand-ink">
            T
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-3">
              Tik-Booth account
            </p>
            <h1 className="text-[24px] font-extrabold tracking-[-0.04em] text-ink">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] font-bold text-ink transition-colors hover:bg-surface"
          disabled={isGoogleLoading || isSubmitting}
        >
          <Globe className="h-4 w-4" />
          {isGoogleLoading ? "Connecting…" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
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

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-[12px] text-ink-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-brand" />
          <p>
            Everyone signs up the same way. You can become an organizer any time after you join.
          </p>
        </div>
      </div>
    </main>
  );
}
