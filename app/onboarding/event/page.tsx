import { OnboardingPage } from "@/components/onboarding/OnboardingPage";

type Props = {
  searchParams: Promise<{
    eventId?: string | string[];
    new?: string | string[];
  }>;
};

export default async function OrganizerEventPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <OnboardingPage
      createNew={params.new === "1"}
      eventId={typeof params.eventId === "string" ? params.eventId : undefined}
      step="event"
    />
  );
}
