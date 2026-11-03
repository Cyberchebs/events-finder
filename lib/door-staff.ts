import "server-only";

import crypto from "node:crypto";
import type { createClient } from "@/utils/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type DoorStaffContext = {
  valid: true;
  accessId: string;
  gateLabel: string;
  eventTitle: string;
  totalTickets: number;
  checkedIn: number;
};

export type DoorStaffAccess = {
  accessId: string;
  gateLabel: string;
  eventTitle: string;
};

export type DoorStaffScanResult =
  | {
      result: "success";
      tierName: string;
      scannedAt: string;
      scannedGateLabel: string;
    }
  | {
      result: "already_used";
      tierName: string;
      scannedAt: string;
      scannedGateLabel: string;
    }
  | { result: "invalid" | "invalid_gate" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hashDoorStaffToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function validateDoorStaffAccess(
  supabase: SupabaseClient,
  eventId: string,
  token: string,
): Promise<{ success: true; access: DoorStaffAccess } | { success: false; error: "invalid" | "failed" }> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    return { success: false, error: "invalid" };
  }

  const { data, error } = await supabase.rpc("validate_door_staff_access", {
    p_event_id: eventId,
    p_token_hash: hashDoorStaffToken(token),
  });
  if (error) {
    console.error("[lib/door-staff:validateDoorStaffAccess] validation failed", error);
    return { success: false, error: "failed" };
  }
  if (!isRecord(data) || data.valid !== true) {
    return { success: false, error: "invalid" };
  }
  if (
    typeof data.gate_id !== "string" ||
    typeof data.gate_label !== "string" ||
    typeof data.event_title !== "string"
  ) {
    console.error("[lib/door-staff:validateDoorStaffAccess] validation returned malformed data");
    return { success: false, error: "failed" };
  }

  return {
    success: true,
    access: {
      accessId: data.gate_id,
      gateLabel: data.gate_label,
      eventTitle: data.event_title,
    },
  };
}

export async function getDoorStaffScanContext(
  supabase: SupabaseClient,
  eventId: string,
  token: string,
): Promise<{ success: true; context: DoorStaffContext } | { success: false; error: "invalid" | "failed" }> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    return { success: false, error: "invalid" };
  }

  const { data, error } = await supabase.rpc("get_door_staff_scan_context", {
    p_event_id: eventId,
    p_token_hash: hashDoorStaffToken(token),
  });
  if (error) {
    console.error("[lib/door-staff:getDoorStaffScanContext] validation failed", error);
    return { success: false, error: "failed" };
  }
  if (!isRecord(data) || data.valid !== true) {
    return { success: false, error: "invalid" };
  }
  if (
    typeof data.gate_id !== "string" ||
    typeof data.gate_label !== "string" ||
    typeof data.event_title !== "string" ||
    typeof data.total_tickets !== "number" ||
    typeof data.checked_in !== "number"
  ) {
    console.error("[lib/door-staff:getDoorStaffScanContext] validation returned malformed data");
    return { success: false, error: "failed" };
  }

  return {
    success: true,
    context: {
      valid: true,
      accessId: data.gate_id,
      gateLabel: data.gate_label,
      eventTitle: data.event_title,
      totalTickets: data.total_tickets,
      checkedIn: data.checked_in,
    },
  };
}

export async function scanDoorStaffTicket(
  supabase: SupabaseClient,
  eventId: string,
  token: string,
  ticketId: string,
): Promise<DoorStaffScanResult | null> {
  const { data, error } = await supabase.rpc("scan_door_staff_ticket", {
    p_event_id: eventId,
    p_token_hash: hashDoorStaffToken(token),
    p_ticket_id: ticketId,
  });
  if (error) {
    console.error("[lib/door-staff:scanDoorStaffTicket] scan failed", error);
    return null;
  }
  if (!isRecord(data) || typeof data.result !== "string") {
    console.error("[lib/door-staff:scanDoorStaffTicket] scan returned malformed data");
    return null;
  }

  if (data.result === "invalid" || data.result === "invalid_gate") {
    return { result: data.result };
  }
  if (
    (data.result !== "success" && data.result !== "already_used") ||
    typeof data.tier_name !== "string" ||
    typeof data.scanned_at !== "string" ||
    typeof data.scanned_gate_label !== "string"
  ) {
    console.error("[lib/door-staff:scanDoorStaffTicket] scan returned malformed ticket data");
    return null;
  }

  return {
    result: data.result,
    tierName: data.tier_name,
    scannedAt: data.scanned_at,
    scannedGateLabel: data.scanned_gate_label,
  };
}
