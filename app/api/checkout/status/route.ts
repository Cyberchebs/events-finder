import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference || !UUID_PATTERN.test(reference)) {
    return NextResponse.json(
      { success: false, error: "Invalid payment reference." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to view payment status." },
        { status: 401 },
      );
    }

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("id, status, payment_status, expires_at")
      .eq("id", reference)
      .eq("user_id", user.id)
      .maybeSingle();

    if (reservationError) {
      console.error("[api/checkout/status] reservation lookup failed", reservationError);
      return NextResponse.json(
        { success: false, error: "Payment status is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Checkout could not be found." },
        { status: 404 },
      );
    }

    const state =
      reservation.status === "confirmed"
        ? "confirmed"
        : reservation.status === "expired"
          ? "expired"
          : reservation.payment_status === "failed"
            ? "failed"
            : "pending";
    let orderId: string | null = null;

    if (state === "confirmed") {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("paystack_reference", reference)
        .eq("user_id", user.id)
        .maybeSingle();

      if (orderError) {
        console.error("[api/checkout/status] order lookup failed", orderError);
        return NextResponse.json(
          { success: false, error: "Payment status is temporarily unavailable." },
          { status: 503 },
        );
      }
      if (!order) {
        console.error("[api/checkout/status] confirmed reservation has no paid order");
        return NextResponse.json(
          { success: false, error: "Payment is confirmed, but your ticket details are still syncing." },
          { status: 503 },
        );
      }
      orderId = order?.id ?? null;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          state,
          expires_at: reservation.expires_at,
          order_id: orderId,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/checkout/status] unexpected failure", error);
    return NextResponse.json(
      { success: false, error: "Payment status is temporarily unavailable." },
      { status: 500 },
    );
  }
}
