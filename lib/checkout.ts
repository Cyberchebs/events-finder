import "server-only";

import { MAX_TICKETS_PER_ORDER } from "@/lib/constants";
import { paymentProvider } from "@/lib/paystack-provider";
import { createTicketPayloads } from "@/lib/qr";
import { checkCheckoutRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type StartCheckoutInput = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  idempotencyKey: string;
};

export type StartCheckoutResult =
  | {
      success: true;
      data:
        | { kind: "payment"; authorizationUrl: string; reference: string; expiresAt: string }
        | { kind: "free"; orderId: string };
    }
  | {
      success: false;
      error: string;
      reservationExpiresAt?: string;
      statusCode?: 400 | 401 | 409 | 429 | 500 | 503;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(reason: unknown): string {
  switch (reason) {
    case "sold_out_or_unavailable":
      return "This ticket tier is no longer available.";
    case "checkout_already_started":
      return "This checkout has already been started. Refresh the page to continue.";
    case "idempotency_conflict":
      return "This checkout request no longer matches your ticket selection. Refresh the page.";
    case "invalid_request":
    case "invalid_ticket_payloads":
    case "invalid_amount":
      return "Checkout details are invalid. Refresh the page and try again.";
    default:
      return "Checkout could not be started. Try again.";
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isSafeSiteUrl(siteUrl: string): boolean {
  try {
    const origin = new URL(siteUrl);
    return (
      (origin.protocol === "https:" || origin.hostname === "localhost") &&
      origin.username.length === 0 &&
      origin.password.length === 0
    );
  } catch {
    return false;
  }
}

function buildCallbackUrl(siteUrl: string, eventId: string, reference: string): string | null {
  try {
    if (!isSafeSiteUrl(siteUrl)) {
      return null;
    }
    const origin = new URL(siteUrl);
    const callbackUrl = new URL(`/checkout/${eventId}`, origin);
    callbackUrl.searchParams.set("reference", reference);
    return callbackUrl.toString();
  } catch {
    return null;
  }
}

function isSafePaystackAuthorizationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.paystack.com";
  } catch {
    return false;
  }
}

function getMissingPaymentConfiguration(): string[] {
  return [
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "QR_TOKEN_SECRET",
  ].filter((key) => !process.env[key]);
}

export async function startCheckout(
  input: StartCheckoutInput,
  siteUrl: string,
): Promise<StartCheckoutResult> {
  if (
    !isUuid(input.eventId) ||
    !isUuid(input.ticketTypeId) ||
    !isUuid(input.idempotencyKey) ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > MAX_TICKETS_PER_ORDER
  ) {
    return {
      success: false,
      error: "Checkout details are invalid. Refresh the page and try again.",
      statusCode: 400,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      if (authError) {
        console.error("[lib/checkout:startCheckout] user lookup failed", authError);
      }
      return {
        success: false,
        error: "Please sign in to continue checkout.",
        statusCode: 401,
      };
    }

    const rateLimit = await checkCheckoutRateLimit(user.id);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Checkout is temporarily unavailable. Try again shortly.",
        statusCode: 503,
      };
    }
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Too many checkout attempts. Try again shortly.",
        statusCode: 429,
      };
    }

    const { data: ticketType, error: ticketTypeError } = await supabase
      .from("ticket_types")
      .select("event_id, price_kobo")
      .eq("id", input.ticketTypeId)
      .maybeSingle();

    if (ticketTypeError || !ticketType || ticketType.event_id !== input.eventId) {
      if (ticketTypeError) {
        console.error("[lib/checkout:startCheckout] ticket tier lookup failed", ticketTypeError);
      }
      return {
        success: false,
        error: "This ticket tier is no longer available.",
        statusCode: ticketTypeError ? 503 : 409,
      };
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id, ends_at, status")
      .eq("id", input.eventId)
      .eq("status", "published")
      .maybeSingle();

    if (eventError || !event || new Date(event.ends_at).getTime() <= Date.now()) {
      if (eventError) {
        console.error("[lib/checkout:startCheckout] event lookup failed", eventError);
      }
      return {
        success: false,
        error: "This event is no longer available for checkout.",
        statusCode: eventError ? 503 : 409,
      };
    }

    if (ticketType.price_kobo === 0) {
      const missingFreeConfiguration = [
        "QR_TOKEN_SECRET",
        "SUPABASE_SERVICE_ROLE_KEY",
      ].filter((key) => !process.env[key]);
      if (missingFreeConfiguration.length > 0) {
        console.error(
          "[lib/checkout:startCheckout] required free-ticket configuration is missing",
          missingFreeConfiguration,
        );
        return {
          success: false,
          error: "Free tickets are temporarily unavailable.",
          statusCode: 503,
        };
      }
      const ticketPayloads = createTicketPayloads(input.quantity);
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("issue_free_ticket_order", {
        p_ticket_type_id: input.ticketTypeId,
        p_quantity: input.quantity,
        p_idempotency_key: input.idempotencyKey,
        p_user_id: user.id,
        p_ticket_payloads: ticketPayloads,
      });

      if (error) {
        console.error("[lib/checkout:startCheckout] free ticket issuance failed", error);
        return {
          success: false,
          error: "Free tickets could not be issued. Try again.",
          statusCode: 503,
        };
      }

      if (!isRecord(data) || data.ok !== true || typeof data.order_id !== "string") {
        return {
          success: false,
          error: isRecord(data) ? getErrorMessage(data.reason) : "Free tickets could not be issued.",
          statusCode: isRecord(data) && data.reason === "sold_out_or_unavailable" ? 409 : 400,
        };
      }

      return { success: true, data: { kind: "free", orderId: data.order_id } };
    }

    if (!isSafeSiteUrl(siteUrl)) {
      console.error("[lib/checkout:startCheckout] site URL is invalid");
      return {
        success: false,
        error: "Payments are temporarily unavailable.",
        statusCode: 503,
      };
    }

    const missingConfiguration = getMissingPaymentConfiguration();
    if (missingConfiguration.length > 0) {
      console.error(
        "[lib/checkout:startCheckout] required payment configuration is missing",
        missingConfiguration,
      );
      return {
        success: false,
        error: "Payments are temporarily unavailable.",
        statusCode: 503,
      };
    }

    const { data: subaccountCode, error: profileError } = await supabase.rpc(
      "get_event_paystack_subaccount",
      { p_event_id: input.eventId },
    );

    if (profileError || !subaccountCode) {
      if (profileError) {
        console.error("[lib/checkout:startCheckout] organizer payout lookup failed", profileError);
      }
      return {
        success: false,
        error: "Payments are not available for this event yet.",
        statusCode: profileError ? 503 : 409,
      };
    }

    const { data, error } = await supabase.rpc("reserve_ticket_inventory", {
      p_ticket_type_id: input.ticketTypeId,
      p_quantity: input.quantity,
      p_idempotency_key: input.idempotencyKey,
    });

    if (error) {
      console.error("[lib/checkout:startCheckout] inventory reservation failed", error);
      return {
        success: false,
        error: "Tickets could not be reserved. Try again.",
        statusCode: 503,
      };
    }

    if (
      !isRecord(data) ||
      data.ok !== true ||
      typeof data.reservation_id !== "string" ||
      typeof data.total_kobo !== "number" ||
      typeof data.expires_at !== "string" ||
      (data.authorization_url !== null && typeof data.authorization_url !== "string")
    ) {
      return {
        success: false,
        error: isRecord(data) ? getErrorMessage(data.reason) : "Tickets could not be reserved.",
        statusCode:
          isRecord(data) && data.reason === "invalid_request"
            ? 400
            : isRecord(data)
              ? 409
              : 500,
      };
    }

    const expiresAt = data.expires_at;
    const reservationId = data.reservation_id;
    if (data.reused === true) {
      if (
        typeof data.authorization_url !== "string" ||
        !isSafePaystackAuthorizationUrl(data.authorization_url)
      ) {
        return {
          success: false,
          error: "Checkout is still being prepared. Try again in a moment.",
          reservationExpiresAt: expiresAt,
          statusCode: 409,
        };
      }
      return {
        success: true,
        data: {
          kind: "payment",
          authorizationUrl: data.authorization_url,
          reference: reservationId,
          expiresAt,
        },
      };
    }

    if (data.total_kobo <= 0) {
      console.error("[lib/checkout:startCheckout] paid reservation returned a non-positive amount");
      return {
        success: false,
        error: "The ticket price changed. Refresh the page and try again.",
        reservationExpiresAt: expiresAt,
        statusCode: 409,
      };
    }

    const callbackUrl = buildCallbackUrl(siteUrl, input.eventId, reservationId);
    if (!callbackUrl) {
      console.error("[lib/checkout:startCheckout] site URL is invalid");
      return {
        success: false,
        error: "Payments are temporarily unavailable.",
        reservationExpiresAt: expiresAt,
        statusCode: 503,
      };
    }

    const paymentResult = await paymentProvider.initializeTransaction({
      amountKobo: data.total_kobo,
      email: user.email,
      reference: reservationId,
      subaccountCode,
      callbackUrl,
    });

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error,
        reservationExpiresAt: expiresAt,
        statusCode: 503,
      };
    }

    let authorizationUrl: URL;
    try {
      authorizationUrl = new URL(paymentResult.data.authorizationUrl);
    } catch {
      console.error("[lib/checkout:startCheckout] Paystack returned an invalid authorization URL");
      return {
        success: false,
        error: "Payment could not be started. Try again.",
        reservationExpiresAt: expiresAt,
        statusCode: 503,
      };
    }

    if (!isSafePaystackAuthorizationUrl(authorizationUrl.toString()) ||
        paymentResult.data.reference !== reservationId) {
      console.error("[lib/checkout:startCheckout] Paystack returned unexpected transaction details");
      return {
        success: false,
        error: "Payment could not be started. Try again.",
        reservationExpiresAt: expiresAt,
        statusCode: 503,
      };
    }

    const { data: authorizationSaved, error: authorizationSaveError } =
      await supabase.rpc("save_reservation_authorization_url", {
        p_reservation_id: reservationId,
        p_authorization_url: authorizationUrl.toString(),
      });
    if (authorizationSaveError || authorizationSaved !== true) {
      console.error(
        "[lib/checkout:startCheckout] payment URL could not be saved for an idempotent retry",
        authorizationSaveError,
      );
    }

    return {
      success: true,
      data: {
        kind: "payment",
        authorizationUrl: authorizationUrl.toString(),
        reference: reservationId,
        expiresAt,
      },
    };
  } catch (error) {
    console.error("[lib/checkout:startCheckout] unexpected failure", error);
    return { success: false, error: "Checkout could not be started. Try again." };
  }
}
