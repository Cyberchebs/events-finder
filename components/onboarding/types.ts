import type { Database } from "@/types/database.types";

export type OnboardingStep =
  | "profile"
  | "payout"
  | "event"
  | "tiers"
  | "publish";

export type OrganizerProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "is_organizer"
  | "organizer_name"
  | "organizer_bio"
  | "logo_url"
  | "onboarding_step"
  | "paystack_subaccount_code"
>;

export type EventDraftData = Database["public"]["Tables"]["events"]["Row"] & {
  onlineJoinUrl?: string | null;
};
export type TicketTierData = Database["public"]["Tables"]["ticket_types"]["Row"];
