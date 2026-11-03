import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { TicketCard, type TicketCardData } from "@/components/tickets/TicketCard";
import { UsedTicketRow } from "@/components/tickets/UsedTicketRow";
import { createClient } from "@/utils/supabase/server";

type Props = {
  searchParams: Promise<{ order?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MyTicketsPage({ searchParams }: Props) {
  const query = await searchParams;
  const highlightedOrderId = firstValue(query.order);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[my-tickets:page] user lookup failed", authError);
  }
  if (!user) {
    const nextPath = highlightedOrderId
      ? `/my-tickets?order=${encodeURIComponent(highlightedOrderId)}`
      : "/my-tickets";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, order_id, ticket_type_id, qr_token, status, scanned_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (ticketsError) {
    console.error("[my-tickets:page] ticket lookup failed", ticketsError);
    throw new Error("Unable to load your tickets.");
  }

  const ticketRows = tickets ?? [];
  const orderIds = [...new Set(ticketRows.map((ticket) => ticket.order_id))];
  const ticketTypeIds = [...new Set(ticketRows.map((ticket) => ticket.ticket_type_id))];
  let ticketCards: TicketCardData[] = [];

  if (orderIds.length > 0 && ticketTypeIds.length > 0) {
    const [ordersResult, ticketTypesResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id, event_id, status")
        .eq("user_id", user.id)
        .in("id", orderIds)
        .eq("status", "paid"),
      supabase
        .from("ticket_types")
        .select(
          "id, event_id, name, card_color, card_image_url, card_style, card_finish, card_text_color",
        )
        .in("id", ticketTypeIds),
    ]);

    if (ordersResult.error || ticketTypesResult.error) {
      console.error(
        "[my-tickets:page] ticket details lookup failed",
        ordersResult.error ?? ticketTypesResult.error,
      );
      throw new Error("Unable to load your ticket details.");
    }

    const orders = ordersResult.data ?? [];
    const ticketTypes = ticketTypesResult.data ?? [];
    const eventIds = [...new Set(orders.map((order) => order.event_id))];
    const { data: events, error: eventsError } =
      eventIds.length > 0
        ? await supabase.rpc("get_ticket_event_details", {
            p_event_ids: eventIds,
          })
        : { data: [], error: null };

    if (eventsError) {
      console.error("[my-tickets:page] event details lookup failed", eventsError);
      throw new Error("Unable to load your event details.");
    }

    const orderById = new Map(orders.map((order) => [order.id, order]));
    const ticketTypeById = new Map(ticketTypes.map((tier) => [tier.id, tier]));
    const eventById = new Map((events ?? []).map((event) => [event.id, event]));

    ticketCards = ticketRows.flatMap((ticket) => {
      const order = orderById.get(ticket.order_id);
      const tier = ticketTypeById.get(ticket.ticket_type_id);
      const event = order ? eventById.get(order.event_id) : undefined;
      if (!order || !tier || !event || tier.event_id !== event.id) {
        return [];
      }

      return [
        {
          id: ticket.id,
          orderId: order.id,
          qrToken: ticket.qr_token,
          status: ticket.status,
          scannedAt: ticket.scanned_at,
          tierName: tier.name,
          tierColor: tier.card_color,
          tierImageUrl: tier.card_image_url,
          cardStyle: tier.card_style === "torn" ? "torn" : "solid",
          cardFinish: tier.card_finish === "metallic" ? "metallic" : "normal",
          cardTextColor: tier.card_text_color === "black" ? "black" : "white",
          event: {
            id: event.id,
            title: event.title,
            startsAt: event.starts_at,
            endsAt: event.ends_at,
            format: event.format,
            city: event.city,
            venueAddress: event.venue_address,
          },
        },
      ];
    });

    if (ticketCards.length !== ticketRows.length) {
      console.error("[my-tickets:page] one or more tickets are missing their event or tier details");
      throw new Error("Some ticket details could not be loaded.");
    }
  }

  const issuedTickets = ticketCards.filter((ticket) => ticket.status === "issued");
  const pastTickets = ticketCards.filter((ticket) => ticket.status !== "issued");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar currentPath="/my-tickets" />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
        <div className="mb-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-3">
            Your good times, all in one place
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">
            My tickets
          </h1>
          <p className="mt-1 text-[12px] font-medium text-ink-2">
            Your entry passes, from the next big night to the memories you&apos;ve made.
          </p>
        </div>

        {ticketCards.length ? (
          <div className="space-y-7">
            {issuedTickets.length ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-ink">
                    Upcoming
                  </h2>
                  <span className="text-[10px] font-semibold text-ink-3">
                    {issuedTickets.length} {issuedTickets.length === 1 ? "ticket" : "tickets"}
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {issuedTickets.map((ticket) => (
                    <TicketCard
                      highlighted={ticket.orderId === highlightedOrderId}
                      key={ticket.id}
                      ticket={ticket}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {pastTickets.length ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-ink">
                    Past tickets
                  </h2>
                  <span className="text-[10px] font-semibold text-ink-3">
                    {pastTickets.length} {pastTickets.length === 1 ? "ticket" : "tickets"}
                  </span>
                </div>
                <div className="space-y-3">
                  {pastTickets.map((ticket) => (
                    <UsedTicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="flex min-h-[420px] items-center justify-center">
            <div className="w-full max-w-[480px] rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:px-8 sm:py-10">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sunken text-brand">
                <Ticket aria-hidden="true" className="h-8 w-8" />
              </span>
              <h2 className="mt-6 text-[20px] font-extrabold tracking-tight text-ink">
                Your next memory awaits
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[12px] font-medium leading-5 text-ink-2">
                No tickets yet. Find something you love and we&apos;ll keep your entry pass
                right here.
              </p>
              <Link
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-[12px] font-bold text-brand-ink transition-opacity hover:opacity-95"
                href="/"
              >
                Find an event
              </Link>
            </div>
          </section>
        )}
      </main>
      <BottomTabBar currentTab="tickets" />
    </div>
  );
}
