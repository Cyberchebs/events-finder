import { notFound, redirect } from "next/navigation";
import { OnlineJoinAccess } from "@/components/events/OnlineJoinAccess";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ ticket_id: string }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function OnlineEventJoinPage({ params }: Props) {
  const { ticket_id: ticketId } = await params;
  if (!isUuid(ticketId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[online-join:page] user lookup failed", authError);
  }
  if (!user) {
    const nextPath = `/my-tickets/${ticketId}/join`;
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: accessRows, error: accessError } = await supabase.rpc(
    "get_online_event_join_access",
    { p_ticket_id: ticketId },
  );

  if (accessError) {
    console.error("[online-join:page] access lookup failed", accessError);
    throw new Error("Unable to load online event access.");
  }

  const access = accessRows?.[0];
  if (!access) {
    notFound();
  }

  return (
    <OnlineJoinAccess
      eventTitle={access.event_title}
      isUnlocked={access.is_unlocked}
      joinUrl={access.is_unlocked ? access.join_url : null}
      serverNow={access.server_now}
      unlockAt={access.unlock_at}
    />
  );
}
