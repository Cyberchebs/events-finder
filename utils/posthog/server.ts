import "server-only";

import { PostHog } from "posthog-node";

type TicketPurchasedProperties = {
  event_id: string;
  ticket_type_id: string;
  order_id: string;
  amount: number;
  commission_amount: number;
};

type TicketScannedProperties = {
  ticket_id: string | null;
  event_id: string;
  scan_result: "success" | "already_used" | "invalid";
  gate_label: string;
};

async function captureServerEvent(
  distinctId: string,
  eventName: "ticket_purchased" | "ticket_scanned",
  properties: Record<string, string | number | null>,
  context: string,
): Promise<void> {
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) {
    console.error(`[utils/posthog:${context}] PostHog server configuration is missing`);
    return;
  }

  const posthog = new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    posthog.capture({ distinctId, event: eventName, properties });
  } catch (error) {
    console.error(`[utils/posthog:${context}] event capture failed`, error);
  } finally {
    try {
      await posthog.shutdown();
    } catch (error) {
      console.error(`[utils/posthog:${context}] client shutdown failed`, error);
    }
  }
}

export async function captureTicketPurchased(
  userId: string,
  properties: TicketPurchasedProperties,
): Promise<void> {
  await captureServerEvent(
    userId,
    "ticket_purchased",
    properties,
    "captureTicketPurchased",
  );
}

export async function captureTicketScanned(
  distinctId: string,
  properties: TicketScannedProperties,
): Promise<void> {
  await captureServerEvent(distinctId, "ticket_scanned", properties, "captureTicketScanned");
}
