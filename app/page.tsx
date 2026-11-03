import { connection } from "next/server";
import { DiscoverPageClient } from "@/components/discover/DiscoverPageClient";
import { getPublishedEvents } from "@/lib/events";
import type { PublicEventFeed } from "@/types/events";

export default async function DiscoverPage() {
  await connection();

  let initialFeed: PublicEventFeed | null = null;

  try {
    initialFeed = await getPublishedEvents();
  } catch (error) {
    console.error("[discover:page] initial event load failed", error);
  }

  return <DiscoverPageClient initialFeed={initialFeed} />;
}
