import { OnboardingPage } from "@/components/onboarding/OnboardingPage";

type Props = {
  searchParams: Promise<{ eventId?: string | string[] }>;
};

export default async function OrganizerPublishPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <OnboardingPage
      eventId={typeof params.eventId === "string" ? params.eventId : undefined}
      step="publish"
    />
  );
}
