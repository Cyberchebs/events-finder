"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  eventId: string;
  organizerId: string;
  isOnline: boolean;
};

export function EventPageAnalytics({ eventId, organizerId, isOnline }: Props) {
  useEffect(() => {
    posthog.capture("event_page_viewed", {
      event_id: eventId,
      organizer_id: organizerId,
      is_online: isOnline,
    });
  }, [eventId, organizerId, isOnline]);

  return null;
}
