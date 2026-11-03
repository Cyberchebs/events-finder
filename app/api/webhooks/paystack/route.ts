import { NextResponse } from "next/server";
import { COMMISSION_RATE } from "@/lib/constants";
import { paymentProvider } from "@/lib/paystack-provider";
import { createTicketPayloads } from "@/lib/qr";
import { captureTicketPurchased } from "@/utils/posthog/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const maxDuration = 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSuccessfulRpc(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.ok === true;
}

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (error) {
    console.error("[api/webhooks/paystack] request body could not be read", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const signature = request.headers.get("x-paystack-signature");

  if (!signature || !paymentProvider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const parsedEvent = paymentProvider.parseWebhookEvent(rawBody);
  if (!parsedEvent.success) {
    console.error("[api/webhooks/paystack] invalid signed event", parsedEvent.error);
    return NextResponse.json({ success: false }, { status: 400 });
  }

  if (parsedEvent.data.type === "ignored") {
    return NextResponse.json({ success: true, ignored: true });
  }

  try {
    const admin = createAdminClient();
    const event = parsedEvent.data;
    if (event.type === "failed") {
      const reservationId = UUID_PATTERN.test(event.reference) ? event.reference : null;
      const { data, error } = await admin.rpc("mark_payment_failed", {
        p_event_id: event.eventId,
        p_reservation_id: reservationId,
      });

      if (error || !isSuccessfulRpc(data)) {
        console.error("[api/webhooks/paystack] failed-payment processing failed", error);
        return NextResponse.json({ success: false }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (event.currency.toUpperCase() !== "NGN" || !UUID_PATTERN.test(event.reference)) {
      console.error("[api/webhooks/paystack] signed success event had invalid currency or reference");
      return NextResponse.json({ success: true, ignored: true });
    }

    const { data: reservation, error: reservationError } = await admin
      .from("reservations")
      .select("id, quantity")
      .eq("id", event.reference)
      .maybeSingle();

    if (reservationError) {
      console.error("[api/webhooks/paystack] reservation lookup failed", reservationError);
      return NextResponse.json({ success: false }, { status: 500 });
    }
    if (!reservation) {
      console.error("[api/webhooks/paystack] signed success event had no matching reservation");
      return NextResponse.json({ success: true, ignored: true });
    }

    const { data, error } = await admin.rpc("process_paid_reservation", {
      p_event_id: event.eventId,
      p_reservation_id: reservation.id,
      p_amount_kobo: event.amountKobo,
      p_commission_kobo: Math.round(event.amountKobo * COMMISSION_RATE),
      p_ticket_payloads: createTicketPayloads(reservation.quantity),
    });

    if (error || !isSuccessfulRpc(data)) {
      console.error("[api/webhooks/paystack] paid ticket issuance failed", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    if (
      data.duplicate !== true &&
      typeof data.user_id === "string" &&
      typeof data.event_id === "string" &&
      typeof data.ticket_type_id === "string" &&
      typeof data.order_id === "string" &&
      typeof data.total_kobo === "number" &&
      typeof data.commission_kobo === "number"
    ) {
      await captureTicketPurchased(data.user_id, {
        event_id: data.event_id,
        ticket_type_id: data.ticket_type_id,
        order_id: data.order_id,
        amount: data.total_kobo / 100,
        commission_amount: data.commission_kobo / 100,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/webhooks/paystack] unexpected failure", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
