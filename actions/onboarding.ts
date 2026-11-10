"use server";

import { revalidatePath } from "next/cache";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { paymentProvider } from "@/lib/paystack-provider";
import type { Bank } from "@/lib/payment-provider";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventFormat = Database["public"]["Enums"]["event_format"];
type TierColor = "tier-a" | "tier-b" | "tier-c" | "ink" | "yellow" | "red" | `#${string}`;
type TicketCardStyle = "solid" | "torn";
type TicketCardFinish = "normal" | "metallic";
type TicketCardTextColor = "black" | "white";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type SaveEventStepResult =
  | { success: true; data: { eventId: string } }
  | { success: false; error: string; eventId?: string };

type ActionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: ProfileRow | null;
};

type EventInput = {
  eventId: string | null;
  createNew: boolean;
  title: string;
  description: string;
  category: (typeof EVENT_CATEGORIES)[number];
  city: string | null;
  format: EventFormat;
  venue: string;
  venueLatitude: number | null;
  venueLongitude: number | null;
  onlineJoinUrl: string | null;
  startsAt: string;
  endsAt: string;
};

type TicketTierInput = {
  id: string | null;
  name: string;
  priceKobo: number;
  quantity: number;
  cardColor: TierColor;
  cardStyle: TicketCardStyle;
  cardFinish: TicketCardFinish;
  cardTextColor: TicketCardTextColor;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function isTicketHexColor(value: unknown): value is `#${string}` {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function parseHttpsJoinUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 2048) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

async function getActionContext(): Promise<ActionResult<ActionContext>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Please sign in to continue." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[onboarding:getActionContext] profile read failed", profileError);
    return { success: false, error: "We couldn't load your organizer profile." };
  }

  return { success: true, data: { supabase, userId: user.id, profile } };
}

function requireOrganizer(context: ActionContext): string | null {
  if (!context.profile?.is_organizer) {
    return "Complete your organizer profile before continuing.";
  }
  return null;
}

async function advanceOnboardingStep(
  context: ActionContext,
  nextStep: number,
): Promise<boolean> {
  if (context.profile?.onboarding_step === null) {
    return true;
  }

  const currentStep = context.profile?.onboarding_step ?? 0;
  if (currentStep >= nextStep) {
    return true;
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({ onboarding_step: nextStep })
    .eq("id", context.userId);

  if (error) {
    console.error("[onboarding:advanceOnboardingStep] update failed", error);
    return false;
  }

  return true;
}

function parseProfileInput(value: unknown): {
  organizerName: string;
  organizerBio: string;
} | null {
  if (!isRecord(value)) {
    return null;
  }

  const organizerName =
    typeof value.organizerName === "string" ? value.organizerName.trim() : "";
  const organizerBio =
    typeof value.organizerBio === "string" ? value.organizerBio.trim() : "";

  if (
    organizerName.length < 2 ||
    organizerName.length > 100 ||
    organizerBio.length > 500
  ) {
    return null;
  }

  return { organizerName, organizerBio };
}

export async function saveOrganizerProfile(
  input: unknown,
): Promise<ActionResult<{ organizerId: string }>> {
  try {
    const parsed = parseProfileInput(input);
    if (!parsed) {
      return {
        success: false,
        error: "Enter an organizer name (2–100 characters). The bio can be up to 500 characters.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Please sign in to continue." };
    }

    const { data: existingProfile, error: readError } = await supabase
      .from("profiles")
      .select("onboarding_step")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[onboarding:saveOrganizerProfile] profile read failed", readError);
      return { success: false, error: "We couldn't save your organizer profile." };
    }

    const startingStep = Math.max(existingProfile?.onboarding_step ?? 1, 1);
    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        is_organizer: true,
        organizer_name: parsed.organizerName,
        organizer_bio: parsed.organizerBio || null,
        onboarding_step: startingStep,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      console.error("[onboarding:saveOrganizerProfile] profile save failed", upsertError);
      return { success: false, error: "We couldn't save your organizer profile." };
    }

    revalidatePath("/onboarding");
    return { success: true, data: { organizerId: user.id } };
  } catch (error) {
    console.error("[onboarding:saveOrganizerProfile] unexpected failure", error);
    return { success: false, error: "We couldn't save your organizer profile." };
  }
}

