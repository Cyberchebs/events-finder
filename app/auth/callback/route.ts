import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { flushPostHogLogs, logAuthCallback } from "@/utils/posthog-logs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";

  if (!code) {
    logAuthCallback("missing_code");
    await flushPostHogLogs();
    return NextResponse.redirect(new URL("/login?error=authentication_failed", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    logAuthCallback("session_exchange_failed");
    await flushPostHogLogs();
    return NextResponse.redirect(new URL("/login?error=authentication_failed", requestUrl.origin));
  }

  logAuthCallback("session_exchanged");
  await flushPostHogLogs();
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
