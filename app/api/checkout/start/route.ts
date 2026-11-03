import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/checkout";

type CheckoutRequest = {
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  idempotency_key: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequest(value: unknown): CheckoutRequest | null {
  if (!isRecord(value)) {
    return null;
  }
  const { event_id, ticket_type_id, quantity, idempotency_key } = value;
  if (
    typeof event_id !== "string" ||
    typeof ticket_type_id !== "string" ||
    typeof idempotency_key !== "string" ||
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity)
  ) {
    return null;
  }

  return { event_id, ticket_type_id, quantity, idempotency_key };
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid checkout request." },
        { status: 400 },
      );
    }

    const input = parseRequest(body);
    if (!input) {
      return NextResponse.json(
        { success: false, error: "Invalid checkout request." },
        { status: 400 },
      );
    }

    const result = await startCheckout(
      {
        eventId: input.event_id,
        ticketTypeId: input.ticket_type_id,
        quantity: input.quantity,
        idempotencyKey: input.idempotency_key,
      },
      process.env.NEXT_PUBLIC_SITE_URL ?? "",
    );
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          ...(result.reservationExpiresAt
            ? { data: { reservation_expires_at: result.reservationExpiresAt } }
            : {}),
        },
        { status: result.statusCode ?? 500 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[api/checkout/start] unexpected failure", error);
    return NextResponse.json(
      { success: false, error: "Checkout could not be started." },
      { status: 500 },
    );
  }
}