export async function completeProfileStep(): Promise<ActionResult<null>> {
  try {
    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    if (requireOrganizer(context)) {
      return { success: false, error: "Save your organizer profile before continuing." };
    }

    if (!(await advanceOnboardingStep(context, 2))) {
      return { success: false, error: "Your profile was saved, but onboarding could not advance. Try again." };
    }

    revalidatePath("/onboarding");
    return { success: true, data: null };
  } catch (error) {
    console.error("[onboarding:completeProfileStep] unexpected failure", error);
    return { success: false, error: "We couldn't complete this step. Try again." };
  }
}

export async function getPaystackBanks(): Promise<ActionResult<Bank[]>> {
  try {
    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const organizerError = requireOrganizer(result.data);
    if (organizerError) {
      return { success: false, error: organizerError };
    }

    const banks = await paymentProvider.listBanks();
    if (!banks.success) {
      return banks;
    }

    return { success: true, data: banks.data };
  } catch (error) {
    console.error("[onboarding:getPaystackBanks] unexpected failure", error);
    return { success: false, error: "Could not load the bank list. Try again." };
  }
}

export async function resolveBankAccount(
  input: unknown,
): Promise<ActionResult<{ accountName: string }>> {
  try {
    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const organizerError = requireOrganizer(result.data);
    if (organizerError) {
      return { success: false, error: organizerError };
    }

    if (!isRecord(input)) {
      return { success: false, error: "Choose a bank and enter a valid account number." };
    }

    const bankCode = typeof input.bankCode === "string" ? input.bankCode.trim() : "";
    const accountNumber =
      typeof input.accountNumber === "string" ? input.accountNumber.trim() : "";

    if (!/^[0-9]{10}$/.test(accountNumber) || !/^[a-zA-Z0-9_-]{1,20}$/.test(bankCode)) {
      return { success: false, error: "Choose a bank and enter a valid 10-digit account number." };
    }

    const accountResult = await paymentProvider.resolveAccount({ accountNumber, bankCode });
    if (!accountResult.success) {
      return accountResult;
    }

    return { success: true, data: { accountName: accountResult.data.accountName } };
  } catch (error) {
    console.error("[onboarding:resolveBankAccount] unexpected failure", error);
    return { success: false, error: "We couldn't verify that bank account." };
  }
}

export async function savePayoutStep(
  input: unknown,
): Promise<ActionResult<{ accountName: string; alreadyConfigured: boolean }>> {
  try {
    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    const organizerError = requireOrganizer(context);
    if (organizerError) {
      return { success: false, error: organizerError };
    }

    if (context.profile?.paystack_subaccount_code) {
      if (!(await advanceOnboardingStep(context, 3))) {
        return { success: false, error: "Payout is already configured, but onboarding could not advance." };
      }
      return {
        success: true,
        data: { accountName: "", alreadyConfigured: true },
      };
    }

    if (!isRecord(input)) {
      return { success: false, error: "Choose a bank and enter a valid account number." };
    }

    const bankCode = typeof input.bankCode === "string" ? input.bankCode.trim() : "";
    const accountNumber =
      typeof input.accountNumber === "string" ? input.accountNumber.trim() : "";

    if (!/^[0-9]{10}$/.test(accountNumber) || !/^[a-zA-Z0-9_-]{1,20}$/.test(bankCode)) {
      return { success: false, error: "Choose a bank and enter a valid 10-digit account number." };
    }

    const bankResult = await paymentProvider.listBanks();
    if (!bankResult.success) {
      return bankResult;
    }
    const selectedBank = bankResult.data.find((bank) => bank.code === bankCode);
    if (!selectedBank) {
      return { success: false, error: "Choose a bank from the list." };
    }

    const businessName = context.profile?.organizer_name?.trim();
    if (!businessName) {
      return { success: false, error: "Save your organizer name before setting up payouts." };
    }

    const subaccountResult = await paymentProvider.createSplitRecipient({
      businessName,
      bankCode,
      accountNumber,
    });
    if (!subaccountResult.success) {
      return subaccountResult;
    }

    const verifiedAccountName = subaccountResult.data.accountName || "";

    const nextStep = Math.max(context.profile?.onboarding_step ?? 1, 3);
    const { error: saveError } = await context.supabase
      .from("profiles")
      .update({
        paystack_subaccount_code: subaccountResult.data.subaccountCode,
        onboarding_step: nextStep,
      })
      .eq("id", context.userId);

    if (saveError) {
      console.error("[onboarding:savePayoutStep] subaccount save failed", saveError);
      return {
        success: false,
        error: "Paystack created the payout account, but it could not be saved. Contact support before retrying.",
      };
    }

    revalidatePath("/onboarding");
    return {
      success: true,
      data: { accountName: verifiedAccountName, alreadyConfigured: false },
    };
  } catch (error) {
    console.error("[onboarding:savePayoutStep] unexpected failure", error);
    return { success: false, error: "Payout setup could not be completed. Try again." };
  }
}

