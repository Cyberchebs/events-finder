import "server-only";

export type OrganizerFunnel = {
  available: boolean;
  views: number;
  checkouts: number;
  purchases: number;
};

const EMPTY_FUNNEL: OrganizerFunnel = {
  available: false,
  views: 0,
  checkouts: 0,
  purchases: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function getOrganizerFunnel(eventIds: string[]): Promise<OrganizerFunnel> {
  if (eventIds.length === 0) {
    return { available: true, views: 0, checkouts: 0, purchases: 0 };
  }

  const host = process.env.POSTHOG_API_HOST?.replace(/\/+$/, "");
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!host || !projectId || !personalApiKey) {
    console.error("[lib/organizer-dashboard:getOrganizerFunnel] PostHog query configuration is missing");
    return EMPTY_FUNNEL;
  }

  if (!/^[0-9]+$/.test(projectId) || !eventIds.every((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  )) {
    console.error("[lib/organizer-dashboard:getOrganizerFunnel] invalid PostHog project or event ID");
    return EMPTY_FUNNEL;
  }

  const eventList = eventIds.map((id) => `'${id}'`).join(", ");
  const query = `
    SELECT event, count(DISTINCT distinct_id) AS actors
    FROM events
    WHERE event IN ('event_page_viewed', 'checkout_started', 'ticket_purchased')
      AND properties.event_id IN (${eventList})
      AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY event
    LIMIT 3
  `;

  try {
    const response = await fetch(
      `${host}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${personalApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query },
          name: "Organizer dashboard 30-day event funnel",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      console.error(
        "[lib/organizer-dashboard:getOrganizerFunnel] PostHog query failed",
        response.status,
      );
      return EMPTY_FUNNEL;
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.results) || !Array.isArray(payload.columns)) {
      console.error("[lib/organizer-dashboard:getOrganizerFunnel] PostHog returned malformed results");
      return EMPTY_FUNNEL;
    }

    const eventIndex = payload.columns.indexOf("event");
    const actorIndex = payload.columns.indexOf("actors");
    if (eventIndex < 0 || actorIndex < 0) {
      console.error("[lib/organizer-dashboard:getOrganizerFunnel] PostHog returned unexpected columns");
      return EMPTY_FUNNEL;
    }

    const counts = new Map<string, number>();
    for (const row of payload.results) {
      if (!Array.isArray(row)) {
        console.error("[lib/organizer-dashboard:getOrganizerFunnel] PostHog returned a malformed row");
        return EMPTY_FUNNEL;
      }

      const eventName = row[eventIndex];
      const count = toCount(row[actorIndex]);
      if (typeof eventName !== "string" || count === null) {
        console.error("[lib/organizer-dashboard:getOrganizerFunnel] PostHog returned invalid counts");
        return EMPTY_FUNNEL;
      }
      counts.set(eventName, count);
    }

    return {
      available: true,
      views: counts.get("event_page_viewed") ?? 0,
      checkouts: counts.get("checkout_started") ?? 0,
      purchases: counts.get("ticket_purchased") ?? 0,
    };
  } catch (error) {
    console.error("[lib/organizer-dashboard:getOrganizerFunnel] PostHog request failed", error);
    return EMPTY_FUNNEL;
  }
}
