import { notFound, redirect } from "next/navigation";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutStatus } from "@/components/checkout/CheckoutStatus";
import { getPublishedEvent } from "@/lib/events";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ event_id: string }>;
  searchParams: Promise<{
    ticket_type_id?: string | string[];
    quantity?: string | string[];
    reference?: string | string[];
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const [{ event_id: eventId }, query] = await Promise.all([params, searchParams]);
  if (!UUID_PATTERN.test(eventId)) {
    notFound();
  }

  const reference = firstValue(query.reference);
  const validReference = reference && UUID_PATTERN.test(reference) ? reference : null;
  const requestedQuantity = Number(firstValue(query.quantity));
  const initialQuantity =
    Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0
      ? requestedQuantity
      : 1;
  const serverNow = new Date().toISOString();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[checkout:page] user lookup failed", authError);
  }

  if (!user) {
    const nextQuery = new URLSearchParams();
    const requestedTierId = firstValue(query.ticket_type_id);
    const requestedQuantity = Number(firstValue(query.quantity));
    if (requestedTierId && UUID_PATTERN.test(requestedTierId)) {
      nextQuery.set("ticket_type_id", requestedTierId);
      if (Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0) {
        nextQuery.set("quantity", String(requestedQuantity));
      }
    }
    if (validReference) {
      nextQuery.set("reference", validReference);
    }
    const nextPath = `/checkout/${eventId}${nextQuery.size ? `?${nextQuery}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (validReference) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar currentPath={`/checkout/${eventId}`} />
        <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
          <CheckoutStatus eventId={eventId} reference={validReference} serverNow={serverNow} />
        </main>
        <BottomTabBar currentTab="discover" />
      </div>
    );
  }

  let event;
  try {
    event = await getPublishedEvent(eventId);
  } catch (error) {
    console.error("[checkout:page] event read failed", error);
    throw new Error("Unable to load this checkout.");
  }

  if (!event) {
    notFound();
  }

  const requestedTierId = firstValue(query.ticket_type_id);
  const selectedTier = event.ticket_types.find((tier) => tier.id === requestedTierId) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar currentPath={`/checkout/${event.id}`} />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12">
        <CheckoutForm
          event={event}
          initialQuantity={initialQuantity}
          selectedTier={selectedTier}
          serverNow={serverNow}
        />
      </main>
      <BottomTabBar currentTab="discover" />
    </div>
  );
}
