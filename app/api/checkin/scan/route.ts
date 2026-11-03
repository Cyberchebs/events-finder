import { NextResponse } from "next/server";
import { scanDoorStaffTicket, validateDoorStaffAccess } from "@/lib/door-staff";
import { checkCheckinRateLimit } from "@/lib/rate-limit";
import { verifyTicketToken } from "@/lib/qr";
import { captureTicketScanned } from "@/utils/posthog/server";
import { createClient } from "@/utils/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-door-staff-token") ?? "";
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid scan request." }, { status: 400 });
    }
    if (
      !isRecord(body) ||
      typeof body.event_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.event_id) ||
      typeof body.qr_token !== "string" ||
      body.qr_token.length > 200
    ) {
      return NextResponse.json({ success: false, error: "Invalid scan request." }, { status: 400 });
    }

    const eventId = body.event_id;
    const supabase = await createClient();
    const access = await validateDoorStaffAccess(supabase, eventId, token);
    if (!access.success) {
      if (access.error === "invalid") {
        return NextResponse.json(
          { success: false, error: "This door-staff link is no longer valid." },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { success: false, error: "Check-in is temporarily unavailable." },
        { status: 503 },
      );
    }

    const rateLimit = await checkCheckinRateLimit(access.access.accessId);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Check-in is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many scans. Please wait a moment." },
        { status: 429 },
      );
    }

    const verified = verifyTicketToken(body.qr_token);
    if (!verified.valid) {
      await captureTicketScanned(access.access.accessId, {
        ticket_id: null,
        event_id: eventId,
        scan_result: "invalid",
        gate_label: access.access.gateLabel,
      });
      return NextResponse.json({ success: true, data: { result: "invalid" } });
    }

    const result = await scanDoorStaffTicket(
      supabase,
      eventId,
      token,
      verified.ticketId,
    );
    if (!result) {
      return NextResponse.json(
        { success: false, error: "We couldn't complete this scan. Try again." },
        { status: 503 },
      );
    }
    if (result.result === "invalid_gate") {
      return NextResponse.json(
        { success: false, error: "This door-staff link is no longer valid." },
        { status: 401 },
      );
    }

    await captureTicketScanned(access.access.accessId, {
      ticket_id: verified.ticketId,
      event_id: eventId,
      scan_result: result.result,
      gate_label: access.access.gateLabel,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/checkin/scan] unexpected failure", error);
    return NextResponse.json(
      { success: false, error: "We couldn't complete this scan. Try again." },
      { status: 500 },
    );
  }
}