function parseEventInput(value: unknown): EventInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description =
    typeof value.description === "string" ? value.description.trim() : "";
  const category = value.category;
  const matchedCategory = EVENT_CATEGORIES.find((item) => item === category);
  const format = value.format;
  const location = isRecord(value.location) ? value.location : null;
  const city = typeof location?.city === "string" ? location.city.trim() : "";
  const venue = typeof location?.venueAddress === "string"
    ? location.venueAddress.trim()
    : typeof value.venue === "string"
      ? value.venue.trim()
      : "";
  const venueLatitude =
    typeof location?.latitude === "number" ? location.latitude : null;
  const venueLongitude =
    typeof location?.longitude === "number" ? location.longitude : null;
  const countryCode = location?.countryCode;
  const onlineJoinUrl =
    format === "online" ? parseHttpsJoinUrl(value.onlineJoinUrl) : null;
  const startsAt = typeof value.startsAt === "string" ? value.startsAt : "";
  const endsAt = typeof value.endsAt === "string" ? value.endsAt : "";
  const eventId = value.eventId === null || value.eventId === undefined
    ? null
    : isUuid(value.eventId)
      ? value.eventId
      : undefined;
  const createNew = value.createNew === true;

  if (
    title.length < 3 ||
    title.length > 120 ||
    description.length > 5000 ||
    !matchedCategory ||
    (format !== "in_person" && format !== "online") ||
    venue.length < 2 ||
    venue.length > 250 ||
    (format === "in_person" &&
      (typeof countryCode !== "string" ||
        countryCode.toLocaleLowerCase() !== "ng" ||
        city.length < 2 ||
        city.length > 120 ||
        venueLatitude === null ||
        !Number.isFinite(venueLatitude) ||
        venueLatitude < -90 ||
        venueLatitude > 90 ||
        venueLongitude === null ||
        !Number.isFinite(venueLongitude) ||
        venueLongitude < -180 ||
        venueLongitude > 180)) ||
    onlineJoinUrl === undefined ||
    eventId === undefined ||
    (value.createNew !== undefined && typeof value.createNew !== "boolean") ||
    (createNew && eventId !== null) ||
    !Number.isFinite(Date.parse(startsAt)) ||
    !Number.isFinite(Date.parse(endsAt)) ||
    Date.parse(startsAt) >= Date.parse(endsAt) ||
    Date.parse(endsAt) <= Date.now()
  ) {
    return null;
  }

  return {
    eventId,
    createNew,
    title,
    description,
    category: matchedCategory,
    city: format === "in_person" ? city : null,
    format,
    venue,
    venueLatitude: format === "in_person" ? venueLatitude : null,
    venueLongitude: format === "in_person" ? venueLongitude : null,
    onlineJoinUrl,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
  };
}

