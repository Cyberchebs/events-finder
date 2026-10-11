import { SeverityNumber } from "@opentelemetry/api-logs";
import { posthogLoggerProvider } from "@/instrumentation";

const authCallbackLogger = posthogLoggerProvider?.getLogger("posthog-auth-callback");

type AuthCallbackOutcome = "missing_code" | "session_exchange_failed" | "session_exchanged";

export function logAuthCallback(outcome: AuthCallbackOutcome) {
  authCallbackLogger?.emit({
    body: "Authentication callback processed",
    severityNumber: outcome === "session_exchanged" ? SeverityNumber.INFO : SeverityNumber.WARN,
    attributes: { outcome },
  });
}

export async function flushPostHogLogs() {
  await posthogLoggerProvider?.forceFlush();
}
