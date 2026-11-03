import { redirect } from "next/navigation";
import { getPaystackBanks } from "@/actions/onboarding";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { EventDetailsStep } from "@/components/onboarding/EventDetailsStep";
import { PayoutStep } from "@/components/onboarding/PayoutStep";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { ReviewPublishStep } from "@/components/onboarding/ReviewPublishStep";
import { TierDesignerStep } from "@/components/onboarding/TierDesignerStep";
import { WizardShell } from "@/components/onboarding/WizardShell";
import type {
  EventDraftData,
  OnboardingStep,
  OrganizerProfileData,
  TicketTierData,
} from "@/components/onboarding/types";
import { createClient } from "@/utils/supabase/server";

type Props = {
  step: OnboardingStep;
  eventId?: string;
  createNew?: boolean;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

const stepNumbers: Record<OnboardingStep, number> = {
  profile: 1,
  payout: 2,
  event: 3,
  tiers: 4,
  publish: 5,
};

const stepPaths: Record<number, string> = {
  1: "/onboarding/profile",
  2: "/onboarding/payout",
  3: "/onboarding/event",
  4: "/onboarding/tiers",
  5: "/onboarding/publish",
};

export async function OnboardingPage({
  step,
  eventId,
  createNew = false,
}: Props) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/onboarding/profile");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(
      "is_organizer, organizer_name, organizer_bio, logo_url, onboarding_step, paystack_subaccount_code",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[onboarding:page] profile read failed", profileError);
    throw new Error("Unable to load organizer onboarding.");
  }

  const profile: OrganizerProfileData | null = profileRow;
  if (!profile?.is_organizer && step !== "profile") {
    redirect("/onboarding/profile");
  }

  const isRepeatEvent = profile?.is_organizer === true && profile.onboarding_step === null;
  const isNewEvent =
    step === "event" &&
    !eventId &&
    (createNew || isRepeatEvent);

  if (isRepeatEvent) {
    if (step !== "event" && step !== "tiers" && step !== "publish") {
      redirect("/onboarding/publish");
    }

    if (step === "publish" && !eventId && !createNew) {
      const { data: publishedEvent, error: publishedEventError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (publishedEventError) {
        console.error("[onboarding:page] published event read failed", publishedEventError);
        throw new Error("Unable to load the published event.");
      }

      if (!publishedEvent) {
        redirect("/dashboard");
      }

      const { data: publishedTiers, error: publishedTiersError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", publishedEvent.id)
        .order("created_at", { ascending: true });

      if (publishedTiersError) {
        console.error("[onboarding:page] published ticket tiers read failed", publishedTiersError);
        throw new Error("Unable to load the published ticket tiers.");
      }

      return (
        <OnboardingLayout step={step}>
          <WizardShell
            eventId={publishedEvent.id}
            isRepeatEvent
            step={5}
            maxAccessibleStep={0}
          >
            <ReviewPublishStep
              event={publishedEvent}
              isPublished
              organizerId={user.id}
              ticketTiers={publishedTiers}
            />
          </WizardShell>
        </OnboardingLayout>
      );
    }
  }

  if (eventId && !isUuid(eventId)) {
    redirect("/dashboard");
  }

  const currentStep = isRepeatEvent
    ? 5
    : profile?.is_organizer
      ? Math.max(profile.onboarding_step ?? 1, 1)
      : 1;
  const requestedStep = stepNumbers[step];
  if (requestedStep > currentStep) {
    redirect(stepPaths[currentStep] ?? "/onboarding/profile");
  }

  let event: EventDraftData | null = null;
  let isPublished = false;
  let ticketTiers: TicketTierData[] = [];
  if (requestedStep >= 3) {
    if (eventId) {
      const { data: selectedEvent, error: selectedEventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("organizer_id", user.id)
        .maybeSingle();

      if (selectedEventError) {
        console.error("[onboarding:page] selected event read failed", selectedEventError);
        throw new Error("Unable to load the selected event.");
      }

      if (
        !selectedEvent ||
        (selectedEvent.status !== "draft" &&
          !(step === "publish" && selectedEvent.status === "published"))
      ) {
        redirect("/dashboard");
      }

      event = { ...selectedEvent, onlineJoinUrl: null };
      isPublished = selectedEvent.status === "published";
    } else if (!isNewEvent) {
      const { data: draft, error: draftError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draftError) {
        console.error("[onboarding:page] event draft read failed", draftError);
        throw new Error("Unable to load your event draft.");
      }
      event = draft ? { ...draft, onlineJoinUrl: null } : null;
    }

    if (!event && requestedStep > 3) {
      redirect(isRepeatEvent ? "/onboarding/event?new=1" : "/onboarding/event");
    }

    if (event && step === "event" && event.status === "draft" && event.format === "online") {
      const { data: onlineJoinUrl, error: onlineJoinUrlError } = await supabase.rpc(
        "get_draft_online_event_join_url",
        { p_event_id: event.id },
      );

      if (onlineJoinUrlError) {
        console.error("[onboarding:page] private join URL read failed", onlineJoinUrlError);
        throw new Error("Unable to load your private event join URL.");
      }

      event = { ...event, onlineJoinUrl };
    }

    if (event && requestedStep >= 4) {
      const { data: tiers, error: tiersError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });

      if (tiersError) {
        console.error("[onboarding:page] ticket tiers read failed", tiersError);
        throw new Error("Unable to load your ticket tiers.");
      }
      ticketTiers = tiers;
    }
  }

  const repeatEventId = eventId ?? event?.id;

  let content;
  switch (step) {
    case "profile":
      content = <ProfileStep organizerId={user.id} profile={profile} />;
      break;
    case "payout": {
      const banksResult = profile?.paystack_subaccount_code
        ? null
        : await getPaystackBanks();
      content = (
        <PayoutStep
          banks={banksResult?.success ? banksResult.data : []}
          banksError={banksResult && !banksResult.success ? banksResult.error : null}
          organizerId={user.id}
          payoutConfigured={Boolean(profile?.paystack_subaccount_code)}
        />
      );
      break;
    }
    case "event":
      content = (
        <EventDetailsStep
          createNew={isNewEvent}
          event={event}
          isRepeatEvent={isRepeatEvent}
          organizerId={user.id}
        />
      );
      break;
    case "tiers":
      content = (
        <TierDesignerStep
          event={event}
          organizerId={user.id}
          ticketTiers={ticketTiers}
        />
      );
      break;
    case "publish":
      content = (
        <ReviewPublishStep
          event={event}
          isPublished={isPublished}
          organizerId={user.id}
          ticketTiers={ticketTiers}
        />
      );
      break;
  }

  return (
    <OnboardingLayout step={step}>
      <WizardShell
        eventId={repeatEventId}
        isRepeatEvent={isRepeatEvent}
        step={requestedStep}
        maxAccessibleStep={currentStep}
        newEvent={isNewEvent}
      >
        {content}
      </WizardShell>
    </OnboardingLayout>
  );
}

function OnboardingLayout({
  step,
  children,
}: {
  step: OnboardingStep;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar currentPath={`/onboarding/${step}`} />
      <main className="min-h-[calc(100vh-54px)] flex-1 bg-background pb-20 md:pb-10">
        {children}
      </main>
      <BottomTabBar currentTab="create" />
    </>
  );
}