export async function saveEventStep(
  input: unknown,
): Promise<SaveEventStepResult> {
  try {
    const parsed = parseEventInput(input);
    if (!parsed) {
      return {
        success: false,
        error: "Check the event title, category, location, join URL, and start/end times.",
      };
    }

    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    const organizerError = requireOrganizer(context);
    if (organizerError) {
      return { success: false, error: organizerError };
    }
    if (!context.profile?.paystack_subaccount_code) {
      return { success: false, error: "Finish payout setup before saving your event." };
    }

    const eventValues = {
      title: parsed.title,
      description: parsed.description || null,
      category: parsed.category,
      city: parsed.city,
      format: parsed.format,
      venue_address: parsed.venue,
      venue_latitude: parsed.venueLatitude,
      venue_longitude: parsed.venueLongitude,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      status: "draft",
    } satisfies Pick<
      Database["public"]["Tables"]["events"]["Insert"],
      | "title"
      | "description"
      | "category"
      | "city"
      | "format"
      | "venue_address"
      | "venue_latitude"
      | "venue_longitude"
      | "starts_at"
      | "ends_at"
      | "status"
    >;

    let eventId = parsed.eventId;
    if (!eventId && !parsed.createNew) {
      const { data: draftEvent, error: draftReadError } = await context.supabase
        .from("events")
        .select("id")
        .eq("organizer_id", context.userId)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draftReadError) {
        console.error("[onboarding:saveEventStep] draft lookup failed", draftReadError);
        return { success: false, error: "We couldn't load your event draft." };
      }

      eventId = draftEvent?.id ?? null;
    }

    if (eventId) {
      const { data: existingEvent, error: eventReadError } = await context.supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .eq("organizer_id", context.userId)
        .eq("status", "draft")
        .maybeSingle();

      if (eventReadError || !existingEvent) {
        if (eventReadError) {
          console.error("[onboarding:saveEventStep] event read failed", eventReadError);
        }
        return { success: false, error: "We couldn't find your draft event. Refresh and try again." };
      }

      const { error: updateError } = await context.supabase
        .from("events")
        .update(eventValues)
        .eq("id", eventId)
        .eq("organizer_id", context.userId)
        .eq("status", "draft");

      if (updateError) {
        console.error("[onboarding:saveEventStep] event update failed", updateError);
        return { success: false, error: "We couldn't save your event details." };
      }
    } else {
      const { data: newEvent, error: insertError } = await context.supabase
        .from("events")
        .insert({
          organizer_id: context.userId,
          ...eventValues,
        })
        .select("id")
        .single();

      if (insertError || !newEvent) {
        if (insertError) {
          console.error("[onboarding:saveEventStep] event insert failed", insertError);
        }
        return { success: false, error: "We couldn't create your event draft." };
      }
      eventId = newEvent.id;
    }

    if (!eventId) {
      return { success: false, error: "We couldn't save your event draft." };
    }

    const { data: joinUrlSaved, error: joinUrlError } = await context.supabase.rpc(
      "save_draft_online_event_join_url",
      {
        p_event_id: eventId,
        p_join_url: parsed.onlineJoinUrl,
      },
    );

    if (joinUrlError) {
      console.error("[onboarding:saveEventStep] private join URL save failed", joinUrlError);
      return {
        success: false,
        error: "The draft was saved, but we couldn't save its private join URL.",
        eventId,
      };
    }
    if (!joinUrlSaved) {
      return {
        success: false,
        error: "We couldn't save the private join URL. Refresh and try again.",
        eventId,
      };
    }

    revalidatePath("/onboarding");
    return { success: true, data: { eventId } };
  } catch (error) {
    console.error("[onboarding:saveEventStep] unexpected failure", error);
    return { success: false, error: "We couldn't save your event details." };
  }
}

