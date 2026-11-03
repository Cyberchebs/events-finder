import { notFound } from "next/navigation";
import { EventDetail } from "@/components/events/EventDetail";
import { getPublishedEvent } from "@/lib/events";

type Props = {
  params: Promise<{ event_id: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EventPage({ params }: Props) {
  const { event_id: eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) {
    notFound();
  }

  let event;
  try {
    event = await getPublishedEvent(eventId);
  } catch (error) {
    console.error("[event-detail:page] event read failed", error);
    throw new Error("Unable to load this event.");
  }

  if (!event) {
    notFound();
  }

  return <EventDetail event={event} serverNow={new Date().toISOString()} />;
}
