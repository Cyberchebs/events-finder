import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { DoorStaffManager } from "@/components/door-staff/DoorStaffManager";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ event_id: string }>;
};

export default async function DoorStaffPage({ params }: Props) {
  const { event_id: eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/${eventId}/door-staff`)}`);
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("organizer_id", user.id)
    .maybeSingle();
  if (eventError) {
    console.error("[dashboard/door-staff] event lookup failed", eventError);
    throw new Error("Unable to load door staff for this event.");
  }
  if (!event) {
    notFound();
  }

  const { data: gates, error: gatesError } = await supabase
    .from("door_staff_access")
    .select("id, gate_label, created_at, revoked_at")
    .eq("event_id", eventId)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  if (gatesError) {
    console.error("[dashboard/door-staff] gate lookup failed", gatesError);
    throw new Error("Unable to load door staff for this event.");
  }

  return (
    <>
      <Navbar currentPath={`/dashboard/${eventId}/door-staff`} />
      <DoorStaffManager
        eventId={eventId}
        eventTitle={event.title}
        gates={(gates ?? []).map((gate) => ({
          id: gate.id,
          label: gate.gate_label,
          createdAt: gate.created_at,
          revokedAt: gate.revoked_at,
        }))}
      />
      <BottomTabBar currentTab="none" />
    </>
  );
}