export async function completeEventStep(
  eventId: unknown,
): Promise<ActionResult<null>> {
  try {
    if (!isUuid(eventId)) {
      return { success: false, error: "Save your event details before continuing." };
    }

    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    const organizerError = requireOrganizer(context);
    if (organizerError) {
      return { success: false, error: organizerError };
    }
    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organizer_id", context.userId)
      .eq("status", "draft")
      .maybeSingle();

    if (eventError || !event) {
      if (eventError) {
        console.error("[onboarding:completeEventStep] event read failed", eventError);
      }
      return { success: false, error: "We couldn't confirm your event draft." };
    }

    if (!(await advanceOnboardingStep(context, 4))) {
      return { success: false, error: "Your event was saved, but onboarding could not advance. Try again." };
    }

    revalidatePath("/onboarding");
    return { success: true, data: null };
  } catch (error) {
    console.error("[onboarding:completeEventStep] unexpected failure", error);
    return { success: false, error: "We couldn't complete this step. Try again." };
  }
}

function parseNairaToKobo(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(value.trim())
  ) {
    return null;
  }

  const [naira, kobo = ""] = value.trim().split(".");
  const amount = Number(`${naira}${kobo.padEnd(2, "0")}`);
  return Number.isSafeInteger(amount) && amount <= 2147483647 ? amount : null;
}

function parseTicketTiers(value: unknown): TicketTierInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    return null;
  }

  const tiers: TicketTierInput[] = [];
  const ids = new Set<string>();
  const colors: TierColor[] = ["tier-a", "tier-b", "tier-c", "ink", "yellow", "red"];
  const styles: TicketCardStyle[] = ["solid", "torn"];
  const finishes: TicketCardFinish[] = ["normal", "metallic"];
  const textColors: TicketCardTextColor[] = ["black", "white"];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const id = item.id === null || item.id === undefined || item.id === ""
      ? null
      : isUuid(item.id)
        ? item.id
        : undefined;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const priceKobo = parseNairaToKobo(item.price);
    const quantity =
      typeof item.quantity === "string" && /^[1-9][0-9]{0,9}$/.test(item.quantity)
        ? Number(item.quantity)
        : NaN;
    const matchedColor =
      isTicketHexColor(item.cardColor)
        ? item.cardColor
        : colors.find((color) => color === item.cardColor);
    const cardStyle =
      item.cardStyle === undefined
        ? "solid"
        : styles.find((style) => style === item.cardStyle);
    const cardFinish =
      item.cardFinish === undefined
        ? "normal"
        : finishes.find((finish) => finish === item.cardFinish);
    const cardTextColor =
      item.cardTextColor === undefined
        ? "white"
        : textColors.find((color) => color === item.cardTextColor);

    if (
      id === undefined ||
      (id !== null && ids.has(id)) ||
      name.length < 1 ||
      name.length > 80 ||
      priceKobo === null ||
      !Number.isSafeInteger(quantity) ||
      quantity > 2147483647 ||
      !matchedColor ||
      !cardStyle ||
      !cardFinish ||
      !cardTextColor
    ) {
      return null;
    }

    if (id) {
      ids.add(id);
    }
    tiers.push({
      id,
      name,
      priceKobo,
      quantity,
      cardColor: matchedColor,
      cardStyle,
      cardFinish,
      cardTextColor,
    });
  }

  return tiers;
}

