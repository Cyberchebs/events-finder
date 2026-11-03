import { CheckinScanner } from "@/components/checkin/CheckinScanner";
import { getDoorStaffScanContext } from "@/lib/door-staff";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ event_id: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ScanPage({ params, searchParams }: Props) {
  const { event_id: eventId } = await params;
  const { token } = await searchParams;
  const accessToken = typeof token === "string" ? token : "";
  const supabase = await createClient();
  const result = await getDoorStaffScanContext(supabase, eventId, accessToken);

  if (!result.success) {
    if (result.error === "failed") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
          <section className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 text-center">
            <h1 className="text-[20px] font-extrabold text-ink">Unable to verify this link</h1>
            <p className="mt-2 text-[12px] font-semibold text-ink-2">
              Check your connection and open the link again.
            </p>
          </section>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <section className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 text-center">
          <h1 className="text-[20px] font-extrabold text-ink">This link isn’t valid</h1>
          <p className="mt-2 text-[12px] font-semibold text-ink-2">
            Ask the event organizer for a current door-staff link.
          </p>
        </section>
      </main>
    );
  }

  return (
    <CheckinScanner
      eventId={eventId}
      eventTitle={result.context.eventTitle}
      gateLabel={result.context.gateLabel}
      initialCheckedIn={result.context.checkedIn}
      token={accessToken}
      totalTickets={result.context.totalTickets}
    />
  );
}
