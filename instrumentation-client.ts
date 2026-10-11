import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { createClient } from "@/utils/supabase/client";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !projectToken
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_pageview: true,
    autocapture: true,
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });

  const supabase = createClient();
  let identifiedUserId: string | null = null;

  const identifyUser = (user: User) => {
    if (identifiedUserId === user.id) {
      return;
    }

    if (identifiedUserId) {
      posthog.reset();
    }

    posthog.identify(user.id);
    identifiedUserId = user.id;
  };

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      identifiedUserId = null;
      posthog.reset();
      return;
    }

    if (session?.user) {
      identifyUser(session.user);
    }
  });
}