export async function saveTicketTiers(
  eventId: unknown,
  input: unknown,
): Promise<ActionResult<{ ticketTypeIds: string[] }>> {
  try {
    if (!isUuid(eventId)) {
      return { success: false, error: "Save your event before adding ticket tiers." };
    }
    const tiers = parseTicketTiers(input);
    if (!tiers) {
      return {
        success: false,
        error: "Add 1–20 tiers with a name, valid price, positive quantity, and card colour.",
      };
    }

    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    const organizerError = requireOrganizer(context);
    if (organizerError) {
      return { success: false, error: organizerError };
    }
    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organizer_id", context.userId)
      .eq("status", "draft")
      .maybeSingle();

    if (eventError || !event) {
      if (eventError) {
        console.error("[onboarding:saveTicketTiers] event read failed", eventError);
      }
      return { success: false, error: "We couldn't find your draft event." };
    }

    const payload = tiers.map((tier) => ({
      ...(tier.id ? { id: tier.id } : {}),
      name: tier.name,
      price_kobo: tier.priceKobo,
      quantity_available: tier.quantity,
      card_color: tier.cardColor,
      card_style: tier.cardStyle,
      card_finish: tier.cardFinish,
      card_text_color: tier.cardTextColor,
    }));
    const { data, error } = await context.supabase.rpc(
      "save_onboarding_ticket_tiers",
      { p_event_id: eventId, p_tiers: payload },
    );

    if (error || !data || data.length !== tiers.length) {
      if (error) {
        console.error("[onboarding:saveTicketTiers] tier save failed", error);
      }
      return { success: false, error: "We couldn't save your ticket tiers." };
    }

    const ticketTypeIds = [...data]
      .sort((first, second) => first.position - second.position)
      .map((tier) => tier.tier_id);

    revalidatePath("/onboarding");
    return { success: true, data: { ticketTypeIds } };
  } catch (error) {
    console.error("[onboarding:saveTicketTiers] unexpected failure", error);
    return { success: false, error: "We couldn't save your ticket tiers." };
  }
}

export async function completeTicketStep(
  eventId: unknown,
): Promise<ActionResult<null>> {
  try {
    if (!isUuid(eventId)) {
      return { success: false, error: "Save at least one ticket tier before continuing." };
    }

    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    const organizerError = requireOrganizer(context);
    if (organizerError) {
      return { success: false, error: organizerError };
    }
    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organizer_id", context.userId)
      .eq("status", "draft")
      .maybeSingle();

    if (eventError || !event) {
      if (eventError) {
        console.error("[onboarding:completeTicketStep] event read failed", eventError);
      }
      return { success: false, error: "We couldn't find your draft event." };
    }

    const { count, error: tierError } = await context.supabase
      .from("ticket_types")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (tierError || !count) {
      if (tierError) {
        console.error("[onboarding:completeTicketStep] tier read failed", tierError);
      }
      return { success: false, error: "Save at least one ticket tier before continuing." };
    }

    if (!(await advanceOnboardingStep(context, 5))) {
      return { success: false, error: "Your tiers were saved, but onboarding could not advance. Try again." };
    }

    revalidatePath("/onboarding");
    return { success: true, data: null };
  } catch (error) {
    console.error("[onboarding:completeTicketStep] unexpected failure", error);
    return { success: false, error: "We couldn't complete this step. Try again." };
  }
}

export async function publishOnboardingEvent(
  eventId: unknown,
): Promise<ActionResult<null>> {
  try {
    if (!isUuid(eventId)) {
      return { success: false, error: "We couldn't identify your event draft." };
    }

    const result = await getActionContext();
    if (!result.success) {
      return result;
    }

    const context = result.data;
    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id, status")
      .eq("id", eventId)
      .eq("organizer_id", context.userId)
      .maybeSingle();

    if (eventError || !event) {
      if (eventError) {
        console.error("[onboarding:publishOnboardingEvent] event read failed", eventError);
      }
      return { success: false, error: "We couldn't find your event." };
    }

    if (event.status === "published") {
      return { success: true, data: null };
    }

    const { error } = await context.supabase.rpc("publish_onboarding_event", {
      p_event_id: eventId,
    });

    if (error) {
      console.error("[onboarding:publishOnboardingEvent] publish failed", error);
      return {
        success: false,
        error: "Your event could not be published. Check the payout, event details, online join URL, and ticket tiers, then try again.",
      };
    }

    revalidatePath("/");
    revalidatePath("/onboarding");
    return { success: true, data: null };
  } catch (error) {
    console.error("[onboarding:publishOnboardingEvent] unexpected failure", error);
    return { success: false, error: "Your event could not be published. Try again." };
  }
}
