"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type DoorStaffActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getOrganizerContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false as const, error: "Please sign in to manage door staff." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_organizer")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[actions/door-staff:getOrganizerContext] profile read failed", profileError);
    return { success: false as const, error: "We couldn't verify your organizer account." };
  }
  if (!profile?.is_organizer) {
    return { success: false as const, error: "Organizer access is required." };
  }

  return { success: true as const, data: { supabase, userId: user.id } };
}

export async function createDoorStaffAccess(
  eventId: string,
  gateLabel: string,
): Promise<DoorStaffActionResult<{ accessId: string; token: string }>> {
  try {
    if (typeof eventId !== "string" || typeof gateLabel !== "string") {
      return { success: false, error: "Enter a valid gate name." };
    }
    const label = gateLabel.trim();
    if (!UUID_PATTERN.test(eventId) || label.length < 2 || label.length > 60) {
      return { success: false, error: "Enter a gate name between 2 and 60 characters." };
    }

    const context = await getOrganizerContext();
    if (!context.success) {
      return context;
    }

    const { data: event, error: eventError } = await context.data.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organizer_id", context.data.userId)
      .maybeSingle();
    if (eventError) {
      console.error("[actions/door-staff:createDoorStaffAccess] event lookup failed", eventError);
      return { success: false, error: "We couldn't verify this event." };
    }
    if (!event) {
      return { success: false, error: "This event isn't available to your account." };
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { data: gate, error: insertError } = await context.data.supabase
      .from("door_staff_access")
      .insert({
        event_id: eventId,
        gate_label: label,
        access_token_hash: accessTokenHash,
        created_by: context.data.userId,
      })
      .select("id")
      .single();

    if (insertError || !gate) {
      console.error("[actions/door-staff:createDoorStaffAccess] gate creation failed", insertError);
      return { success: false, error: "We couldn't create this gate link." };
    }

    revalidatePath(`/dashboard/${eventId}/door-staff`);
    return { success: true, data: { accessId: gate.id, token } };
  } catch (error) {
    console.error("[actions/door-staff:createDoorStaffAccess] unexpected failure", error);
    return { success: false, error: "We couldn't create this gate link." };
  }
}

export async function revokeDoorStaffAccess(
  eventId: string,
  accessId: string,
): Promise<DoorStaffActionResult<null>> {
  try {
    if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(accessId)) {
      return { success: false, error: "This gate link could not be found." };
    }

    const context = await getOrganizerContext();
    if (!context.success) {
      return context;
    }

    const { data: gate, error } = await context.data.supabase
      .from("door_staff_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", accessId)
      .eq("event_id", eventId)
      .eq("created_by", context.data.userId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[actions/door-staff:revokeDoorStaffAccess] gate revocation failed", error);
      return { success: false, error: "We couldn't revoke this gate link." };
    }
    if (!gate) {
      return { success: false, error: "This gate link could not be found or was already revoked." };
    }

    revalidatePath(`/dashboard/${eventId}/door-staff`);
    return { success: true, data: null };
  } catch (error) {
    console.error("[actions/door-staff:revokeDoorStaffAccess] unexpected failure", error);
    return { success: false, error: "We couldn't revoke this gate link." };
  }
}
